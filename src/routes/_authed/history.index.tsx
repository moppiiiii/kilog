import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/kirog/console";
import { LogFeedView } from "@/components/workouts/log-feed";
import { LogFeedQuery } from "@/schemas/workouts";
import { logFeedQueryOptions } from "@/server/workouts";

/**
 * pending フォールバックへ落とすまでの猶予。検索は打鍵のたびに loader が走るので、
 * 既定（1s）だと RoutePending に差し替わって入力欄が再マウントされ、フォーカスと
 * 入力途中の値が消える。取得が終わるまで前の一覧を出したままにする。
 */
const PENDING_MS = 60_000;

export const Route = createFileRoute("/_authed/history/")({
  validateSearch: LogFeedQuery,
  // 絞り込み・ページは search 由来。loaderDeps で prefetch とキャッシュキーを一致させる。
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(logFeedQueryOptions(deps)),
  pendingMs: PENDING_MS,
  component: HistoryPage,
});

function HistoryPage() {
  const filter = Route.useSearch();
  const { data: feed } = useSuspenseQuery(logFeedQueryOptions(filter));

  return (
    <PageShell>
      <LogFeedView feed={feed} filter={filter} />
    </PageShell>
  );
}
