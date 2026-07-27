import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/kirog/console";
import { LogFeedView } from "@/components/workouts/log-feed";
import { LogFeedQuery } from "@/schemas/workouts";
import { logFeedQueryOptions } from "@/server/workouts";

export const Route = createFileRoute("/_authed/history/")({
  validateSearch: LogFeedQuery,
  // 絞り込み・ページは search 由来。loaderDeps で prefetch とキャッシュキーを一致させる。
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(logFeedQueryOptions(deps)),
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
