import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { $supabaseServer } from "@/lib/supabase/server";
import type { ExerciseRead } from "@/schemas/exercises";

// 種目マスタの取得。記録画面の「種目を検索して追加」で候補に使う。

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
