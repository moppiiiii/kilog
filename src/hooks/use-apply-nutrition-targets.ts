import { useMutation, useQueryClient } from "@tanstack/react-query";

import { PROFILE_DERIVED_KEYS } from "@/hooks/use-save-profile";
import type { ApplyNutritionTargetsValue } from "@/schemas/profile";
import { applyNutritionTargets } from "@/server/profile";

// 計算した目標カロリー / PFC をプロフィールへ反映する。
// 目標値は各集計がサーバ側で参照するため、無効化するクエリは手入力の保存と同じ。

export function useApplyNutritionTargets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ApplyNutritionTargetsValue) =>
      applyNutritionTargets({ data }),
    onSettled: () => {
      for (const queryKey of PROFILE_DERIVED_KEYS) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}
