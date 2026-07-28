import {
  type QueryKey,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import type { DailyMeals } from "@/schemas/meals";
import { dailyMealsQueryOptions, removeMealEntry } from "@/server/meals";

// 食事の 1 品を削除する。onMutate で全グループから該当 id を除き、失敗で巻き戻す。
// queryKey は購読中の日（当日 or /meals/$date の過去日）を指す。既定は当日。
export function useRemoveMealEntry(
  queryKey: QueryKey = dailyMealsQueryOptions().queryKey,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => removeMealEntry({ data: { id } }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<DailyMeals>(queryKey);
      queryClient.setQueryData<DailyMeals>(queryKey, (old) =>
        old
          ? {
              ...old,
              groups: old.groups.map((group) => ({
                ...group,
                items: group.items.filter((item) => item.id !== id),
              })),
            }
          : old,
      );
      return { previous };
    },
    onError: (_e, _v, context) =>
      queryClient.setQueryData(queryKey, context?.previous),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
      // 履歴フィード（["workouts"...]）とダッシュボードも当日/対象日の食事を集計する。
      void queryClient.invalidateQueries({ queryKey: ["workouts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
