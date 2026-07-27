import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/kirog/console";
import { RestTimer } from "@/components/workouts/rest-timer";
import { restContextQueryOptions } from "@/server/workouts";

export const Route = createFileRoute("/_authed/log/timer")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(restContextQueryOptions()),
  component: TimerPage,
});

function TimerPage() {
  const { data: context } = useSuspenseQuery(restContextQueryOptions());

  return (
    <PageShell>
      <RestTimer context={context} />
    </PageShell>
  );
}
