import { SectionTitle } from "@/components/kirog/console";
import { num, signedPct } from "@/lib/format";
import {
  cardioExercises,
  cardioTotals,
  sessionVolume,
  strengthExercises,
  strengthSetCount,
} from "@/lib/metrics";
import { cn } from "@/lib/utils";
import type { WorkoutSession } from "@/schemas/workouts";

/** セッションの集計（筋トレ／有酸素）。値はすべて session から導出する。 */
export function SessionSummary({ session }: { session: WorkoutSession }) {
  const volume = sessionVolume(session);
  const deltaPct = session.previous
    ? ((volume - session.previous.volumeKg) / session.previous.volumeKg) * 100
    : 0;
  const strength = strengthExercises(session);
  const cardio = cardioExercises(session);
  const cardioT = cardioTotals(session);

  return (
    <>
      <SectionTitle>セッション サマリー</SectionTitle>
      {strength.length === 0 && cardio.length === 0 ? (
        <p className="text-k-fg-dim text-sm">
          種目を追加すると集計が表示されます。
        </p>
      ) : null}

      {strength.length > 0 ? (
        <div className="bg-k-line flex flex-col gap-px overflow-hidden rounded-[10px]">
          <SummaryRow label="筋トレ種目数" value={String(strength.length)} />
          <SummaryRow
            label="総セット数"
            value={String(strengthSetCount(session))}
          />
          <SummaryRow
            label="総挙上量"
            value={`${num(volume)} kg`}
            valueClassName="text-k-accent"
          />
          {session.previous ? (
            <SummaryRow
              label="前回比"
              value={signedPct(deltaPct)}
              valueClassName={
                deltaPct >= 0 ? "text-k-success" : "text-k-danger"
              }
            />
          ) : null}
        </div>
      ) : null}

      {cardio.length > 0 ? (
        <div className="bg-k-line mt-3 flex flex-col gap-px overflow-hidden rounded-[10px]">
          <SummaryRow label="有酸素種目数" value={String(cardio.length)} />
          <SummaryRow label="時間" value={`${num(cardioT.minutes)} 分`} />
          <SummaryRow label="距離" value={`${cardioT.km} km`} />
          <SummaryRow
            label="消費カロリー"
            value={`${num(cardioT.kcal)} kcal`}
            valueClassName="text-k-warn"
          />
        </div>
      ) : null}
    </>
  );
}

function SummaryRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="bg-k-raised flex items-center justify-between px-4 py-3.5">
      <span className="text-k-fg-muted text-[13px]">{label}</span>
      <span className={cn("font-mono text-base", valueClassName)}>{value}</span>
    </div>
  );
}
