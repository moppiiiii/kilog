import { Cookie, type LucideIcon, Moon, Sun, Sunrise } from "lucide-react";

import { cn } from "@/lib/utils";
import type { MealSlotValue } from "@/schemas/meals";

// 食事スロットのバッジ（色＋アイコン）。meal-logger とダッシュボードで共有し、
// 朝/昼/間/夜 の見た目を 1 か所に集約して統一する。

/** スロットの配色（バッジ・積み上げバー等で共有）。 */
export const SLOT_COLOR: Record<MealSlotValue, string> = {
  breakfast: "bg-k-warn",
  lunch: "bg-k-accent",
  snack: "bg-k-success",
  dinner: "bg-k-violet",
};

const SLOT_ICON: Record<MealSlotValue, LucideIcon> = {
  breakfast: Sunrise,
  lunch: Sun,
  snack: Cookie,
  dinner: Moon,
};

export function SlotBadge({
  slot,
  className,
  iconClassName,
}: {
  slot: MealSlotValue;
  /** バッジ（外枠）のサイズ・角丸などの上書き。既定は 30px 角丸 lg。 */
  className?: string;
  iconClassName?: string;
}) {
  const Icon = SLOT_ICON[slot];
  return (
    <span
      className={cn(
        "text-k-ink flex size-[30px] shrink-0 items-center justify-center rounded-lg",
        SLOT_COLOR[slot],
        className,
      )}
    >
      <Icon aria-hidden className={cn("size-4", iconClassName)} />
    </span>
  );
}
