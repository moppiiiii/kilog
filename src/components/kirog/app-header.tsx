import { Link, useRouterState } from "@tanstack/react-router";
import { Dumbbell, Scale, Utensils } from "lucide-react";
import { DropdownMenu } from "radix-ui";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// アプリ共通ヘッダー。_authed レイアウトで 1 度だけ描画し、配下の全画面が共有する。
// パネル内のトップバーは「その画面の文脈と操作」だけを持ち、
// アプリの識別（ロゴ）・回遊（ナビ）・主要導線（記録する / アカウント）はここに集約する。

const NAV = [
  { to: "/", label: "ダッシュボード", prefixes: [] as string[] },
  {
    // 記録セクションの入口は一覧（3A）。入力画面へは「＋ 記録する」から入る。
    to: "/history",
    label: "記録",
    prefixes: ["/log", "/history", "/body", "/menus"],
  },
  { to: "/meals", label: "食事", prefixes: ["/meals"] },
  { to: "/report", label: "レポート", prefixes: ["/report"] },
] as const;

// 「＋ 記録する」から選べる記録の入口。ここを唯一の記録導線とする。
const RECORD_LINKS = [
  { to: "/log", label: "トレーニング", Icon: Dumbbell },
  { to: "/meals", label: "食事", Icon: Utensils },
  { to: "/body", label: "体重・体組成", Icon: Scale },
] as const;

export function AppHeader({ email }: { email: string }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return (
    <header className="border-k-line bg-k-ink/85 sticky top-0 z-50 border-b backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center gap-4 px-4 py-3 sm:px-8">
        <Link to="/" className="flex items-center gap-3">
          <span className="text-k-ink flex size-[30px] items-center justify-center rounded-lg bg-[linear-gradient(135deg,#5b8bff,#3f6ae0)] text-[15px] font-black">
            K
          </span>
          <span className="text-k-fg text-base font-bold">KIROG</span>
        </Link>

        <nav className="flex gap-1 sm:ml-3.5">
          {NAV.map((item) => {
            const active =
              item.prefixes.length === 0
                ? pathname === "/"
                : item.prefixes.some((prefix) => pathname.startsWith(prefix));

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-lg px-3.5 py-1.5 text-[13px] transition-colors",
                  active
                    ? "bg-k-chip text-k-fg font-medium"
                    : "text-k-fg-muted hover:text-k-fg",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button size="sm" className="rounded-[9px] font-bold">
                ＋ 記録する
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="border-k-line bg-k-panel z-[60] min-w-[200px] rounded-xl border p-1.5 shadow-lg"
              >
                {RECORD_LINKS.map(({ to, label, Icon }) => (
                  <DropdownMenu.Item key={to} asChild>
                    <Link
                      to={to}
                      className="text-k-fg-sub data-[highlighted]:bg-k-chip data-[highlighted]:text-k-fg flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors outline-none"
                    >
                      <Icon aria-hidden className="size-4" />
                      {label}
                    </Link>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          <Link
            to="/account"
            title={email}
            aria-label={`アカウント（${email}）`}
            className="border-k-line-strong bg-k-chip text-k-fg-sub hover:border-k-accent-edge hover:text-k-fg flex size-[30px] items-center justify-center rounded-full border text-xs font-bold uppercase transition-colors"
          >
            {(email || "?").slice(0, 1)}
          </Link>
        </div>
      </div>
    </header>
  );
}
