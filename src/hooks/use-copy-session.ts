import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { CopySessionValue } from "@/schemas/workouts";
import { copySession } from "@/server/workouts";

// 前回コピー（8A）。複製はサーバ側で 1 度に行うので、ここは再取得の面倒だけ見る。
export function useCopySession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CopySessionValue) => copySession({ data }),
    onSettled: () => {
      // active / feed / copy-sources は ["workouts"...] 配下、ダッシュボードも当日を集計する。
      void queryClient.invalidateQueries({ queryKey: ["workouts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
