import { queryOptions } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { estimateOneRm } from "@/lib/metrics";
import { $supabaseServer } from "@/lib/supabase/server";
import {
  ExerciseIdInput,
  type OneRmPoint,
  type Progression,
  type RepMax,
  type TopSetLog,
} from "@/schemas/progression";

// 種目別プログレッション（11A）。session_exercises → workout_sets の集計から
// 推定 1RM（Epley）の推移・トップセット履歴・レップマックス・次回提案を導く。

const round1 = (value: number) => Math.round(value * 10) / 10;

type Occurrence = {
  date: string;
  bestKg: number;
  bestReps: number;
  bestRpe: number;
  oneRm: number;
};

const REP_MAX_TARGETS = [1, 3, 5, 8, 12];

export const getProgression = createServerFn()
  .validator(ExerciseIdInput)
  .handler(async ({ data }): Promise<Progression> => {
    const $supabase = await $supabaseServer();

    const exercise = (await $supabase("@select/exercises", {}))
      .unwrapOr([])
      .find((row) => row.id === data.exerciseId);
    if (!exercise) throw notFound();

    const seRows = (
      await $supabase("@select/session_exercises", {
        filter: (q) => q.eq("exercise_id", data.exerciseId),
      })
    ).unwrapOr([]);

    // 1 occurrence = 1 セッションでのこの種目。日付昇順に整列。
    const occurrences: Occurrence[] = seRows
      .flatMap((row) => {
        if (!row.session || row.sets.length === 0) return [];
        const best = row.sets.reduce((top, set) =>
          estimateOneRm(set.weight_kg, set.reps) >
          estimateOneRm(top.weight_kg, top.reps)
            ? set
            : top,
        );
        return [
          {
            date: row.session.date,
            bestKg: best.weight_kg,
            bestReps: best.reps,
            bestRpe: best.rpe ?? 0,
            oneRm: round1(estimateOneRm(best.weight_kg, best.reps)),
          },
        ];
      })
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    const allSets = seRows.flatMap((row) =>
      row.sets.map((set) => ({
        kg: set.weight_kg,
        reps: set.reps,
        date: row.session?.date ?? "",
      })),
    );

    // 推定 1RM の推移（自己ベスト更新を pb フラグに）。
    let runningMax = 0;
    const series: OneRmPoint[] = occurrences.map((occ) => {
      const pb = occ.oneRm > runningMax;
      if (pb) runningMax = occ.oneRm;
      return { date: occ.date, value: occ.oneRm, pb };
    });

    // トップセット履歴（新しい順・直近 6 件）。前回比は推定 1RM の差分。
    const topSets: TopSetLog[] = occurrences
      .map((occ, index) => ({
        date: occ.date,
        kg: occ.bestKg,
        reps: occ.bestReps,
        oneRm: occ.oneRm,
        rpe: occ.bestRpe,
        deltaKg:
          index > 0 ? round1(occ.oneRm - occurrences[index - 1]!.oneRm) : 0,
      }))
      .reverse()
      .slice(0, 6);

    const repMaxes: RepMax[] = REP_MAX_TARGETS.flatMap((reps) => {
      const candidates = allSets.filter((set) => set.reps >= reps);
      if (candidates.length === 0) return [];
      const best = candidates.reduce((top, set) =>
        set.kg > top.kg ? set : top,
      );
      return [{ reps, kg: best.kg, date: best.date }];
    });

    const estimatedOneRmValue = occurrences.reduce(
      (max, occ) => Math.max(max, occ.oneRm),
      0,
    );
    const bestOcc = occurrences.reduce<Occurrence | null>(
      (best, occ) => (best === null || occ.oneRm > best.oneRm ? occ : best),
      null,
    );
    const first = occurrences[0];
    const oneRmGainKg =
      first && occurrences.length > 1
        ? round1(estimatedOneRmValue - first.oneRm)
        : 0;
    const totalVolumeTons =
      Math.round(
        (allSets.reduce((s, set) => s + set.kg * set.reps, 0) / 1000) * 10,
      ) / 10;

    const trend =
      oneRmGainKg > 0.5 ? "up" : oneRmGainKg < -0.5 ? "down" : "flat";
    const trendNote =
      trend === "up"
        ? "伸びています"
        : trend === "down"
          ? "停滞・要調整"
          : "維持";

    // 次回提案: 直近のトップセットに +2.5kg。
    const last = occurrences.at(-1);
    const suggestionKg = last ? round1(last.bestKg + 2.5) : 0;

    // マイルストーン: 次の 10kg 刻みの 1RM。
    const nextTarget = Math.ceil((estimatedOneRmValue + 0.01) / 10) * 10;
    const milestones =
      estimatedOneRmValue > 0
        ? [
            {
              icon: "🎯",
              title: `1RM ${nextTarget}kg`,
              detail: `あと ${round1(nextTarget - estimatedOneRmValue)}kg`,
              progressPct: round1((estimatedOneRmValue / nextTarget) * 100),
            },
          ]
        : [];

    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      part: exercise.part,
      estimatedOneRm: estimatedOneRmValue,
      oneRmGainKg,
      bestSet: bestOcc
        ? { kg: bestOcc.bestKg, reps: bestOcc.bestReps, date: bestOcc.date }
        : { kg: 0, reps: 0, date: "" },
      totalVolumeTons,
      sessionCount: occurrences.length,
      trend,
      trendNote,
      series,
      topSets,
      repMaxes,
      milestones,
      suggestion: {
        kg: suggestionKg,
        reps: 5,
        sets: 3,
        note: last
          ? `前回 ${last.bestKg}kg×${last.bestReps}。+2.5kg を狙えます。`
          : "記録を追加すると提案が出ます。",
      },
    };
  });

export const progressionQueryOptions = (exerciseId: string) =>
  queryOptions({
    queryKey: ["progression", exerciseId],
    queryFn: () => getProgression({ data: { exerciseId } }),
  });
