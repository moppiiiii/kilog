import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { ConsoleDashboard } from "@/components/dashboard/console-dashboard";
import { PageShell } from "@/components/kirog/console";
import { DashboardQuery } from "@/schemas/dashboard";
import { dashboardQueryOptions } from "@/server/dashboard";

export const Route = createFileRoute("/_authed/")({
  // 体重グラフの期間は search 由来。loaderDeps で prefetch とキャッシュキーを一致させる。
  validateSearch: DashboardQuery,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(dashboardQueryOptions(deps)),
  component: DashboardPage,
});

function DashboardPage() {
  const query = Route.useSearch();
  const { data } = useSuspenseQuery(dashboardQueryOptions(query));

  return (
    <PageShell>
      <ConsoleDashboard data={data} range={query.range} />
    </PageShell>
  );
}
