import { cn } from "@/lib/utils";

/** Segmented の各セグメントのクラス。console.tsx から分離（Fast Refresh 境界のため）。 */
export function segmentClass(active: boolean): string {
  return cn(
    "rounded-[7px] px-3.5 py-1.5 text-[13px] transition-colors",
    active
      ? "bg-k-segment text-k-fg font-semibold"
      : "text-k-fg-muted hover:text-k-fg",
  );
}
