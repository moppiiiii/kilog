import * as z from "zod";

import { MacrosSchema } from "./meals";

// 期間レポート（7A）。集計済みの値を受け取る前提のスキーマ。

export const MuscleVolumeSchema = z.object({
  name: z.string(),
  tons: z.number(),
  deltaPct: z.number(),
});
export type MuscleVolume = z.infer<typeof MuscleVolumeSchema>;

export const PersonalBestSchema = z.object({
  name: z.string(),
  value: z.string(),
  gainKg: z.number(),
  /** プログレッション画面（11A）を持つ種目だけ非 null。 */
  exerciseId: z.string().nullable(),
});
export type PersonalBest = z.infer<typeof PersonalBestSchema>;

export const ReportSchema = z.object({
  /** 表示用の期間ラベル（例: "2026年 7月" / "7/21–7/27" / "2026年"）。 */
  periodLabel: z.string(),
  trainingDays: z.number().int(),
  /** 期間の日数（週=7・月=その月の日数・年=365/366）。 */
  daysInPeriod: z.number().int(),
  trainingDaysDelta: z.number().int(),
  volumeTons: z.number(),
  volumeDeltaPct: z.number(),
  avgKcal: z.number().int(),
  targetKcal: z.number().int(),
  weightDeltaKg: z.number(),
  avgMacros: MacrosSchema,
  /** ヒートマップの強度（0–3）。週/月は日ごと、年は月ごとのバケット。 */
  heatmap: z.array(z.number().int().min(0).max(3)),
  muscleVolume: z.array(MuscleVolumeSchema),
  personalBests: z.array(PersonalBestSchema),
  weightSeries: z.array(z.number()),
});
export type Report = z.infer<typeof ReportSchema>;

export const ReportRange = z.enum(["week", "month"]);
export type ReportRangeValue = z.infer<typeof ReportRange>;
export const ReportQuery = z.object({
  range: ReportRange.default("month").catch("month"),
  /** 現在から何期間さかのぼるか（0=今期）。未来は見ないので 0 以上。 */
  offset: z.number().int().min(0).default(0).catch(0),
});
export type ReportQueryInput = z.infer<typeof ReportQuery>;
