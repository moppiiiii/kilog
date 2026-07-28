import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/kirog/console";
import { CopySession } from "@/components/workouts/copy-session";
import { menusQueryOptions } from "@/server/menus";
import { copySourcesQueryOptions } from "@/server/workouts";

export const Route = createFileRoute("/_authed/log/copy")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(copySourcesQueryOptions()),
      context.queryClient.ensureQueryData(menusQueryOptions()),
    ]),
  component: CopyPage,
});

function CopyPage() {
  const { data: sources } = useSuspenseQuery(copySourcesQueryOptions());
  const { data: menus } = useSuspenseQuery(menusQueryOptions());

  return (
    <PageShell>
      <CopySession sources={sources} menus={menus} />
    </PageShell>
  );
}
