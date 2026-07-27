import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { ConsoleDashboard } from "@/components/dashboard/console-dashboard";
import { PageShell } from "@/components/kirog/console";
import { dashboardQueryOptions } from "@/server/dashboard";

export const Route = createFileRoute("/_authed/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(dashboardQueryOptions()),
  component: DashboardPage,
});

function DashboardPage() {
  const { data } = useSuspenseQuery(dashboardQueryOptions());

  return (
    <PageShell>
      <ConsoleDashboard data={data} />
    </PageShell>
  );
}
