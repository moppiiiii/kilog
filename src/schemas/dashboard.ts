import * as z from "zod";

import { WeightPointSchema } from "./body";
import { MacrosSchema, MealSlot } from "./meals";

// ダッシュボード（1A / 1B）が 1 リクエストで受け取る当日サマリー。

export const DashboardExerciseSchema = z.object({
  name: z.string(),
  isCardio: z.boolean(),
  sets: z.number().int(),
  reps: z.number().int(),
  volumeKg: z.number(),
  /** 有酸素のときの時間(分)・距離(km)。筋トレは null。 */
  durationMin: z.number().nullable(),
  distanceKm: z.number().nullable(),
});
export type DashboardExercise = z.infer<typeof DashboardExerciseSchema>;

export const DashboardMealSchema = z.object({
  slot: MealSlot,
  name: z.string(),
  detail: z.string(),
  kcal: z.number().int(),
});
export type DashboardMeal = z.infer<typeof DashboardMealSchema>;

/** 体重グラフの表示期間（30日 / 90日 / 1年のローリング窓）。 */
export const WeightRange = z.enum(["30d", "90d", "1y"]);
export type WeightRangeValue = z.infer<typeof WeightRange>;

/** ダッシュボードの search params。既定は 30 日、壊れた値でも画面を落とさない。 */
export const DashboardQuery = z.object({
  range: WeightRange.default("30d").catch("30d"),
});
export type DashboardQueryInput = z.infer<typeof DashboardQuery>;

export const DashboardSchema = z.object({
  date: z.string(),
  weightKg: z.number(),
  weightDeltaKg: z.number(),
  kcal: z.number().int(),
  targetKcal: z.number().int(),
  macros: MacrosSchema,
  targetMacros: MacrosSchema,
  streakDays: z.number().int(),
  /** 直近 30 件の体重測定（古い順）。折れ線グラフ用に日付付き。 */
  weightSeries: z.array(WeightPointSchema),
  sessionTitle: z.string(),
  exercises: z.array(DashboardExerciseSchema),
  meals: z.array(DashboardMealSchema),
});
export type Dashboard = z.infer<typeof DashboardSchema>;
