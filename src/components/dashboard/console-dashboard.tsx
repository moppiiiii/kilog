import { Link } from "@tanstack/react-router";

import {
  KpiCell,
  KpiStrip,
  Pane,
  Panel,
  PanelTitle,
  SectionTitle,
  SplitBody,
  TopBar,
} from "@/components/kirog/console";
import { WeightTrend } from "@/components/kirog/weight-trend";
import { SlotBadge } from "@/components/meals/slot-badge";
import { kg, num, signed, stampDate } from "@/lib/format";
import { macroShare, pct } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import type { Dashboard, WeightRangeValue } from "@/schemas/dashboard";

// 1A: 高密度データダッシュボード（Console）。

/** 体重グラフの期間トグル。値は search params（range）が正。 */
const RANGES = [
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "1y", label: "1Y" },
] as const;

export function ConsoleDashboard({
  data,
  range,
}: {
  data: Dashboard;
  range: WeightRangeValue;
}) {
  const [p, f, c] = macroShare(data.macros);
  const proteinPct = pct(data.macros.p, data.targetMacros.p);

  return (
    <Panel>
      <TopBar>
        <PanelTitle sub={stampDate(data.date)}>ダッシュボード</PanelTitle>
      </TopBar>

      <KpiStrip>
        <KpiCell
          label="BODY WEIGHT"
          value={kg(data.weightKg)}
          unit="kg"
          foot={`前回比 ${signed(data.weightDeltaKg)} kg`}
          footClassName={
            data.weightDeltaKg <= 0 ? "text-k-success" : "text-k-danger"
          }
        />
        <KpiCell
          label="CALORIES"
          value={num(data.kcal)}
          unit={`/ ${num(data.targetKcal)}`}
          foot={`残り ${num(data.targetKcal - data.kcal)} kcal`}
        />
        <KpiCell
          label="PROTEIN"
          value={num(data.macros.p)}
          unit="g"
          foot={`目標 ${num(data.targetMacros.p)}g · ${Math.round(proteinPct)}%`}
          footClassName="text-k-accent-soft"
        />
        <KpiCell
          label="STREAK"
          value={num(data.streakDays)}
          unit="日連続"
          foot={
            data.streakDays > 0 ? "トレーニングを継続中" : "今日から再開しよう"
          }
        />
      </KpiStrip>

      <SplitBody className="lg:[grid-template-columns:1.35fr_1fr]">
        <Pane>
          <SectionTitle
            className="text-sm"
            right={
              <div className="flex gap-1.5 font-mono text-[11px]">
                {RANGES.map((item) => (
                  <Link
                    key={item.key}
                    to="/"
                    search={{ range: item.key }}
                    className={cn(
                      "rounded-md px-2.5 py-1 transition-colors",
                      range === item.key
                        ? "bg-k-chip text-k-fg"
                        : "text-k-fg-dim hover:text-k-fg",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            }
          >
            体重の推移
          </SectionTitle>

          <WeightTrend points={data.weightSeries} />

          <div className="mt-6 mb-3.5 text-sm font-bold">
            今日のトレーニング · {data.sessionTitle}
          </div>
          <div className="bg-k-line flex flex-col gap-px overflow-hidden rounded-[10px]">
            {data.exercises.map((exercise) => (
              <div
                key={exercise.name}
                className="bg-k-raised flex items-center gap-3.5 px-4 py-3"
              >
                <span className="bg-k-accent size-1.5 shrink-0 rounded-full" />
                <span className="flex-1 truncate text-[13px] font-medium">
                  {exercise.name}
                </span>
                {exercise.isCardio ? (
                  <span className="text-k-fg-sub font-mono text-[13px]">
                    {exercise.durationMin != null
                      ? `${num(exercise.durationMin)}分`
                      : "—"}
                    {exercise.distanceKm != null
                      ? ` · ${exercise.distanceKm}km`
                      : ""}
                  </span>
                ) : (
                  <>
                    <span className="text-k-fg-sub font-mono text-[13px]">
                      {exercise.sets}×{exercise.reps}
                    </span>
                    <span className="text-k-fg-dim w-[74px] text-right font-mono text-[13px]">
                      {num(exercise.volumeKg)}kg
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        </Pane>

        <Pane>
          <SectionTitle
            className="text-sm"
            right={
              <span className="text-k-accent font-mono text-xs">
                P{num(data.macros.p)} · F{num(data.macros.f)} · C
                {num(data.macros.c)}
              </span>
            }
          >
            今日の食事
          </SectionTitle>

          <div className="mb-5 flex h-2 overflow-hidden rounded-[5px]">
            <div className="bg-k-accent" style={{ width: `${p}%` }} />
            <div className="bg-k-success" style={{ width: `${f}%` }} />
            <div className="bg-k-warn" style={{ width: `${c}%` }} />
          </div>

          <div className="flex flex-col gap-3.5">
            {data.meals.map((meal) => (
              <div key={meal.slot} className="flex items-center gap-3.5">
                <SlotBadge
                  slot={meal.slot}
                  className="size-11 rounded-[10px]"
                  iconClassName="size-5"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">
                    {meal.name}
                  </div>
                  <div className="text-k-fg-dim mt-0.5 text-[11px]">
                    {meal.detail}
                  </div>
                </div>
                <span className="font-mono text-sm">{num(meal.kcal)}</span>
              </div>
            ))}
          </div>
        </Pane>
      </SplitBody>
    </Panel>
  );
}
