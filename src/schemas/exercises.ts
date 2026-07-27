import * as z from "zod";

import {
  createSupabaseSchema,
  deleteFrom,
  insert,
  select,
} from "@/lib/supabase/query";

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

/**
 * 種目の新規作成（本人用カスタム種目）の入力契約。owner_id はサーバ側で現在ユーザーを充てる
 * ため、クライアント契約 CreateExerciseInput には含めない。id は呼び出し側で uuid 生成して渡す。
 */
export const CreateExerciseInput = z.object({
  id: z.string(),
  name: z.string().min(1, "種目名を入力してください"),
  part: z.string().min(1, "部位を選択してください"),
  is_bodyweight: z.boolean().default(false),
  is_cardio: z.boolean().default(false),
});
export type CreateExerciseValue = z.infer<typeof CreateExerciseInput>;

/** @insert が受け取る行（owner_id 付き）。serverFn 側で CreateExerciseInput に owner_id を足す。 */
const InsertExerciseInput = CreateExerciseInput.extend({
  owner_id: z.string().uuid(),
});

/** カスタム種目の削除対象。共通マスタ（owner_id=null）は RLS で本人が消せない前提。 */
export const ExerciseIdInput = z.object({ id: z.string() });

export const exercisesSchema = createSupabaseSchema({
  "@select/exercises": select({
    output: z.array(ExerciseReadSchema),
    select: GET_EXERCISES_QUERY,
    row: ExerciseEntitySchema,
  }),
  "@insert/exercises": insert({ input: InsertExerciseInput }),
  "@delete/exercises": deleteFrom({ row: ExerciseEntitySchema }),
});
