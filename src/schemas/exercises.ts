import * as z from "zod";

import { createSupabaseSchema, select } from "@/lib/supabase/query";

// 種目マスタ。id は slug（ルート /report/$exerciseId がそのまま使う）。
// owner_id が null なら共通マスタ、非 null なら本人専用。

export const GET_EXERCISES_QUERY =
  "id, name, part, is_bodyweight, is_cardio, owner_id";

export const ExerciseEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  part: z.string(),
  is_bodyweight: z.boolean(),
  is_cardio: z.boolean(),
  owner_id: z.string().uuid().nullable(),
  created_at: z.string(),
});
export type ExerciseRow = z.infer<typeof ExerciseEntitySchema>;

export const ExerciseReadSchema = ExerciseEntitySchema.pick({
  id: true,
  name: true,
  part: true,
  is_bodyweight: true,
  is_cardio: true,
  owner_id: true,
});
export type ExerciseRead = z.infer<typeof ExerciseReadSchema>;

export const exercisesSchema = createSupabaseSchema({
  "@select/exercises": select({
    output: z.array(ExerciseReadSchema),
    select: GET_EXERCISES_QUERY,
    row: ExerciseEntitySchema,
  }),
});
