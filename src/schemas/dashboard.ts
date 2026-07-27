import * as z from "zod";

import { MacrosSchema, MealSlot } from "./meals";

// ダッシュボード（1A / 1B）が 1 リクエストで受け取る当日サマリー。

export const DashboardExerciseSchema = z.object({
  name: z.string(),
  sets: z.number().int(),
  reps: z.number().int(),
  volumeKg: z.number(),
});
export type DashboardExercise = z.infer<typeof DashboardExerciseSchema>;

export const DashboardMealSchema = z.object({
  slot: MealSlot,
  name: z.string(),
  detail: z.string(),
  kcal: z.number().int(),
});
export type DashboardMeal = z.infer<typeof DashboardMealSchema>;

export const DashboardSchema = z.object({
  date: z.string(),
  weightKg: z.number(),
  weightDeltaKg: z.number(),
  kcal: z.number().int(),
  targetKcal: z.number().int(),
  macros: MacrosSchema,
  targetMacros: MacrosSchema,
  streakDays: z.number().int(),
  /** 直近 30 日の体重（古い順）。 */
  weightSeries: z.array(z.number()),
  sessionTitle: z.string(),
  exercises: z.array(DashboardExerciseSchema),
  meals: z.array(DashboardMealSchema),
});
export type Dashboard = z.infer<typeof DashboardSchema>;
