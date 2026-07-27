import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/kirog/console";
import { ProgressionView } from "@/components/reports/progression-view";
import { ProgressionQuery } from "@/schemas/progression";
import { progressionQueryOptions } from "@/server/progression";

export const Route = createFileRoute("/_authed/report/$exerciseId")({
  validateSearch: ProgressionQuery,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      progressionQueryOptions(params.exerciseId),
    ),
  component: ProgressionPage,
});

function ProgressionPage() {
  const { exerciseId } = Route.useParams();
  const { range } = Route.useSearch();
  const { data: progression } = useSuspenseQuery(
    progressionQueryOptions(exerciseId),
  );

  return (
    <PageShell>
      <ProgressionView progression={progression} range={range} />
    </PageShell>
  );
}
