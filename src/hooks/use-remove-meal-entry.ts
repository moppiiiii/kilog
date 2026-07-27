import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { DailyMeals } from "@/schemas/meals";
import { dailyMealsQueryOptions, removeMealEntry } from "@/server/meals";

// 食事の 1 品を削除する。onMutate で全グループから該当 id を除き、失敗で巻き戻す。
export function useRemoveMealEntry() {
  const queryClient = useQueryClient();
  const { queryKey } = dailyMealsQueryOptions();

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
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}
