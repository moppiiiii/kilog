import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { AddMealEntryValue, DailyMeals } from "@/schemas/meals";
import { addMealEntry, dailyMealsQueryOptions } from "@/server/meals";

// 食品を追加する。onMutate で該当スロットに即時反映し、失敗で巻き戻す。
export function useAddMealEntry() {
  const queryClient = useQueryClient();
  const { queryKey } = dailyMealsQueryOptions();

  return useMutation({
    mutationFn: (data: AddMealEntryValue) => addMealEntry({ data }),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<DailyMeals>(queryKey);
      queryClient.setQueryData<DailyMeals>(queryKey, (old) =>
        old
          ? {
              ...old,
              groups: old.groups.map((group) =>
                group.slot === data.slot
                  ? {
                      ...group,
                      items: [
                        ...group.items,
                        {
                          id: `temp-${crypto.randomUUID()}`,
                          name: data.name,
                          qty: data.qty ?? "",
                          kcal: data.kcal ?? 0,
                          macros: {
                            p: data.protein_g ?? 0,
                            f: data.fat_g ?? 0,
                            c: data.carb_g ?? 0,
                          },
                        },
                      ],
                    }
                  : group,
              ),
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
