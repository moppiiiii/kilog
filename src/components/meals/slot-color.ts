import type { MealSlotValue } from "@/schemas/meals";

/** スロットの配色（バッジ・積み上げバー等で共有）。slot-badge.tsx から分離（Fast Refresh 境界のため）。 */
export const SLOT_COLOR: Record<MealSlotValue, string> = {
  breakfast: "bg-k-warn",
  lunch: "bg-k-accent",
  snack: "bg-k-success",
  dinner: "bg-k-violet",
};
