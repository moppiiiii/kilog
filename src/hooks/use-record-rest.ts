import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateSet } from "@/server/workouts";

// 休憩タイマー（9A）の結果を、直前に完了したセットの rest_sec として記録する。
// セッション詳細（4A）の「平均休憩」はこの値から出る。
export function useRecordRest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ setId, restSec }: { setId: string; restSec: number }) =>
      updateSet({ data: { id: setId, rest_sec: restSec } }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["workouts"] }),
  });
}
