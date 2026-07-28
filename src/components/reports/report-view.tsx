import { Link } from "@tanstack/react-router";

import {
  Divider,
  KpiCell,
  KpiStrip,
  Meter,
  MonoLabel,
  Pane,
  Panel,
  PanelTitle,
  SectionTitle,
  SegmentedGroup,
  segmentClass,
  SplitBody,
  TopBar,
} from "@/components/kirog/console";
import { WeightTrend } from "@/components/kirog/weight-trend";
import { num, signed, signedPct } from "@/lib/format";
import { macroKcal, macroShare } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import type { Report, ReportRangeValue } from "@/schemas/reports";

/** 前期比のラベル。range で「前週/前月」を出し分ける。 */
const PREV_LABEL: Record<ReportRangeValue, string> = {
  week: "前週比",
  month: "前月比",
};

/** 体重変化の分母（「−1.2kg / 月」の「月」）。 */
const RANGE_UNIT: Record<ReportRangeValue, string> = {
  week: "週",
  month: "月",
};

// 7A: レポート画面。期間の総括。

/** ヒートマップの強度スケール（0 = 休養 → 3 = 高ボリューム）。 */
const HEAT_SCALE = ["#1a1e26", "#233a5a", "#3560a8", "#5b8bff"];

const RANGES = [
  { key: "week", label: "週" },
  { key: "month", label: "月" },
] as const;

