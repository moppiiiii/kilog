import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { $supabaseServer } from "@/lib/supabase/server";
import {
  CreateExerciseInput,
  type ExerciseRead,
  ExerciseIdInput,
} from "@/schemas/exercises";

// 種目マスタの取得・作成。記録画面の「種目を検索して追加」で候補に使う。

export const getExercises = createServerFn().handler(
  async (): Promise<ExerciseRead[]> => {
    const $supabase = await $supabaseServer();
    return (
      await $supabase("@select/exercises", { filter: (q) => q.order("name") })
    ).unwrapOr([]);
  },
);

export const exercisesQueryOptions = () =>
  queryOptions({ queryKey: ["exercises"], queryFn: () => getExercises() });

/** 本人用のカスタム種目を作成する。owner_id は現在ユーザーを充てる。 */
export const createExercise = createServerFn({ method: "POST" })
  .validator(CreateExerciseInput)
  .handler(async ({ data }) => {
    const $supabase = await $supabaseServer();
    const {
      data: { user },
    } = await $supabase.raw.auth.getUser();
    if (!user) throw new Error("未認証です");
    const result = await $supabase("@insert/exercises", {
      data: { ...data, owner_id: user.id },
    });
    if (result.isErr()) throw result.error;
  });

/** 本人用のカスタム種目を削除する（共通マスタは RLS で本人が消せない）。 */
export const deleteExercise = createServerFn({ method: "POST" })
  .validator(ExerciseIdInput)
  .handler(async ({ data }) => {
    const $supabase = await $supabaseServer();
    const result = await $supabase("@delete/exercises", {
      match: { id: data.id },
    });
    if (result.isErr()) throw result.error;
  });
