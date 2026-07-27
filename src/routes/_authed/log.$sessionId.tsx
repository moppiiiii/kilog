import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/kirog/console";
import { WorkoutLogger } from "@/components/workouts/workout-logger";
import { workoutSessionQueryOptions } from "@/server/workouts";

// 過去セッションの編集。/log は当日セッション、こちらは id 指定で任意のセッションを開く。
export const Route = createFileRoute("/_authed/log/$sessionId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      workoutSessionQueryOptions(params.sessionId),
    ),
  component: EditSessionPage,
});

function EditSessionPage() {
  const { sessionId } = Route.useParams();
  const { data: session } = useSuspenseQuery(
    workoutSessionQueryOptions(sessionId),
  );

  return (
    <PageShell>
      <WorkoutLogger
        session={session}
        queryKey={workoutSessionQueryOptions(sessionId).queryKey}
      />
    </PageShell>
  );
}
