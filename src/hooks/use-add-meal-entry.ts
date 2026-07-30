import {
  type QueryKey,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { bumpFoodCandidate } from "@/lib/food-candidates";
import type {
  AddMealEntryValue,
  DailyMeals,
  FoodCandidate,
} from "@/schemas/meals";
import {
  addMealEntry,
  dailyMealsQueryOptions,
  foodCandidatesQueryOptions,
} from "@/server/meals";

// 食品を追加する。onMutate で該当スロットに即時反映し、失敗で巻き戻す。
// queryKey は購読中の日（当日 or /meals/$date の過去日）を指す。既定は当日。
export function useAddMealEntry(
  queryKey: QueryKey = dailyMealsQueryOptions().queryKey,
) {
  const queryClient = useQueryClient();

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
    // 入力補完の候補は書き込みが通ってから更新する（巻き戻しが要らない）。
    // 300 件の再取得を避けるため invalidate ではなくキャッシュを直接書き換える。
    onSuccess: (_d, data) =>
      queryClient.setQueryData<FoodCandidate[]>(
        foodCandidatesQueryOptions().queryKey,
        (old) =>
          old
            ? bumpFoodCandidate(old, {
                name: data.name,
                qty: data.qty ?? "",
                kcal: data.kcal ?? 0,
                protein_g: data.protein_g ?? 0,
                fat_g: data.fat_g ?? 0,
                carb_g: data.carb_g ?? 0,
              })
            : old,
      ),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
      // 履歴フィード（["workouts"...]）とダッシュボードも当日/対象日の食事を集計する。
      void queryClient.invalidateQueries({ queryKey: ["workouts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
