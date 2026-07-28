import {
  ChartLine,
  ClipboardList,
  LayoutDashboard,
  Utensils,
} from "lucide-react";

// 回遊ナビの定義。md 以上はヘッダー（app-header）、SP は画面下部のタブ（bottom-nav）が
// 同じ 1 本の定義を描く。項目を足すときはここだけを触る。

export const NAV = [
  {
    to: "/",
    label: "ダッシュボード",
    /** タブ幅に収める短いラベル。 */
    short: "ホーム",
    Icon: LayoutDashboard,
    prefixes: [] as string[],
  },
  {
    // 記録セクションの入口は一覧（3A）。入力画面へは「＋ 記録する」から入る。
    to: "/history",
    label: "記録",
    short: "記録",
    Icon: ClipboardList,
    prefixes: ["/log", "/history", "/body", "/menus"],
  },
  {
    to: "/meals",
    label: "食事",
    short: "食事",
    Icon: Utensils,
    prefixes: ["/meals"],
  },
  {
    to: "/report",
    label: "レポート",
    short: "レポート",
    Icon: ChartLine,
    prefixes: ["/report"],
  },
] as const;

export type NavItem = (typeof NAV)[number];

/** 現在地判定。ダッシュボードだけは完全一致、他はセクションの前方一致。 */
export function isActiveNav(item: NavItem, pathname: string): boolean {
  return item.prefixes.length === 0
    ? pathname === "/"
    : item.prefixes.some((prefix) => pathname.startsWith(prefix));
}
