import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { BodyLogger } from "@/components/body/body-logger";
import { PageShell } from "@/components/kirog/console";
import { bodyLogQueryOptions } from "@/server/body";

export const Route = createFileRoute("/_authed/body")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(bodyLogQueryOptions()),
  component: BodyPage,
});

function BodyPage() {
  const { data } = useSuspenseQuery(bodyLogQueryOptions());

  return (
    <PageShell>
      <BodyLogger data={data} />
    </PageShell>
  );
}
