import { useState } from "react";

import {
  AxisLabels,
  Bars,
  Chip,
  MonoLabel,
  Pane,
  Panel,
  PanelTitle,
  SectionTitle,
  SplitBody,
  TopBar,
} from "@/components/kirog/console";
import { Button } from "@/components/ui/button";
import { useSaveBodyMeasurement } from "@/hooks/use-save-body-measurement";
import { kg, monthDay, num, signed, stampDate, todayIso } from "@/lib/format";
import { barHeights } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import type { BodyLog } from "@/schemas/body";

// 6A: 体重・体組成の記録画面。左が入力、右が推移と履歴。

const round1 = (value: number) => Math.round(value * 10) / 10;

export function BodyLogger({ data }: { data: BodyLog }) {
  const { latest, previous } = data;
  const saveBody = useSaveBodyMeasurement();
  const [weight, setWeight] = useState(() => latest.weightKg || 70);
  const [conditionsOn, setConditionsOn] = useState<Set<string>>(
    () =>
      new Set(
        data.conditions.filter((c) => c.on).map((condition) => condition.label),
      ),
  );
  const weightDelta = weight - previous.weightKg;

  const toggleCondition = (label: string) =>
    setConditionsOn((current) => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  const save = () =>
    saveBody.mutate({
      date: todayIso(),
      weight_kg: weight,
      body_fat_pct: null,
      muscle_kg: null,
      conditions: [...conditionsOn],
      note: "",
    });

  const weights = data.series.map((point) => point.weightKg);
  const fats = data.series.map((point) => point.bodyFatPct);
  const weightBars = barHeights(weights);
  const fatMarks = barHeights(fats, 8);

  const first = data.series[0];
  const monthAgo = data.series.at(-30) ?? first;
  const weightChange = monthAgo ? latest.weightKg - monthAgo.weightKg : 0;
  const fatChange = monthAgo ? latest.bodyFatPct - monthAgo.bodyFatPct : 0;

  const metrics = [
    {
      label: "体脂肪率 · BODY FAT",
      value: latest.bodyFatPct.toFixed(1),
      unit: "%",
      delta: `前回 ${previous.bodyFatPct.toFixed(1)}% ${signed(latest.bodyFatPct - previous.bodyFatPct)}`,
      good: latest.bodyFatPct <= previous.bodyFatPct,
    },
    {
      label: "筋肉量 · MUSCLE",
      value: latest.muscleKg.toFixed(1),
      unit: "kg",
      delta: `前回 ${previous.muscleKg.toFixed(1)} ${signed(latest.muscleKg - previous.muscleKg)}`,
      good: latest.muscleKg >= previous.muscleKg,
    },
    {
      label: "BMI",
      value: latest.bmi.toFixed(1),
      unit: "",
      delta: "標準範囲",
      good: null,
    },
    {
      label: "基礎代謝 · BMR",
      value: num(latest.bmrKcal),
      unit: "kcal",
      delta: `前回 ${num(previous.bmrKcal)} ${signed(latest.bmrKcal - previous.bmrKcal, 0)}`,
      good: null,
    },
  ];

  return (
    <Panel>
      <TopBar>
        <PanelTitle>体重・体組成を記録</PanelTitle>
        <div className="flex items-center gap-3.5">
          <div className="border-k-line bg-k-raised text-k-fg-sub flex items-center gap-2 rounded-[9px] border px-3.5 py-1.5 font-mono text-[13px]">
            <span className="text-k-accent">◂</span>
            {stampDate(latest.date)} 07:10
            <span className="text-k-accent">▸</span>
          </div>
          <Button
            size="sm"
            className="rounded-[9px] font-bold"
            onClick={save}
            disabled={saveBody.isPending}
          >
            記録を確定
          </Button>
        </div>
      </TopBar>

      <SplitBody className="lg:[grid-template-columns:1fr_1.3fr]">
        <Pane>
          <SectionTitle className="mb-4.5">今朝の測定値</SectionTitle>

          <div className="border-k-accent-edge bg-k-card mb-3.5 rounded-[14px] border p-5.5">
            <MonoLabel className="mb-2.5">体重 · WEIGHT</MonoLabel>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[46px] leading-none font-bold">
                {kg(weight)}
              </span>
              <span className="text-k-fg-muted text-base">kg</span>
              <div className="ml-auto flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setWeight((w) => round1(Math.max(0, w - 0.1)))}
                  aria-label="0.1kg 減らす"
                  className="bg-k-chip text-k-fg-dim flex size-9 items-center justify-center rounded-[9px] text-lg"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => setWeight((w) => round1(w + 0.1))}
                  aria-label="0.1kg 増やす"
                  className="bg-k-accent-bg text-k-accent-soft flex size-9 items-center justify-center rounded-[9px] text-lg"
                >
                  ＋
                </button>
              </div>
            </div>
            <div
              className={cn(
                "mt-2 text-xs",
                weightDelta <= 0 ? "text-k-success" : "text-k-danger",
              )}
            >
              前回 {kg(previous.weightKg)}kg {signed(weightDelta)}kg
            </div>
          </div>

          <div className="mb-3.5 grid grid-cols-2 gap-3">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="border-k-line bg-k-card rounded-xl border p-4"
              >
                <MonoLabel className="mb-2">{metric.label}</MonoLabel>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-[26px] font-semibold">
                    {metric.value}
                  </span>
                  {metric.unit ? (
                    <span className="text-k-fg-muted text-xs">
                      {metric.unit}
                    </span>
                  ) : null}
                </div>
                <div
                  className={cn(
                    "mt-1 text-[11px]",
                    metric.good === null
                      ? "text-k-fg-dim"
                      : metric.good
                        ? "text-k-success"
                        : "text-k-danger",
                  )}
                >
                  {metric.delta}
                </div>
              </div>
            ))}
          </div>

          <div className="border-k-line bg-k-card rounded-xl border p-4">
            <MonoLabel className="mb-3">コンディション</MonoLabel>
            <div className="flex flex-wrap gap-2">
              {data.conditions.map((condition) => {
                const on = conditionsOn.has(condition.label);
                return (
                  <button
                    key={condition.label}
                    type="button"
                    onClick={() => toggleCondition(condition.label)}
                    aria-pressed={on}
                  >
                    <Chip active={on}>
                      {on ? "✓ " : ""}
                      {condition.label}
                    </Chip>
                  </button>
                );
              })}
              <Chip>＋ 追加</Chip>
            </div>
          </div>
        </Pane>

        <Pane>
          <SectionTitle
            className="mb-4"
            right={
              <div className="flex gap-1.5 font-mono text-[11px]">
                <span className="bg-k-chip rounded-md px-2.5 py-1">30D</span>
                <span className="text-k-fg-dim px-2.5 py-1">90D</span>
                <span className="text-k-fg-dim px-2.5 py-1">1Y</span>
              </div>
            }
          >
            体重・体脂肪率の推移
          </SectionTitle>

          <div className="text-k-fg-muted mb-3 flex gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="bg-k-accent h-[3px] w-3 rounded-sm" />
              体重 (kg)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="bg-k-success h-[3px] w-3 rounded-sm" />
              体脂肪率 (%)
            </span>
          </div>

          <Bars
            className="h-[150px]"
            gapClassName="gap-1"
            bars={weightBars.map((height, index) => ({
              height,
              className:
                "bg-[linear-gradient(180deg,#5b8bff,#2f4dad)] opacity-90 rounded-t-[3px]",
              overlay: (
                <span
                  className="bg-k-success absolute h-1 w-full rounded-sm"
                  style={{ bottom: `${fatMarks[index]}%` }}
                />
              ),
            }))}
          />
          <AxisLabels
            labels={[
              monthDay(data.series[0]?.date ?? latest.date),
              monthDay(data.series[14]?.date ?? latest.date),
              monthDay(latest.date),
            ]}
          />

          <div className="bg-k-line my-5.5 grid grid-cols-3 gap-px overflow-hidden rounded-[10px]">
            <TrendCell
              label="30日変化"
              value={`${signed(weightChange)}kg`}
              tone={weightChange <= 0 ? "good" : "bad"}
            />
            <TrendCell
              label="体脂肪率"
              value={`${signed(fatChange)}%`}
              tone={fatChange <= 0 ? "good" : "bad"}
            />
            <TrendCell
              label="目標まで"
              value={`${(latest.weightKg - data.targetWeightKg).toFixed(1)}kg`}
              tone="neutral"
            />
          </div>

          <SectionTitle>最近の記録</SectionTitle>
          <div className="bg-k-line flex flex-col gap-px overflow-hidden rounded-[10px]">
            <div className="bg-k-raised text-k-fg-faint grid grid-cols-[100px_1fr_1fr_1fr] gap-3 px-4 py-2.5 font-mono text-[10px]">
              <div>DATE</div>
              <div>体重</div>
              <div>体脂肪</div>
              <div>筋肉量</div>
            </div>
            {[...data.series]
              .reverse()
              .slice(0, 5)
              .map((point) => (
                <div
                  key={point.date}
                  className="bg-k-raised grid grid-cols-[100px_1fr_1fr_1fr] gap-3 px-4 py-3 font-mono text-[13px]"
                >
                  <div className="text-k-fg-muted">{monthDay(point.date)}</div>
                  <div>
                    {point.weightKg.toFixed(1)}
                    <span className="text-k-fg-faint text-[10px]">kg</span>
                  </div>
                  <div className="text-k-fg-sub">
                    {point.bodyFatPct.toFixed(1)}
                    <span className="text-k-fg-faint text-[10px]">%</span>
                  </div>
                  <div className="text-k-fg-sub">
                    {point.muscleKg.toFixed(1)}
                    <span className="text-k-fg-faint text-[10px]">kg</span>
                  </div>
                </div>
              ))}
          </div>
        </Pane>
      </SplitBody>
    </Panel>
  );
}

function TrendCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "bad" | "neutral";
}) {
  return (
    <div className="bg-k-raised px-4 py-3.5">
      <MonoLabel>{label}</MonoLabel>
      <div
        className={cn(
          "mt-1 font-mono text-xl",
          tone === "good" && "text-k-success",
          tone === "bad" && "text-k-danger",
        )}
      >
        {value}
      </div>
    </div>
  );
}
