import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { BodyLog, SaveBodyValue } from "@/schemas/body";
import { bodyLogQueryOptions, saveBodyMeasurement } from "@/server/body";

// 当日の体重・体組成を保存（1 日 1 測定の upsert）。
// 派生値（BMI/BMR/筋肉量）はサーバー再取得で確定するため、onMutate では体重だけ即時反映する。
export function useSaveBodyMeasurement() {
  const queryClient = useQueryClient();
  const { queryKey } = bodyLogQueryOptions();

  return useMutation({
    mutationFn: (data: SaveBodyValue) => saveBodyMeasurement({ data }),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<BodyLog>(queryKey);
      queryClient.setQueryData<BodyLog>(queryKey, (old) =>
        old
          ? { ...old, latest: { ...old.latest, weightKg: data.weight_kg } }
          : old,
      );
      return { previous };
    },
    onError: (_e, _v, context) =>
      queryClient.setQueryData(queryKey, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}
