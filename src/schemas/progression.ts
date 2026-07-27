import * as z from "zod";

// 種目別プログレッション（11A）。推定 1RM の推移と次回提案。

export const OneRmPointSchema = z.object({
  date: z.string(),
  value: z.number(),
  /** その時点で自己ベストを更新したか。 */
  pb: z.boolean(),
});
export type OneRmPoint = z.infer<typeof OneRmPointSchema>;

export const TopSetLogSchema = z.object({
  date: z.string(),
  kg: z.number(),
  reps: z.number().int(),
  oneRm: z.number(),
  rpe: z.number(),
  /** 前回比（推定 1RM の差分 kg）。 */
  deltaKg: z.number(),
});
export type TopSetLog = z.infer<typeof TopSetLogSchema>;

export const RepMaxSchema = z.object({
  reps: z.number().int(),
  kg: z.number(),
  date: z.string(),
});
export type RepMax = z.infer<typeof RepMaxSchema>;

export const MilestoneSchema = z.object({
  icon: z.string(),
  title: z.string(),
  detail: z.string(),
  progressPct: z.number(),
});
export type Milestone = z.infer<typeof MilestoneSchema>;

export const ProgressionSchema = z.object({
  exerciseId: z.string(),
  exerciseName: z.string(),
  part: z.string(),
  estimatedOneRm: z.number(),
  oneRmGainKg: z.number(),
  bestSet: z.object({
    kg: z.number(),
    reps: z.number().int(),
    date: z.string(),
  }),
  totalVolumeTons: z.number(),
  sessionCount: z.number().int(),
  trend: z.enum(["up", "flat", "down"]),
  trendNote: z.string(),
  series: z.array(OneRmPointSchema),
  topSets: z.array(TopSetLogSchema),
  repMaxes: z.array(RepMaxSchema),
  milestones: z.array(MilestoneSchema),
  suggestion: z.object({
    kg: z.number(),
    reps: z.number().int(),
    sets: z.number().int(),
    note: z.string(),
  }),
});
export type Progression = z.infer<typeof ProgressionSchema>;

export const ExerciseIdInput = z.object({ exerciseId: z.string() });

export const ProgressionRange = z.enum(["3m", "6m", "1y", "all"]);
export const ProgressionQuery = z.object({
  range: ProgressionRange.default("6m").catch("6m"),
});
