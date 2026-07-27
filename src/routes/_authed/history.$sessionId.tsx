import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/kirog/console";
import { SessionDetail } from "@/components/workouts/session-detail";
import { workoutSessionQueryOptions } from "@/server/workouts";

export const Route = createFileRoute("/_authed/history/$sessionId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      workoutSessionQueryOptions(params.sessionId),
    ),
  component: SessionDetailPage,
});

function SessionDetailPage() {
  const { sessionId } = Route.useParams();
  const { data: session } = useSuspenseQuery(
    workoutSessionQueryOptions(sessionId),
  );

  return (
    <PageShell>
      <SessionDetail session={session} />
    </PageShell>
  );
}
