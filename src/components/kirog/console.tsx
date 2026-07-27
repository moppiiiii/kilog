import type * as React from "react";

import { cn } from "@/lib/utils";

// KIROG コンソールの面・線・見出しのプリミティブ。
// 画面（components/<feature>/）はここを組み合わせるだけにして、
// 面の色や境界線の値を各画面へ散らさない。

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-8 sm:py-10">
      {children}
    </div>
  );
}

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "border-k-line bg-k-panel text-k-fg overflow-hidden rounded-[18px] border",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TopBar({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "border-k-line flex flex-wrap items-center justify-between gap-4 border-b px-[26px] py-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** 縦罫で仕切られた本文。gap-px ＋ 背景色で 1px の罫線を作る。 */
export function SplitBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("bg-k-line grid gap-px", className)}>{children}</div>
  );
}

export function Pane({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("bg-k-panel p-6", className)}>{children}</div>;
}

/** パネル左上の画面名。1 画面に 1 つ（＝ h1）。 */
export function PanelTitle({
  sub,
  children,
}: {
  sub?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-3">
      <h1 className="text-[15px] font-bold">{children}</h1>
      {sub ? <span className="text-k-fg-dim text-xs">{sub}</span> : null}
    </div>
  );
}

export function MonoLabel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "text-k-fg-dim font-mono text-[11px] tracking-[1px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  right,
  className,
  children,
}: {
  right?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mb-4 flex items-baseline justify-between gap-3 text-[13px] font-bold",
        className,
      )}
    >
      <span>{children}</span>
      {right}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("bg-k-line h-px", className)} />;
}

export function KpiStrip({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "border-k-line grid grid-cols-2 border-b md:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function KpiCell({
  label,
  value,
  unit,
  foot,
  valueClassName,
  footClassName,
}: {
  label: string;
  value: React.ReactNode;
  unit?: React.ReactNode;
  foot?: React.ReactNode;
  valueClassName?: string;
  footClassName?: string;
}) {
  return (
    <div className="border-k-line border-r border-b px-6 py-5 last:border-r-0 md:border-b-0">
      <MonoLabel>{label}</MonoLabel>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-mono text-[30px] leading-none font-semibold",
            valueClassName,
          )}
        >
          {value}
        </span>
        {unit ? <span className="text-k-fg-muted text-xs">{unit}</span> : null}
      </div>
      {foot ? (
        <div className={cn("text-k-fg-dim mt-1 text-[11px]", footClassName)}>
          {foot}
        </div>
      ) : null}
    </div>
  );
}

/** 面の上に重ねる 1 段明るいカード（種目カード・入力ブロック）。 */
export function Card({
  active = false,
  className,
  children,
}: {
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "bg-k-card overflow-hidden rounded-[14px] border",
        active ? "border-k-accent-edge" : "border-k-line",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** 情報ハイライト（⚡ / 💡 の提案ブロック）。 */
export function HintCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "border-k-accent-edge rounded-xl border bg-[linear-gradient(160deg,#1b2740,#141821)] p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  tone = "accent",
  className,
  children,
}: {
  tone?: "accent" | "success" | "warn" | "neutral";
  className?: string;
  children: React.ReactNode;
}) {
  const tones = {
    accent: "bg-k-info-bg text-k-accent-soft",
    success: "bg-k-success-bg text-k-success",
    warn: "bg-k-warn-bg text-k-warn",
    neutral: "bg-k-chip text-k-fg-sub",
  } as const;

  return (
    <span
      className={cn(
        "rounded-[14px] px-2.5 py-1 text-[11px] whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Chip({
  active = false,
  className,
  children,
}: {
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "rounded-2xl border px-3 py-1.5 text-xs",
        active
          ? "border-k-accent-edge bg-k-accent-bg text-k-accent-soft"
          : "border-k-line-strong bg-k-chip text-k-fg-sub",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** 破線の追加アクション。 */
export function DashedAction({
  className,
  children,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "border-k-edge text-k-fg-muted hover:border-k-accent-edge hover:text-k-accent-soft w-full rounded-[10px] border border-dashed p-3 text-center text-[13px] transition-colors",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SegmentedGroup({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("bg-k-raised flex gap-1 rounded-[10px] p-1", className)}>
      {children}
    </div>
  );
}

export function segmentClass(active: boolean): string {
  return cn(
    "rounded-[7px] px-3.5 py-1.5 text-[13px] transition-colors",
    active
      ? "bg-k-segment text-k-fg font-semibold"
      : "text-k-fg-muted hover:text-k-fg",
  );
}

/** 進捗バー（トラック＋塗り）。 */
export function Meter({
  value,
  className,
  barClassName,
  trackClassName,
}: {
  /** 0–100。範囲外は丸める。 */
  value: number;
  className?: string;
  barClassName?: string;
  trackClassName?: string;
}) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn(
        "bg-k-well h-2 overflow-hidden rounded-[5px]",
        trackClassName,
        className,
      )}
    >
      <div
        className={cn("bg-k-accent h-full rounded-[5px]", barClassName)}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export type Bar = {
  height: number;
  className?: string;
  marker?: React.ReactNode;
  /** 棒の内側に絶対配置するオーバーレイ（体脂肪率のドットなど）。 */
  overlay?: React.ReactNode;
};

export function Bars({
  bars,
  className,
  gapClassName = "gap-[5px]",
}: {
  bars: Bar[];
  className?: string;
  gapClassName?: string;
}) {
  return (
    <div
      className={cn(
        "border-k-line flex items-end border-b",
        gapClassName,
        className,
      )}
    >
      {bars.map((bar, index) => (
        <div
          // 位置そのものが時系列上の意味を持つ固定長の系列なので index が安定キー。
          key={index}
          className="relative flex h-full flex-1 flex-col items-center justify-end"
        >
          {bar.marker}
          <div
            className={cn(
              "animate-rise bg-k-accent-dim w-full origin-bottom rounded-t-[3px]",
              bar.className,
            )}
            style={{ height: `${bar.height}%` }}
          />
          {bar.overlay}
        </div>
      ))}
    </div>
  );
}

export function AxisLabels({
  labels,
  className,
}: {
  labels: string[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-k-fg-faint mt-2 flex justify-between font-mono text-[10px]",
        className,
      )}
    >
      {labels.map((label) => (
        <span key={label}>{label}</span>
      ))}
    </div>
  );
}
