import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/kirog/console";
import { WorkoutLogger } from "@/components/workouts/workout-logger";
import { activeSessionQueryOptions } from "@/server/workouts";

export const Route = createFileRoute("/_authed/log/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(activeSessionQueryOptions()),
  component: LogPage,
});

function LogPage() {
  const { data: session } = useSuspenseQuery(activeSessionQueryOptions());

  return (
    <PageShell>
      <WorkoutLogger session={session} />
    </PageShell>
  );
}
