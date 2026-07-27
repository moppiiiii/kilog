import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";

import { PageShell } from "@/components/kirog/console";
import { MenuEditor } from "@/components/menus/menu-editor";
import { MenusQuery } from "@/schemas/menus";
import { menusQueryOptions } from "@/server/menus";

export const Route = createFileRoute("/_authed/menus")({
  validateSearch: MenusQuery,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(menusQueryOptions()),
  component: MenusPage,
});

function MenusPage() {
  const { kind, menu } = Route.useSearch();
  const { data: menus } = useSuspenseQuery(menusQueryOptions());

  const visible = menus.filter((item) => item.kind === kind);
  // menu 未指定なら先頭を編集対象にする（一覧が空なら 404）。
  const selected = menu ? visible.find((item) => item.id === menu) : visible[0];
  if (!selected) throw notFound();

  return (
    <PageShell>
      <MenuEditor menus={visible} kind={kind} selected={selected} />
    </PageShell>
  );
}