export function ReportView({
  report,
  range,
  offset,
}: {
  report: Report;
  range: ReportRangeValue;
  offset: number;
}) {
  const [p, f, c] = macroShare(report.avgMacros);
  const maxTons = Math.max(...report.muscleVolume.map((m) => m.tons));
  const prevLabel = PREV_LABEL[range];

  return (
    <Panel>
      <TopBar>
        <PanelTitle sub={report.periodLabel}>レポート</PanelTitle>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <SegmentedGroup>
            {RANGES.map((item) => (
              <Link
                key={item.key}
                to="/report"
                search={{ range: item.key }}
                className={segmentClass(range === item.key)}
              >
                {item.label}
              </Link>
            ))}
          </SegmentedGroup>
          <div className="flex items-center gap-2.5 font-mono text-[13px]">
            <Link
              to="/report"
              search={{ range, offset: offset + 1 }}
              className="text-k-accent hover:text-k-fg"
              aria-label="前の期間"
            >
              ◂
            </Link>
            <span className="text-k-fg-sub min-w-[92px] text-center">
              {report.periodLabel}
            </span>
            {offset > 0 ? (
              <Link
                to="/report"
                search={{ range, offset: offset - 1 }}
                className="text-k-accent hover:text-k-fg"
                aria-label="次の期間"
              >
                ▸
              </Link>
            ) : (
              <span className="text-k-fg-faint" aria-hidden>
                ▸
              </span>
            )}
          </div>
        </div>
      </TopBar>

      <KpiStrip>
        <KpiCell
          label="TRAINING DAYS"
          value={String(report.trainingDays)}
          unit={`/ ${report.daysInPeriod}日`}
          foot={`${prevLabel} ${signed(report.trainingDaysDelta, 0)}日`}
          footClassName="text-k-success"
        />
        <KpiCell
          label="総挙上量"
          value={report.volumeTons.toFixed(1)}
          unit="t"
          foot={`${prevLabel} ${signedPct(report.volumeDeltaPct)}`}
          footClassName="text-k-success"
        />
        <KpiCell
          label="平均カロリー"
          value={num(report.avgKcal)}
          unit="kcal"
          foot={`目標 ${num(report.targetKcal)}`}
        />
        <KpiCell
          label="体重変化"
          value={report.weightDeltaKg.toFixed(1)}
          unit="kg"
          foot="順調に減量中"
          footClassName="text-k-success"
        />
      </KpiStrip>

      <SplitBody className="lg:[grid-template-columns:1.3fr_1fr]">
        <Pane>
          <SectionTitle>トレーニング頻度</SectionTitle>
          <div className="mb-1.5 grid grid-cols-[repeat(15,1fr)] gap-[5px]">
            {report.heatmap.map((level, index) => (
              <span
                // 日付順の固定長シリーズ。
                key={`${index}-${level}`}
                className="aspect-square rounded-[4px]"
                style={{ background: HEAT_SCALE[level] }}
              />
            ))}
          </div>
          <div className="text-k-fg-faint mb-6 flex items-center gap-2 font-mono text-[10px]">
            <span>少</span>
            {HEAT_SCALE.map((color) => (
              <span
                key={color}
                className="size-[11px] rounded-[3px]"
                style={{ background: color }}
              />
            ))}
            <span>多</span>
            <span className="text-k-fg-muted ml-auto">
              {report.trainingDays} / {report.daysInPeriod} 日 トレーニング
            </span>
          </div>

          <SectionTitle>部位別ボリューム</SectionTitle>
          <div className="flex flex-col gap-3">
            {report.muscleVolume.map((muscle) => (
              <div key={muscle.name}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-[13px]">{muscle.name}</span>
                  <span className="text-k-fg-dim font-mono text-xs">
                    {muscle.tons.toFixed(1)}t{" "}
                    <span
                      className={
                        muscle.deltaPct >= 0
                          ? "text-k-success"
                          : "text-k-danger"
                      }
                    >
                      {signedPct(muscle.deltaPct, 0)}
                    </span>
                  </span>
                </div>
                <Meter
                  value={(muscle.tons / maxTons) * 100}
                  barClassName={
                    muscle.tons === maxTons ? "bg-k-success" : "bg-k-accent"
                  }
                />
              </div>
            ))}
          </div>
        </Pane>

        <Pane className="flex flex-col gap-5.5">
          <div>
            <SectionTitle>栄養の平均（1日あたり）</SectionTitle>
            <div className="bg-k-line grid grid-cols-2 gap-px overflow-hidden rounded-[10px]">
              <NutritionCell label="カロリー" value={num(report.avgKcal)} />
              <NutritionCell
                label="タンパク質"
                value={`${num(report.avgMacros.p)}g`}
                className="text-k-accent"
              />
              <NutritionCell
                label="脂質"
                value={`${num(report.avgMacros.f)}g`}
                className="text-k-success"
              />
              <NutritionCell
                label="炭水化物"
                value={`${num(report.avgMacros.c)}g`}
                className="text-k-warn"
              />
            </div>
            <div className="mt-3 flex h-2 overflow-hidden rounded-[5px]">
              <div className="bg-k-accent" style={{ width: `${p}%` }} />
              <div className="bg-k-success" style={{ width: `${f}%` }} />
              <div className="bg-k-warn" style={{ width: `${c}%` }} />
            </div>
            <div className="text-k-fg-faint mt-1.5 flex justify-between font-mono text-[10px]">
              <span>P {p}%</span>
              <span>F {f}%</span>
              <span>C {c}%</span>
            </div>
            <div className="text-k-fg-faint mt-1 font-mono text-[10px]">
              PFC 換算 {num(macroKcal(report.avgMacros))} kcal
            </div>
          </div>

          <Divider />

          <div>
            <SectionTitle>今月の自己ベスト</SectionTitle>
            <div className="flex flex-col gap-2">
              {report.personalBests.map((pb) => {
                const inner = (
                  <>
                    <span className="text-sm">🏆</span>
                    <span className="flex-1 text-[13px] font-medium">
                      {pb.name}
                    </span>
                    <span className="font-mono text-sm">{pb.value}</span>
                    <span className="text-k-success w-14 text-right font-mono text-[11px]">
                      {signed(pb.gainKg)}
                    </span>
                  </>
                );
                const className =
                  "border-k-line bg-k-raised flex items-center gap-3 rounded-[10px] border px-3.5 py-3";

                return pb.exerciseId ? (
                  <Link
                    key={pb.name}
                    to="/report/$exerciseId"
                    params={{ exerciseId: pb.exerciseId }}
                    search={{ range: "6m" }}
                    className={cn(
                      className,
                      "hover:border-k-accent-edge transition-colors",
                    )}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={pb.name} className={className}>
                    {inner}
                  </div>
                );
              })}
            </div>
          </div>

          <Divider />

          <div>
            <SectionTitle
              right={
                <span className="text-k-success font-mono text-xs">
                  {signed(report.weightDeltaKg)}kg / {RANGE_UNIT[range]}
                </span>
              }
            >
              体重の推移
            </SectionTitle>
            <WeightTrend points={report.weightSeries} />
          </div>
        </Pane>
      </SplitBody>
    </Panel>
  );
}

function NutritionCell({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="bg-k-raised px-4 py-3.5">
      <MonoLabel>{label}</MonoLabel>
      <div className={cn("mt-1 font-mono text-[22px]", className)}>{value}</div>
    </div>
  );
}
