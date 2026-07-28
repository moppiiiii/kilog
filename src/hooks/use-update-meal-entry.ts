import {
  type QueryKey,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import type { DailyMeals, UpdateMealEntryValue } from "@/schemas/meals";
import { dailyMealsQueryOptions, updateMealEntry } from "@/server/meals";

// 記録済みの 1 品を修正する。onMutate で該当行を差し替え、失敗で巻き戻す。
// queryKey は購読中の日（当日 or /meals/$date の過去日）を指す。既定は当日。
export function useUpdateMealEntry(
  queryKey: QueryKey = dailyMealsQueryOptions().queryKey,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateMealEntryValue) => updateMealEntry({ data }),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<DailyMeals>(queryKey);
      queryClient.setQueryData<DailyMeals>(queryKey, (old) =>
        old
          ? {
              ...old,
              groups: old.groups.map((group) => ({
                ...group,
                items: group.items.map((item) =>
                  item.id === data.id
                    ? {
                        ...item,
                        name: data.name ?? item.name,
                        qty: data.qty ?? item.qty,
                        kcal: data.kcal ?? item.kcal,
                        macros: {
                          p: data.protein_g ?? item.macros.p,
                          f: data.fat_g ?? item.macros.f,
                          c: data.carb_g ?? item.macros.c,
                        },
                      }
                    : item,
                ),
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
