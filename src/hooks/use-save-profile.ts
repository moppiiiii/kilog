import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { UpdateProfileValue } from "@/schemas/profile";
import { updateProfile } from "@/server/profile";

// プロフィール（身長・目標値）を保存する。
// 目標値・身長はダッシュボード / 食事 / レポート / 体組成の各集計がサーバ側で参照するため、
// 保存後はそれらのクエリもまとめて無効化して再取得させる。
/** プロフィールの書き込みで無効化するクエリ。目標値を書く側で共有する。 */
export const PROFILE_DERIVED_KEYS = [
  ["profile"],
  ["dashboard"],
  ["meals"],
  ["reports"],
  ["body"],
] as const;

export function useSaveProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfileValue) => updateProfile({ data }),
    onSettled: () => {
      for (const queryKey of PROFILE_DERIVED_KEYS) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}
