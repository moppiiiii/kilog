import { kg, monthDay } from "@/lib/format";
import type { WeightPoint } from "@/schemas/body";

// 体重の推移（折れ線）。単一系列なので凡例は不要（タイトルが系列名）。
// y は data の最小〜最大にズームして変化を見せ、左に kg 目盛り・下に実日付・最新値を直接ラベルする。
// ダッシュボード（1A）とレポート（7A）で共有する。

const HEIGHT = 130;

export function WeightTrend({ points }: { points: WeightPoint[] }) {
  if (points.length === 0) {
    return (
      <div
        className="text-k-fg-dim flex items-center justify-center text-sm"
        style={{ height: HEIGHT }}
      >
        体重の記録がありません
      </div>
    );
  }

  const values = points.map((p) => p.weightKg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // 変化が見えるよう上下に余白。全点同値でも潰れないよう最低幅を持たせる。
  const pad = (max - min) * 0.2 || 0.3;
  const lo = min - pad;
  const hi = max + pad;
  const n = points.length;

  const coords = points.map((p, i) => ({
    x: n === 1 ? 50 : (i / (n - 1)) * 100,
    y: 100 - ((p.weightKg - lo) / (hi - lo)) * 100,
  }));
  const line = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x} ${c.y}`)
    .join(" ");
  const area = `${line} L${coords[coords.length - 1]?.x ?? 50} 100 L${coords[0]?.x ?? 50} 100 Z`;
  const last = coords[coords.length - 1] ?? { x: 50, y: 50 };
  const latest = values[values.length - 1] ?? 0;

  return (
    <div className="flex gap-2.5">
      {/* y 目盛り（最大・最小 kg） */}
      <div
        className="text-k-fg-faint flex flex-col justify-between py-0.5 text-right font-mono text-[10px]"
        style={{ height: HEIGHT }}
      >
        <span>{kg(max)}</span>
        <span>{kg(min)}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-k-accent relative" style={{ height: HEIGHT }}>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="h-full w-full"
            aria-hidden
          >
            <defs>
              <linearGradient id="weightArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            {n > 1 ? <path d={area} fill="url(#weightArea)" /> : null}
            {n > 1 ? (
              <path
                d={line}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </svg>

          {/* 最新点のマーカー（SVG の歪みを避けて HTML で重ねる） */}
          <span
            className="border-k-panel bg-k-accent absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
            style={{ left: `${last.x}%`, top: `${last.y}%` }}
          />

          {/* 最新値ラベル */}
          <div className="border-k-line bg-k-panel/90 text-k-fg absolute top-0 right-0 rounded-md border px-2 py-0.5 font-mono text-[11px] backdrop-blur">
            {kg(latest)}
            <span className="text-k-fg-dim">kg</span>
          </div>
        </div>

        {/* x 目盛り（期間の始点・終点の実日付） */}
        <div className="text-k-fg-faint mt-1.5 flex justify-between font-mono text-[10px]">
          <span>{monthDay(points[0]?.date ?? "")}</span>
          <span>{monthDay(points[points.length - 1]?.date ?? "")}</span>
        </div>
      </div>
    </div>
  );
}
