import { Divider, Meter, Pane, SectionTitle } from "@/components/kirog/console";
import { SlotBadge } from "@/components/meals/slot-badge";
import { SLOT_COLOR } from "@/components/meals/slot-color";
import { dec } from "@/lib/format";
import { dayKcal, dayMacros, groupKcal, pct } from "@/lib/metrics";
import type { DailyMeals } from "@/schemas/meals";

/** 右ペイン：その日の合計・PFC・食事別の内訳。すべて data から導出する。 */
export function DailyTotalsPane({ data }: { data: DailyMeals }) {
  const totalKcal = dayKcal(data.groups);
  const totals = dayMacros(data.groups);

  const macroRows = [
    {
      label: "タンパク質",
      value: totals.p,
      target: data.targetMacros.p,
      bar: "bg-k-accent",
      text: "text-k-accent",
    },
    {
      label: "脂質",
      value: totals.f,
      target: data.targetMacros.f,
      bar: "bg-k-success",
      text: "text-k-success",
    },
    {
      label: "炭水化物",
      value: totals.c,
      target: data.targetMacros.c,
      bar: "bg-k-warn",
      text: "text-k-warn",
    },
  ];

  return (
    <Pane className="flex flex-col gap-5.5">
      <div>
        <SectionTitle
          right={
            <span className="text-k-success font-mono text-xs">
              残り {dec(data.targetKcal - totalKcal)} kcal
            </span>
          }
        >
          本日の合計
        </SectionTitle>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[38px] font-bold">
            {dec(totalKcal)}
          </span>
          <span className="text-k-fg-muted text-sm">
            / {dec(data.targetKcal)} kcal
          </span>
        </div>
        <Meter
          value={pct(totalKcal, data.targetKcal)}
          className="mt-3 h-[9px]"
          barClassName="bg-[linear-gradient(90deg,#5b8bff,#4fd39a)]"
        />
      </div>

      <div className="flex flex-col gap-3.5">
        {macroRows.map((row) => (
          <div key={row.label}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[13px]">{row.label}</span>
              <span className="text-k-fg-dim font-mono text-xs">
                {dec(row.value)}g / {dec(row.target)}g{" "}
                <span className={row.text}>
                  {Math.round(pct(row.value, row.target))}%
                </span>
              </span>
            </div>
            <Meter
              value={pct(row.value, row.target)}
              className="h-[7px]"
              barClassName={row.bar}
            />
          </div>
        ))}
      </div>

      <Divider />

      <div>
        <SectionTitle className="mb-3">食事別の内訳</SectionTitle>
        <div className="bg-k-line mb-4 flex h-2.5 overflow-hidden rounded-full">
          {data.groups.map((group) => {
            const width =
              totalKcal > 0 ? (groupKcal(group) / totalKcal) * 100 : 0;
            return width > 0 ? (
              <div
                key={group.slot}
                className={SLOT_COLOR[group.slot]}
                style={{ width: `${width}%` }}
              />
            ) : null;
          })}
        </div>
        <div className="flex flex-col gap-2.5">
          {data.groups.map((group) => {
            const kcal = groupKcal(group);
            const share =
              totalKcal > 0 ? Math.round((kcal / totalKcal) * 100) : 0;
            return (
              <div key={group.slot} className="flex items-center gap-3">
                <SlotBadge
                  slot={group.slot}
                  className="size-6 rounded-md"
                  iconClassName="size-3.5"
                />
                <span className="flex-1 text-[13px]">{group.name}</span>
                <span className="text-k-fg-sub font-mono text-[13px]">
                  {dec(kcal)}
                  <span className="text-k-fg-dim ml-0.5 text-[11px]">kcal</span>
                </span>
                <span className="text-k-fg-dim w-9 text-right font-mono text-[11px]">
                  {share}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Pane>
  );
}
