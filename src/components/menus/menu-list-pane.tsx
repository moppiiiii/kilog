import { Link } from "@tanstack/react-router";

import { DashedAction, MonoLabel, Pane } from "@/components/kirog/console";
import { cn } from "@/lib/utils";
import type { MenuKindValue, WorkoutMenu } from "@/schemas/menus";

/** 左ペイン：登録済みメニューの一覧。選択は URL（search.menu）で持つ。 */
export function MenuListPane({
  menus,
  kind,
  selectedId,
  onCreate,
}: {
  menus: WorkoutMenu[];
  kind: MenuKindValue;
  selectedId: string | null;
  onCreate: () => void;
}) {
  return (
    <Pane className="p-[22px]">
      <MonoLabel className="mb-3">登録済み（{menus.length}）</MonoLabel>
      <div className="flex flex-col gap-2.5">
        {menus.map((menu) => {
          const active = menu.id === selectedId;
          return (
            <Link
              key={menu.id}
              to="/menus"
              search={{ kind, menu: menu.id }}
              className={cn(
                "rounded-xl border p-3.5 transition-colors",
                active
                  ? "border-k-accent-edge bg-k-card"
                  : "border-k-line bg-k-panel hover:border-k-accent-edge",
              )}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-[9px] text-[15px]",
                    active ? "bg-k-accent-bg" : "bg-k-chip",
                  )}
                >
                  {menu.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">
                    {menu.name}
                  </div>
                  <div className="text-k-fg-dim mt-px text-[11px]">
                    {menu.summary} · {menu.exercises.length}種目
                  </div>
                </div>
                {active ? (
                  <span className="bg-k-accent size-1.5 rounded-full" />
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
      <DashedAction className="mt-3" onClick={onCreate}>
        ＋ メニューを追加
      </DashedAction>
    </Pane>
  );
}
