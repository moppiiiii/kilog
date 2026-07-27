import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { $supabaseServer } from "@/lib/supabase/server";
import {
  AddBodyMeasurementInput,
  type BodyLog,
  type BodyMeasurement,
  type BodyMeasurementRead,
  CONDITION_LABELS,
} from "@/schemas/body";

import { loadProfile } from "./profile.server";

// body_measurements ＋ profiles（身長・目標体重）から体組成ログを組む。
// BMI / BMR / 筋肉量は測定行に無ければ身長・体脂肪率から近似する（旧固定データと同式）。

/** 除脂肪体重から骨量などを差し引いた分。筋肉量の近似に使う。 */
const NON_MUSCLE_LEAN_KG = 3.5;

const round1 = (value: number) => Math.round(value * 10) / 10;

const EMPTY_MEASUREMENT: BodyMeasurement = {
  date: "",
  weightKg: 0,
  bodyFatPct: 0,
  muscleKg: 0,
  bmi: 0,
  bmrKcal: 0,
};

function toMeasurement(
  row: BodyMeasurementRead,
  heightM: number,
): BodyMeasurement {
  const weightKg = row.weight_kg;
  const bodyFatPct = row.body_fat_pct ?? 0;
  const leanKg = weightKg * (1 - bodyFatPct / 100);
  return {
    date: row.date,
    weightKg,
    bodyFatPct,
    muscleKg: row.muscle_kg ?? round1(leanKg - NON_MUSCLE_LEAN_KG),
    bmi: heightM > 0 ? round1(weightKg / (heightM * heightM)) : 0,
    // Katch-McArdle（除脂肪体重ベース）。
    bmrKcal: Math.round(370 + 21.6 * leanKg),
  };
}

export const getBodyLog = createServerFn().handler(
  async (): Promise<BodyLog> => {
    const $supabase = await $supabaseServer();
    const profile = await loadProfile($supabase);

    // 新しい順に 30 件取り、古い順に並べ替えて系列にする。
    const rows = (
      await $supabase("@select/body_measurements", {
        filter: (q) => q.order("date", { ascending: false }).limit(30),
      })
    ).unwrapOr([]);
    const ordered = [...rows].reverse();
    const series = ordered.map((row) => toMeasurement(row, profile.heightM));

    const latest = series.at(-1) ?? EMPTY_MEASUREMENT;
    const previous = series.at(-2) ?? latest;
    const activeConditions = ordered.at(-1)?.conditions ?? [];

    return {
      latest,
      previous,
      targetWeightKg: profile.targetWeightKg,
      conditions: CONDITION_LABELS.map((label) => ({
        label,
        on: activeConditions.includes(label),
      })),
      series,
    };
  },
);

export const bodyLogQueryOptions = () =>
  queryOptions({ queryKey: ["body"], queryFn: () => getBodyLog() });

// ─── 記録の書き込み（mutation） ──────────────────────────────────────────────
// 1 日 1 測定（unique(user_id, date)）。エンジンの upsert は PK 衝突前提のため、
// ここでは日付で存在確認 → insert / update に振り分ける。

export const saveBodyMeasurement = createServerFn({ method: "POST" })
  .validator(AddBodyMeasurementInput)
  .handler(async ({ data }) => {
    const $supabase = await $supabaseServer();
    const existing = (
      await $supabase("@select/body_measurements", {
        filter: (q) => q.eq("date", data.date).limit(1),
      })
    ).unwrapOr([]);
    const result =
      existing.length > 0
        ? await $supabase("@update/body_measurements", {
            data,
            match: { date: data.date },
          })
        : await $supabase("@insert/body_measurements", { data });
    if (result.isErr()) throw result.error;
  });
