import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { kg, monthDay, monthLabel, todayIso } from "@/lib/format";
import { estimateOneRm } from "@/lib/metrics";
import { $supabaseServer } from "@/lib/supabase/server";
import type { MealEntryRead } from "@/schemas/meals";
import {
  type MuscleVolume,
  type PersonalBest,
  ReportQuery,
  type ReportQueryInput,
  type ReportRangeValue,
  type Report as ReportType,
} from "@/schemas/reports";

import { loadProfile } from "./profile";
import { loadSessions, sessionVolumeKg } from "./sessions.server";

// 期間レポート（7A）。range（週/月/年）で対象ウィンドウを決めて集計する。
// 前期比が必要な指標は同じ集計を 1 つ前のウィンドウでも回して差分を取る。

const round1 = (value: number) => Math.round(value * 10) / 10;
const toTons = (kgValue: number) => round1(kgValue / 1000);

// ── 期間ウィンドウの計算（すべて JST の todayIso() を起点にした ISO 日付） ──

/** ISO 日付（YYYY-MM-DD）に日数を足し引きする（UTC 基準の純計算）。 */
function addDaysIso(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** 2 つの ISO 日付の差（日数）。同日なら 0。 */
function dayDiff(fromIso: string, iso: string): number {
  return Math.round(
    (Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) /
      86_400_000,
  );
}

type Window = { start: string; end: string };

type PeriodPlan = {
  curr: Window;
  prev: Window;
  label: string;
  daysInPeriod: number;
  /** ヒートマップのバケット数と、日付→バケット index の対応。 */
  buckets: number;
  bucketOf: (date: string) => number;
};

/** 年月から、その月のウィンドウ・ラベル・日数を組み立てる（月レポートの 1 期分）。 */
function monthWindow(
  y: number,
  m1: number,
): {
  window: Window;
  label: string;
  days: number;
} {
  const base = new Date(y, m1 - 1, 1); // m1 は 1-based。桁あふれは Date が正規化。
  const yy = base.getFullYear();
  const mm = base.getMonth() + 1;
  const days = new Date(yy, mm, 0).getDate();
  const p2 = String(mm).padStart(2, "0");
  return {
    window: {
      start: `${yy}-${p2}-01`,
      end: `${yy}-${p2}-${String(days).padStart(2, "0")}`,
    },
    label: monthLabel(`${yy}-${p2}`),
    days,
  };
}

/**
 * range・offset・今日（JST）から、対象/前期のウィンドウと表示メタを組み立てる。
 * offset は「今からいくつ前の期間か」（0=今期）。◂ で +1、▸ で -1 する。
 */
function planPeriod(
  range: ReportRangeValue,
  offset: number,
  today: string,
): PeriodPlan {
  const [y, m] = today.split("-").map(Number);

  if (range === "week") {
    const end = addDaysIso(today, -7 * offset);
    const start = addDaysIso(end, -6);
    const prevEnd = addDaysIso(end, -7);
    return {
      curr: { start, end },
      prev: { start: addDaysIso(prevEnd, -6), end: prevEnd },
      label: `${monthDay(start)}–${monthDay(end)}`,
      daysInPeriod: 7,
      buckets: 7,
      bucketOf: (date) => dayDiff(start, date),
    };
  }

  // month（既定）: offset か月前の 1 日〜末日。
  const curr = monthWindow(y, m - offset);
  const prev = monthWindow(y, m - offset - 1);
  return {
    curr: curr.window,
    prev: prev.window,
    label: curr.label,
    daysInPeriod: curr.days,
    buckets: curr.days,
    bucketOf: (date) => Number(date.slice(8, 10)) - 1,
  };
}

const inWindow = (date: string, w: Window) => date >= w.start && date <= w.end;

type ExSet = {
  exId: string;
  name: string;
  part: string;
  kg: number;
  reps: number;
  date: string;
  oneRm: number;
};

export const getReport = createServerFn()
  .validator(ReportQuery)
  .handler(async ({ data }): Promise<ReportType> => {
    const { range, offset } = data;
    const $supabase = await $supabaseServer();
    const profile = await loadProfile($supabase);
    const sessions = await loadSessions();
    const entries = (
      await $supabase("@select/meal_entries", {
        filter: (q) => q.order("date"),
      })
    ).unwrapOr([]);
    const measurements = (
      await $supabase("@select/body_measurements", {
        filter: (q) => q.order("date"),
      })
    ).unwrapOr([]);

    const plan = planPeriod(range, offset, todayIso());
    const { curr, prev } = plan;

    // 部位別ボリューム・PB のための、全セッションの (種目, セット) 展開。
    const allExSets: ExSet[] = sessions.flatMap((session) =>
      session.exercises.flatMap((exercise) =>
        exercise.sets.map((set) => ({
          exId: exercise.exercise_id,
          name: exercise.exercise?.name ?? exercise.exercise_id,
          part: exercise.exercise?.part ?? "その他",
          kg: set.weight_kg,
          reps: set.reps,
          date: session.date,
          oneRm: estimateOneRm(set.weight_kg, set.reps),
        })),
      ),
    );

    // 期間のトレーニング日数・ボリューム（前期比つき）。
    const currSessions = sessions.filter((s) => inWindow(s.date, curr));
    const prevSessions = sessions.filter((s) => inWindow(s.date, prev));
    const trainingDays = new Set(currSessions.map((s) => s.date)).size;
    const prevTrainingDays = new Set(prevSessions.map((s) => s.date)).size;
    const volumeKg = currSessions.reduce(
      (sum, s) => sum + sessionVolumeKg(s),
      0,
    );
    const prevVolumeKg = prevSessions.reduce(
      (sum, s) => sum + sessionVolumeKg(s),
      0,
    );

    // ヒートマップ: バケット（週/月=日ごと・年=月ごと）の総ボリュームを 0–3 に量子化。
    const bucketVolume: number[] = Array.from(
      { length: plan.buckets },
      () => 0,
    );
    for (const s of currSessions) {
      const idx = plan.bucketOf(s.date);
      if (idx >= 0 && idx < plan.buckets) {
        bucketVolume[idx] += sessionVolumeKg(s);
      }
    }
    const maxBucket = Math.max(0, ...bucketVolume);
    const heatmap: number[] = bucketVolume.map((v: number) =>
      v <= 0 || maxBucket === 0
        ? 0
        : Math.min(3, Math.ceil((v / maxBucket) * 3)),
    );

    // 部位別ボリューム（前期比）。
    const partTons = (w: Window) => {
      const map = new Map<string, number>();
      for (const set of allExSets) {
        if (!inWindow(set.date, w)) continue;
        map.set(set.part, (map.get(set.part) ?? 0) + set.kg * set.reps);
      }
      return map;
    };
    const currParts = partTons(curr);
    const prevParts = partTons(prev);
    const muscleVolume: MuscleVolume[] = [...currParts.entries()]
      .map(([name, kgSum]): MuscleVolume => {
        const prevKg = prevParts.get(name) ?? 0;
        return {
          name,
          tons: toTons(kgSum),
          deltaPct:
            prevKg > 0 ? Math.round(((kgSum - prevKg) / prevKg) * 100) : 0,
        };
      })
      .sort((a, b) => b.tons - a.tons);

    // 自己ベスト: 期間内に更新した種目（期間ベスト 1RM − 期間開始前のベスト）。
    const byEx = new Map<string, ExSet[]>();
    for (const set of allExSets) {
      const list = byEx.get(set.exId) ?? [];
      list.push(set);
      byEx.set(set.exId, list);
    }
    const personalBests: PersonalBest[] = [...byEx.values()]
      .flatMap((sets): PersonalBest[] => {
        const currSets = sets.filter((s) => inWindow(s.date, curr));
        if (currSets.length === 0) return [];
        const bestCurr = currSets.reduce((top, s) =>
          s.oneRm > top.oneRm ? s : top,
        );
        const before = sets.filter((s) => s.date < curr.start);
        const bestBefore = before.reduce((max, s) => Math.max(max, s.oneRm), 0);
        const gainKg = round1(bestCurr.oneRm - bestBefore);
        if (gainKg <= 0) return [];
        return [
          {
            name: bestCurr.name,
            value: `${kg(bestCurr.kg)}kg×${bestCurr.reps}`,
            gainKg,
            exerciseId: bestCurr.exId,
          },
        ];
      })
      .sort((a, b) => b.gainKg - a.gainKg)
      .slice(0, 4);

    // 食事（期間の日別平均）。
    const currEntries = entries.filter((e) => inWindow(e.date, curr));
    const byDate = new Map<string, MealEntryRead[]>();
    for (const entry of currEntries) {
      const list = byDate.get(entry.date) ?? [];
      list.push(entry);
      byDate.set(entry.date, list);
    }
    const dayCount = byDate.size || 1;
    const sum = (pick: (e: MealEntryRead) => number) =>
      currEntries.reduce((total, e) => total + pick(e), 0);
    const avgKcal = Math.round(sum((e) => e.kcal) / dayCount);
    const avgMacros = {
      p: Math.round(sum((e) => e.protein_g) / dayCount),
      f: Math.round(sum((e) => e.fat_g) / dayCount),
      c: Math.round(sum((e) => e.carb_g) / dayCount),
    };

    // 体重（期間の推移）。
    const currWeights = measurements.filter((m) => inWindow(m.date, curr));
    const weightSeries = currWeights.map((m) => m.weight_kg);
    const weightDeltaKg =
      currWeights.length > 1
        ? round1(currWeights.at(-1)!.weight_kg - currWeights[0]!.weight_kg)
        : 0;

    return {
      periodLabel: plan.label,
      trainingDays,
      daysInPeriod: plan.daysInPeriod,
      trainingDaysDelta: trainingDays - prevTrainingDays,
      volumeTons: toTons(volumeKg),
      volumeDeltaPct:
        prevVolumeKg > 0
          ? round1(((volumeKg - prevVolumeKg) / prevVolumeKg) * 100)
          : 0,
      avgKcal,
      targetKcal: profile.targetKcal,
      weightDeltaKg,
      avgMacros,
      heatmap,
      muscleVolume,
      personalBests,
      weightSeries,
    };
  });

export const reportQueryOptions = (query: ReportQueryInput) =>
  queryOptions({
    queryKey: ["reports", query],
    queryFn: () => getReport({ data: query }),
  });
