import { Link, useRouterState } from "@tanstack/react-router";

import { isActiveNav, NAV } from "@/components/kirog/nav-items";
import { cn } from "@/lib/utils";

// SP の回遊ナビ。ヘッダーを 1 行に保つため、md 未満ではナビだけを画面下部へ出す。
// md 以上は非表示（ヘッダー内のナビが担当）。

export function BottomNav() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return (
    <nav
      aria-label="メインナビゲーション"
      // ホームバーのある端末で下端に潜り込まないよう safe-area 分を足す。
      className="border-k-line bg-k-ink/95 fixed inset-x-0 bottom-0 z-50 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="mx-auto grid max-w-[560px] grid-cols-4">
        {NAV.map((item) => {
          const active = isActiveNav(item, pathname);

          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 px-1 py-2 text-[10px] transition-colors",
                active ? "text-k-accent" : "text-k-fg-muted hover:text-k-fg",
              )}
            >
              <item.Icon aria-hidden className="size-5" />
              {item.short}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
