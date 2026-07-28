import { MutationCache, QueryClient } from "@tanstack/react-query";

import { pushToast } from "@/lib/toast";

// 書き込み（mutation）の失敗は MutationCache で 1 か所に集約し、通知として出す。
// 各 hooks の onError は巻き戻しだけに専念できる（表示はここが担当）。

function writeErrorMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);
  return `保存できませんでした: ${detail}`;
}

export function getContext() {
  const queryClient = new QueryClient({
    mutationCache: new MutationCache({
      onError: (error) => pushToast("error", writeErrorMessage(error)),
    }),
  });

  return {
    queryClient,
  };
}
export default function TanstackQueryProvider() {}
