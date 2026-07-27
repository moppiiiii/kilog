import { Link } from "@tanstack/react-router";

import {
  Badge,
  Bars,
  Card,
  Divider,
  MonoLabel,
  Pane,
  Panel,
  SectionTitle,
  SplitBody,
  TopBar,
} from "@/components/kirog/console";
import { Button } from "@/components/ui/button";
import { clock, kg, num, signed, stampDate } from "@/lib/format";
import {
  exerciseVolume,
  sessionAvgRpe,
  sessionRepCount,
  sessionSetCount,
  sessionVolume,
  setVolume,
  topSet,
} from "@/lib/metrics";
import { cn } from "@/lib/utils";
import type { WorkoutSession } from "@/schemas/workouts";

// 4A: 詳細画面。セッションの中身とその日の前回比。

export function SessionDetail({ session }: { session: WorkoutSession }) {
  const volume = sessionVolume(session);
  const setCount = sessionSetCount(session);
  const repCount = sessionRepCount(session);
  const prev = session.previous;
  const volumeDeltaPct = prev
    ? ((volume - prev.volumeKg) / prev.volumeKg) * 100
    : 0;
  const maxVolume = Math.max(
    ...session.exercises.map((exercise) => exerciseVolume(exercise)),
  );

  return (
    <Panel>
      <TopBar>
        <div className="flex items-center gap-3.5">
          <Link
            to="/history"
            search={{ kind: "all", period: "month", page: 1 }}
            className="text-k-fg-dim hover:text-k-fg flex items-center gap-2 text-[13px]"
          >
            <span className="text-k-accent">◂</span> 一覧に戻る
          </Link>
          <span className="bg-k-edge h-4 w-px" />
          <span className="text-k-fg-muted font-mono text-[13px]">
            {stampDate(session.date)} · {session.startTime}–{session.endTime}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="rounded-[9px]"
          >
            <Link to="/log/copy">複製して記録</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="bg-k-chip rounded-[9px]"
          >
            <Link to="/log/$sessionId" params={{ sessionId: session.id }}>
              編集
            </Link>
          </Button>
        </div>
      </TopBar>

      <div className="border-k-line border-b p-[26px]">
        <div className="mb-4.5 flex flex-wrap items-center gap-3">
          <span className="bg-k-success size-2.5 rounded-full" />
          <h1 className="text-2xl font-black">{session.title}</h1>
          <Badge>{session.parts.join(" · ")}</Badge>
          {session.personalBest ? (
            <Badge tone="success" className="ml-auto px-3 py-1.5 text-xs">
              🏆 自己ベスト更新
            </Badge>
          ) : null}
        </div>

        <div className="bg-k-line grid grid-cols-2 gap-px overflow-hidden rounded-xl md:grid-cols-5">
          <DetailKpi
            label="総挙上量"
            value={num(volume)}
            unit="kg"
            foot={prev ? `前回比 ${signed(volumeDeltaPct)}%` : "—"}
            footClassName={
              volumeDeltaPct >= 0 ? "text-k-success" : "text-k-danger"
            }
          />
          <DetailKpi
            label="種目数"
            value={String(session.exercises.length)}
            foot={`${setCount} セット`}
          />
          <DetailKpi
            label="総レップ"
            value={String(repCount)}
            foot={`平均 ${(repCount / setCount).toFixed(1)} reps`}
          />
          <DetailKpi
            label="時間"
            value={String(session.durationMin)}
            unit="min"
            foot={`休憩 平均 ${clock(session.avgRestSec)}`}
          />
          <DetailKpi
            label="平均RPE"
            value={sessionAvgRpe(session).toFixed(1)}
            foot="高強度"
            footClassName="text-k-danger"
          />
        </div>
      </div>

      <SplitBody className="lg:[grid-template-columns:1.55fr_1fr]">
        <Pane>
          <SectionTitle>種目ごとの記録</SectionTitle>
          <div className="flex flex-col gap-3.5">
            {session.exercises.map((exercise) => {
              const top = topSet(exercise);
              return (
                <Card key={exercise.id}>
                  <div className="border-k-line flex items-center gap-3 border-b px-[18px] py-3.5">
                    <span className="flex-1 text-[15px] font-bold">
                      {exercise.name}
                    </span>
                    <span className="text-k-fg-dim font-mono text-xs">
                      最大{" "}
                      <span className="text-k-accent">
                        {top ? `${kg(top.kg)}kg×${top.reps}` : "—"}
                      </span>
                    </span>
                    <span className="text-k-fg-dim font-mono text-xs">
                      {num(exerciseVolume(exercise))}kg
                    </span>
                  </div>

                  <div className="text-k-fg-faint grid grid-cols-[40px_1fr_1fr_1fr_1fr] gap-2.5 px-[18px] py-2.5 font-mono text-[10px]">
                    <div>SET</div>
                    <div>KG</div>
                    <div>REPS</div>
                    <div>RPE</div>
                    <div>VOL</div>
                  </div>

                  {exercise.sets.map((set) => (
                    <div
                      key={set.n}
                      className="grid grid-cols-[40px_1fr_1fr_1fr_1fr] items-center gap-2.5 px-[18px] pb-2 font-mono text-[13px]"
                    >
                      <div className="text-k-fg-dim">{set.n}</div>
                      <div>{kg(set.kg)}</div>
                      <div>{set.reps}</div>
                      <div className="text-k-fg-muted">{set.rpe ?? "—"}</div>
                      <div className="text-k-fg-dim">{num(setVolume(set))}</div>
                    </div>
                  ))}
                  <div className="h-2" />
                </Card>
              );
            })}
          </div>
        </Pane>

        <Pane className="flex flex-col gap-5.5">
          <div>
            <SectionTitle>このセッションの挙上量推移</SectionTitle>
            <Bars
              className="h-[120px]"
              gapClassName="gap-2"
              bars={session.exercises.map((exercise) => ({
                height: (exerciseVolume(exercise) / maxVolume) * 100,
                className:
                  "bg-[linear-gradient(180deg,#5b8bff,#2f4dad)] rounded-t-[4px]",
              }))}
            />
            <div className="mt-2 flex gap-2">
              {session.exercises.map((exercise) => (
                <div
                  key={exercise.id}
                  className="text-k-fg-faint flex-1 truncate text-center font-mono text-[9px]"
                >
                  {exercise.name}
                </div>
              ))}
            </div>
          </div>

          <Divider />

          {prev ? (
            <div>
              <SectionTitle>前回セッションとの比較</SectionTitle>
              <div className="bg-k-line flex flex-col gap-px overflow-hidden rounded-[10px]">
                <CompareRow
                  label="総挙上量"
                  from={num(prev.volumeKg)}
                  to={num(volume)}
                  delta={signed(volume - prev.volumeKg, 0)}
                  positive={volume >= prev.volumeKg}
                />
                <CompareRow
                  label="トップセット"
                  from={kg(prev.topSetKg)}
                  to={kg(
                    Math.max(
                      ...session.exercises.flatMap((exercise) =>
                        exercise.sets.map((set) => set.kg),
                      ),
                    ),
                  )}
                  delta={`${signed(
                    Math.max(
                      ...session.exercises.flatMap((exercise) =>
                        exercise.sets.map((set) => set.kg),
                      ),
                    ) - prev.topSetKg,
                  )}kg`}
                  positive
                />
                <CompareRow
                  label="時間"
                  from={String(prev.durationMin)}
                  to={String(session.durationMin)}
                  delta={`${signed(session.durationMin - prev.durationMin, 0)}min`}
                  positive={session.durationMin <= prev.durationMin}
                />
              </div>
            </div>
          ) : null}

          <Divider />

          <div>
            <SectionTitle>メモ</SectionTitle>
            <div className="border-k-line bg-k-raised text-k-fg-sub rounded-xl border p-4 text-[13px] leading-[1.7]">
              {session.note}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {session.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-k-chip text-k-fg-sub rounded-2xl px-3 py-1 text-[11px]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </Pane>
      </SplitBody>
    </Panel>
  );
}

function DetailKpi({
  label,
  value,
  unit,
  foot,
  footClassName,
}: {
  label: string;
  value: string;
  unit?: string;
  foot: string;
  footClassName?: string;
}) {
  return (
    <div className="bg-k-raised px-[18px] py-4">
      <MonoLabel>{label}</MonoLabel>
      <div className="mt-1.5 font-mono text-2xl">
        {value}
        {unit ? <span className="text-k-fg-dim text-xs">{unit}</span> : null}
      </div>
      <div className={cn("text-k-fg-dim mt-0.5 text-[11px]", footClassName)}>
        {foot}
      </div>
    </div>
  );
}

function CompareRow({
  label,
  from,
  to,
  delta,
  positive,
}: {
  label: string;
  from: string;
  to: string;
  delta: string;
  positive: boolean;
}) {
  return (
    <div className="bg-k-raised flex items-center justify-between px-4 py-3 text-[13px]">
      <span className="text-k-fg-muted">{label}</span>
      <span className="font-mono">
        {from} → <span className="text-k-fg">{to}</span>{" "}
        <span className={positive ? "text-k-success" : "text-k-danger"}>
          {delta}
        </span>
      </span>
    </div>
  );
}
