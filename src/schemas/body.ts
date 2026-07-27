import * as z from "zod";

import {
  createSupabaseSchema,
  insert,
  select,
  update,
} from "@/lib/supabase/query";

// 体重・体組成。1 日 1 測定を前提にした時系列。

export const BodyMeasurementSchema = z.object({
  date: z.string(),
  weightKg: z.number(),
  bodyFatPct: z.number(),
  muscleKg: z.number(),
  bmi: z.number(),
  bmrKcal: z.number().int(),
});
export type BodyMeasurement = z.infer<typeof BodyMeasurementSchema>;

export const BodyLogSchema = z.object({
  /** 最新の測定（＝入力欄の初期値）。 */
  latest: BodyMeasurementSchema,
  previous: BodyMeasurementSchema,
  targetWeightKg: z.number(),
  conditions: z.array(z.object({ label: z.string(), on: z.boolean() })),
  /** 直近 30 日の推移（古い順）。 */
  series: z.array(BodyMeasurementSchema),
});
export type BodyLog = z.infer<typeof BodyLogSchema>;

// ─── Supabase アクセス層（entity / response・操作断片） ───────────────────────

/** コンディションのトグル候補。DB は on の label だけを text[] で持つ。 */
export const CONDITION_LABELS = ["起床直後", "空腹時", "睡眠 7h"] as const;

export const GET_BODY_MEASUREMENTS_QUERY =
  "id, date, weight_kg, body_fat_pct, muscle_kg, conditions, note";

export const BodyMeasurementEntitySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  date: z.string(),
  weight_kg: z.coerce.number(),
  body_fat_pct: z.coerce.number().nullable(),
  muscle_kg: z.coerce.number().nullable(),
  conditions: z.array(z.string()),
  note: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type BodyMeasurementRow = z.infer<typeof BodyMeasurementEntitySchema>;

export const BodyMeasurementReadSchema = BodyMeasurementEntitySchema.pick({
  id: true,
  date: true,
  weight_kg: true,
  body_fat_pct: true,
  muscle_kg: true,
  conditions: true,
  note: true,
});
export type BodyMeasurementRead = z.infer<typeof BodyMeasurementReadSchema>;

/** serverFn の入力契約。1 日 1 測定なので日付キーで upsert する想定。 */
export const AddBodyMeasurementInput = z.object({
  date: z.string(),
  weight_kg: z.number().positive(),
  body_fat_pct: z.number().nullable().default(null),
  muscle_kg: z.number().nullable().default(null),
  conditions: z.array(z.string()).default([]),
  note: z.string().default(""),
});
export type SaveBodyValue = z.infer<typeof AddBodyMeasurementInput>;

export const bodySchema = createSupabaseSchema({
  "@select/body_measurements": select({
    output: z.array(BodyMeasurementReadSchema),
    select: GET_BODY_MEASUREMENTS_QUERY,
    row: BodyMeasurementEntitySchema,
  }),
  "@insert/body_measurements": insert({ input: AddBodyMeasurementInput }),
  "@update/body_measurements": update({
    input: AddBodyMeasurementInput.partial(),
    row: BodyMeasurementEntitySchema,
  }),
});
