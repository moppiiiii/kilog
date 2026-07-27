import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/kirog/console";
import { ReportView } from "@/components/reports/report-view";
import { ReportQuery } from "@/schemas/reports";
import { reportQueryOptions } from "@/server/reports";

export const Route = createFileRoute("/_authed/report/")({
  validateSearch: ReportQuery,
  // range は search 由来。loaderDeps で prefetch とキャッシュキーを一致させる。
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(reportQueryOptions(deps)),
  component: ReportPage,
});

function ReportPage() {
  const { range, offset } = Route.useSearch();
  const { data: report } = useSuspenseQuery(
    reportQueryOptions({ range, offset }),
  );

  return (
    <PageShell>
      <ReportView report={report} range={range} offset={offset} />
    </PageShell>
  );
}
