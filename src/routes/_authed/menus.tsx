import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/kirog/console";
import { MenuEditor } from "@/components/menus/menu-editor";
import { MenusQuery } from "@/schemas/menus";
import { exercisesQueryOptions } from "@/server/exercises";
import { menusQueryOptions } from "@/server/menus";

export const Route = createFileRoute("/_authed/menus")({
  validateSearch: MenusQuery,
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(menusQueryOptions()),
      // 「種目を検索して追加」の候補。
      context.queryClient.ensureQueryData(exercisesQueryOptions()),
    ]),
  component: MenusPage,
});

function MenusPage() {
  const { kind, menu } = Route.useSearch();
  const { data: menus } = useSuspenseQuery(menusQueryOptions());
  const { data: exercises } = useSuspenseQuery(exercisesQueryOptions());

  const visible = menus.filter((item) => item.kind === kind);
  // menu 未指定なら先頭を編集対象にする。1 件も無ければ作成を促す（空状態）。
  const selected =
    (menu ? visible.find((item) => item.id === menu) : visible[0]) ?? null;

  return (
    <PageShell>
      <MenuEditor
        menus={visible}
        kind={kind}
        selected={selected}
        exercises={exercises}
      />
    </PageShell>
  );
}
