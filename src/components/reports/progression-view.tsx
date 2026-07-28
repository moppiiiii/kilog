import { Link } from "@tanstack/react-router";

import {
  AxisLabels,
  Badge,
  Bars,
  HintCard,
  KpiCell,
  KpiStrip,
  Meter,
  Pane,
  Panel,
  SectionTitle,
  SegmentedGroup,
  SplitBody,
  TopBar,
} from "@/components/kirog/console";
import { segmentClass } from "@/components/kirog/segment-class";
import { Button } from "@/components/ui/button";
import { kg, monthDay, num, signed } from "@/lib/format";
import { barHeights } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import type { Progression } from "@/schemas/progression";

// 11A: 種目別プログレッション。推定 1RM の推移と次回の提案。

const RANGES = [
  { key: "3m", label: "3M" },
  { key: "6m", label: "6M" },
  { key: "1y", label: "1Y" },
  { key: "all", label: "全" },
] as const;

export function ProgressionView({
  progression,
  range,
}: {
  progression: Progression;
  range: "3m" | "6m" | "1y" | "all";
}) {
  const heights = barHeights(
    progression.series.map((point) => point.value),
    14,
  );
  const lastIndex = progression.series.length - 1;
  const maxRepMax = Math.max(...progression.repMaxes.map((rm) => rm.kg));

  return (
    <Panel>
      <TopBar>
        <div className="flex flex-wrap items-center gap-3.5">
          <Link
            to="/report"
            search={{ range: "month" }}
            className="text-k-fg-dim hover:text-k-fg flex items-center gap-2 text-[13px]"
          >
            <span className="text-k-accent">◂</span> レポート
          </Link>
          <span className="bg-k-edge h-4 w-px" />
          <div className="border-k-line-strong bg-k-raised flex items-center gap-2.5 rounded-[10px] border px-3.5 py-2">
            <span className="text-[15px] font-bold">
              {progression.exerciseName}
            </span>
            <Badge>{progression.part}</Badge>
            <span className="text-k-accent text-xs">▾</span>
          </div>
        </div>
        <SegmentedGroup className="font-mono text-xs">
          {RANGES.map((item) => (
            <Link
              key={item.key}
              to="/report/$exerciseId"
              params={{ exerciseId: progression.exerciseId }}
              search={{ range: item.key }}
              className={segmentClass(range === item.key)}
            >
              {item.label}
            </Link>
          ))}
        </SegmentedGroup>
      </TopBar>

      <KpiStrip>
        <KpiCell
          label="推定 1RM"
          value={progression.estimatedOneRm.toFixed(1)}
          unit="kg"
          valueClassName="text-k-accent-soft"
          foot={`6ヶ月で ${signed(progression.oneRmGainKg)}kg`}
          footClassName="text-k-success"
        />
        <KpiCell
          label="実測 最高重量"
          value={kg(progression.bestSet.kg)}
          unit={`kg × ${progression.bestSet.reps}`}
          foot={`${monthDay(progression.bestSet.date)} に更新`}
        />
        <KpiCell
          label="総挙上量（累計）"
          value={num(progression.totalVolumeTons)}
          unit="t"
          foot={`${progression.sessionCount} セッション`}
        />
        <KpiCell
          label="直近4回の傾向"
          value={progression.trend === "up" ? "↗ 上昇" : "→ 停滞"}
          valueClassName={
            progression.trend === "up" ? "text-k-success" : "text-k-fg-muted"
          }
          foot={progression.trendNote}
        />
      </KpiStrip>

      <SplitBody className="lg:[grid-template-columns:1.5fr_1fr]">
        <Pane>
          <SectionTitle
            right={
              <div className="text-k-fg-muted flex gap-3.5 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="bg-k-accent size-2.5 rounded-[3px]" />
                  推定1RM
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="bg-k-success size-2 rounded-full" />
                  PB更新
                </span>
              </div>
            }
          >
            推定1RMの推移
          </SectionTitle>

          <Bars
            className="h-[180px]"
            bars={progression.series.map((point, index) => ({
              id: point.date,
              height: heights[index] ?? 0,
              className:
                index === lastIndex
                  ? "bg-k-accent-soft"
                  : point.pb
                    ? "bg-k-success"
                    : "bg-k-accent-dim",
              marker: point.pb ? (
                <span className="bg-k-success mb-1 size-[7px] rounded-full" />
              ) : null,
            }))}
          />
          <AxisLabels
            labels={[
              monthDay(progression.series[0]?.date ?? ""),
              monthDay(progression.series[8]?.date ?? ""),
              monthDay(progression.series[16]?.date ?? ""),
              "今",
            ]}
          />

          <SectionTitle className="mt-6">最近のトップセット</SectionTitle>
          <div className="bg-k-line flex flex-col gap-px overflow-hidden rounded-[10px]">
            <div className="bg-k-raised text-k-fg-faint grid grid-cols-[90px_1fr_1fr_1fr_70px] gap-3 px-4 py-2.5 font-mono text-[10px]">
              <div>DATE</div>
              <div>TOP SET</div>
              <div>推定1RM</div>
              <div>RPE</div>
              <div className="text-right">前回比</div>
            </div>
            {progression.topSets.map((log) => (
              <div
                key={log.date}
                className="bg-k-raised grid grid-cols-[90px_1fr_1fr_1fr_70px] items-center gap-3 px-4 py-3 font-mono text-[13px]"
              >
                <div className="text-k-fg-muted">{monthDay(log.date)}</div>
                <div>
                  {kg(log.kg)}×{log.reps}
                </div>
                <div className="text-k-accent-soft">{log.oneRm.toFixed(1)}</div>
                <div className="text-k-fg-muted">{log.rpe.toFixed(1)}</div>
                <div
                  className={cn(
                    "text-right",
                    log.deltaKg > 0
                      ? "text-k-success"
                      : log.deltaKg < 0
                        ? "text-k-danger"
                        : "text-k-fg-dim",
                  )}
                >
                  {signed(log.deltaKg)}
                </div>
              </div>
            ))}
          </div>
        </Pane>

        <Pane className="flex flex-col gap-5.5">
          <HintCard className="p-4.5">
            <div className="text-k-accent-text mb-2.5 text-xs">
              ⚡ 次回の提案（漸進性過負荷）
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="font-mono text-[32px] font-bold">
                {progression.suggestion.kg.toFixed(1)}
              </span>
              <span className="text-k-fg-muted text-sm">
                kg × {progression.suggestion.reps} ×{" "}
                {progression.suggestion.sets}セット
              </span>
            </div>
            <p className="text-k-accent-text mt-2 text-xs leading-relaxed">
              {progression.suggestion.note}
            </p>
            <div className="mt-3.5 flex gap-2">
              <Button asChild size="sm" className="rounded-lg font-bold">
                <Link to="/log">この目標で記録</Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="bg-k-chip rounded-lg"
              >
                調整
              </Button>
            </div>
          </HintCard>

          <div>
            <SectionTitle>レップ別 自己ベスト</SectionTitle>
            <div className="bg-k-line flex flex-col gap-px overflow-hidden rounded-[10px]">
              {progression.repMaxes.map((rm) => (
                <div
                  key={rm.reps}
                  className="bg-k-raised flex items-center gap-3 px-4 py-3"
                >
                  <span className="text-k-fg-dim w-[54px] font-mono text-xs">
                    {rm.reps}RM
                  </span>
                  <Meter
                    value={(rm.kg / maxRepMax) * 100}
                    className="h-1.5 flex-1"
                    trackClassName="rounded-[4px]"
                    barClassName="rounded-[4px]"
                  />
                  <span className="w-14 text-right font-mono text-sm">
                    {rm.kg.toFixed(1)}
                  </span>
                  <span className="text-k-fg-faint w-11 text-right font-mono text-[10px]">
                    {monthDay(rm.date)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionTitle>マイルストーン</SectionTitle>
            <div className="flex flex-col gap-2">
              {progression.milestones.map((milestone) => (
                <div
                  key={milestone.title}
                  className="border-k-line bg-k-raised flex items-center gap-3 rounded-[10px] border px-3.5 py-3"
                >
                  <span className="text-[15px]">{milestone.icon}</span>
                  <div className="flex-1">
                    <div className="text-[13px] font-medium">
                      {milestone.title}
                    </div>
                    <div className="text-k-fg-dim text-[11px]">
                      {milestone.detail}
                    </div>
                  </div>
                  <span className="text-k-accent-soft font-mono text-xs">
                    {Math.round(milestone.progressPct)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Pane>
      </SplitBody>
    </Panel>
  );
}
