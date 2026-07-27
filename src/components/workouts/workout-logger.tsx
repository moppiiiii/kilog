import { type QueryKey, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import {
  Card,
  Chip,
  DashedAction,
  Divider,
  Pane,
  Panel,
  PanelTitle,
  SectionTitle,
  SplitBody,
  TopBar,
} from "@/components/kirog/console";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSessionLogger } from "@/hooks/use-session-logger";
import { num, signedPct, stampDate, timeHm, todayIso } from "@/lib/format";
import { exerciseVolume, sessionSetCount, sessionVolume } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import type { ExerciseRead } from "@/schemas/exercises";
import type { ExerciseRecord, WorkoutSession } from "@/schemas/workouts";
import { exercisesQueryOptions } from "@/server/exercises";

// 2A: 記録画面（トレーニング）。当日セッションを作成し、種目・セットを編集して確定する。

const nowIso = () => new Date().toISOString();

// queryKey は購読中のセッションのキャッシュキー。/log/$sessionId から過去セッションを
// 編集するとき、楽観更新を正しいキャッシュへ当てるために渡す（既定は当日セッション）。
// セッションが無くても記録UIをそのまま出し、最初の種目追加時にセッションを自動生成する
// （食事・体重と同じく「着地して即記録」に揃える）。
export function WorkoutLogger({
  session,
  queryKey,
}: {
  session: WorkoutSession;
  queryKey?: QueryKey;
}) {
  const navigate = useNavigate();
  const {
    create,
    addExercise,
    addSet,
    updateSet,
    removeSet,
    confirm,
    removeExercise,
    removeSession,
  } = useSessionLogger(queryKey);
  const { data: master = [] } = useQuery(exercisesQueryOptions());
  const [openId, setOpenId] = useState(session.exercises[0]?.id ?? "");
  const [search, setSearch] = useState("");

  const volume = sessionVolume(session);
  const deltaPct = session.previous
    ? ((volume - session.previous.volumeKg) / session.previous.volumeKg) * 100
    : 0;

  const usedIds = new Set(session.exercises.map((exercise) => exercise.id));
  const candidates = master
    .filter((exercise) => !usedIds.has(exercise.id))
    .filter(
      (exercise) =>
        search === "" ||
        exercise.name.includes(search) ||
        exercise.part.includes(search),
    );

  const onAddExercise = async (exercise: ExerciseRead) => {
    // セッションがまだ無ければ、最初の種目追加のタイミングで自動生成する。
    let sessionId = session.id;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      const startedAt = nowIso();
      // 開始時刻を名前に付けて同日複数セッションを区別する（例: セッション 8:30）。
      await create.mutateAsync({
        id: sessionId,
        date: todayIso(),
        title: `セッション ${timeHm(startedAt)}`,
        parts: [],
        started_at: startedAt,
      });
    }
    addExercise.mutate({
      id: crypto.randomUUID(),
      session_id: sessionId,
      exercise_id: exercise.id,
      position: session.exercises.length,
    });
    setSearch("");
    setOpenId(exercise.id);
  };

  const onAddSet = (exercise: ExerciseRecord) => {
    if (!exercise.sessionExerciseId) return;
    const last = exercise.sets.at(-1);
    addSet.mutate({
      id: crypto.randomUUID(),
      session_exercise_id: exercise.sessionExerciseId,
      set_no: (last?.n ?? 0) + 1,
      weight_kg: last?.kg ?? 0,
      reps: last?.reps ?? 0,
      rpe: null,
      rest_sec: null,
      done: false,
    });
  };

  return (
    <Panel>
      <TopBar>
        <PanelTitle sub={session.id ? session.title : undefined}>
          トレーニングを記録
        </PanelTitle>
        <div className="flex items-center gap-3.5">
          <Link
            to="/log/copy"
            className="text-k-fg-dim hover:text-k-fg text-xs"
          >
            ↺ 前回コピー
          </Link>
          <Link
            to="/log/timer"
            className="text-k-fg-dim hover:text-k-fg text-xs"
          >
            ⏱ 休憩タイマー
          </Link>
          <div className="border-k-line bg-k-raised text-k-fg-sub flex items-center gap-2 rounded-[9px] border px-3.5 py-1.5 font-mono text-[13px]">
            <span className="text-k-accent">◂</span>
            {stampDate(session.id ? session.date : todayIso())}
            <span className="text-k-accent">▸</span>
          </div>
          {session.id ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-k-fg-dim hover:text-k-danger rounded-[9px]"
                disabled={removeSession.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      "このセッションを削除しますか？種目とセットもすべて削除されます。",
                    )
                  ) {
                    removeSession.mutate(session.id, {
                      onSuccess: () => navigate({ to: "/" }),
                    });
                  }
                }}
              >
                削除
              </Button>
              <Button
                size="sm"
                className="rounded-[9px] font-bold"
                disabled={confirm.isPending}
                onClick={() =>
                  confirm.mutate(
                    { id: session.id, ended_at: nowIso() },
                    { onSuccess: () => navigate({ to: "/" }) },
                  )
                }
              >
                記録を確定
              </Button>
            </>
          ) : null}
        </div>
      </TopBar>

      <SplitBody className="lg:[grid-template-columns:1.55fr_1fr]">
        <Pane>
          {session.exercises.length === 0 ? (
            <p className="text-k-fg-dim py-8 text-center text-sm">
              右のリストから種目を追加してください。
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {session.exercises.map((exercise) =>
                exercise.id === openId ? (
                  <OpenExercise
                    key={exercise.id}
                    exercise={exercise}
                    onToggleDone={(setId, done) =>
                      updateSet.mutate({ id: setId, done })
                    }
                    onEditSet={(setId, patch) =>
                      updateSet.mutate({ id: setId, ...patch })
                    }
                    onRemoveSet={(setId) => removeSet.mutate(setId)}
                    onAddSet={() => onAddSet(exercise)}
                    onRemoveExercise={() =>
                      exercise.sessionExerciseId &&
                      removeExercise.mutate(exercise.sessionExerciseId)
                    }
                  />
                ) : (
                  <ClosedExercise
                    key={exercise.id}
                    exercise={exercise}
                    onOpen={() => setOpenId(exercise.id)}
                  />
                ),
              )}
            </div>
          )}
        </Pane>

        <Pane>
          <SectionTitle>種目を検索して追加</SectionTitle>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="種目名・部位で検索"
            aria-label="種目を検索"
            className="mb-4"
          />
          <div className="mb-6 flex flex-wrap gap-2">
            {candidates.slice(0, 10).map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => void onAddExercise(exercise)}
                aria-label={`${exercise.name} を追加`}
              >
                <Chip>＋ {exercise.name}</Chip>
              </button>
            ))}
            {candidates.length === 0 ? (
              <span className="text-k-fg-faint text-xs">候補なし</span>
            ) : null}
          </div>

          <Divider className="mb-6" />

          <SectionTitle>セッション サマリー</SectionTitle>
          <div className="bg-k-line flex flex-col gap-px overflow-hidden rounded-[10px]">
            <SummaryRow
              label="種目数"
              value={String(session.exercises.length)}
            />
            <SummaryRow
              label="総セット数"
              value={String(sessionSetCount(session))}
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
        </Pane>
      </SplitBody>
    </Panel>
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

function OpenExercise({
  exercise,
  onToggleDone,
  onEditSet,
  onRemoveSet,
  onAddSet,
  onRemoveExercise,
}: {
  exercise: ExerciseRecord;
  onToggleDone: (setId: string, done: boolean) => void;
  onEditSet: (
    setId: string,
    patch: { weight_kg?: number; reps?: number; rpe?: number | null },
  ) => void;
  onRemoveSet: (setId: string) => void;
  onAddSet: () => void;
  onRemoveExercise: () => void;
}) {
  return (
    <Card active>
      <div className="border-k-line flex items-center gap-3 border-b px-[18px] py-4">
        <span className="bg-k-accent size-[7px] rounded-full" />
        <span className="flex-1 text-[15px] font-bold">{exercise.name}</span>
        {exercise.previousTop ? (
          <span className="text-k-fg-dim font-mono text-xs">
            前回 <span className="text-k-fg-sub">{exercise.previousTop}</span>
          </span>
        ) : null}
        <button
          type="button"
          onClick={onRemoveExercise}
          disabled={!exercise.sessionExerciseId}
          aria-label={`${exercise.name} を削除`}
          className="text-k-fg-faint hover:text-k-danger flex size-7 items-center justify-center rounded-lg text-sm transition-colors disabled:opacity-40"
        >
          ✕
        </button>
      </div>

      <div className="text-k-fg-faint grid grid-cols-[52px_1fr_1fr_1fr_44px] gap-2.5 px-[18px] py-2.5 font-mono text-[11px] tracking-[0.5px]">
        <div>SET</div>
        <div>KG</div>
        <div>REPS</div>
        <div>RPE</div>
        <div />
      </div>

      {exercise.sets.map((set) => (
        <div
          key={set.id ?? set.n}
          className="grid grid-cols-[52px_1fr_1fr_1fr_44px] items-center gap-2.5 px-[18px] pb-2.5"
        >
          <div className="text-k-fg-dim font-mono text-sm">{set.n}</div>
          <NumCell
            value={set.kg}
            step={2.5}
            disabled={!set.id}
            onCommit={(v) => set.id && onEditSet(set.id, { weight_kg: v })}
          />
          <NumCell
            value={set.reps}
            step={1}
            disabled={!set.id}
            onCommit={(v) =>
              set.id && onEditSet(set.id, { reps: Math.round(v) })
            }
          />
          <NumCell
            value={set.rpe}
            step={0.5}
            disabled={!set.id}
            muted
            onCommit={(v) =>
              set.id && onEditSet(set.id, { rpe: Number.isNaN(v) ? null : v })
            }
          />
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => set.id && onToggleDone(set.id, !set.done)}
              disabled={!set.id}
              aria-pressed={set.done}
              aria-label={`セット ${set.n} を完了にする`}
              className={cn(
                "flex size-[30px] items-center justify-center rounded-lg text-[13px] transition-colors",
                set.done
                  ? "bg-k-success-bg text-k-success"
                  : "bg-k-chip text-k-fg-faint",
              )}
            >
              ✓
            </button>
            <button
              type="button"
              onClick={() => set.id && onRemoveSet(set.id)}
              disabled={!set.id}
              aria-label={`セット ${set.n} を削除`}
              className="text-k-fg-faint hover:text-k-danger text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      ))}

      <div className="px-[18px] pt-1.5 pb-4">
        <DashedAction
          className="rounded-[9px] p-2.5 text-xs"
          onClick={onAddSet}
        >
          ＋ セットを追加
        </DashedAction>
      </div>
    </Card>
  );
}

/** 数値セル。表示は div ライクだが編集可能。onCommit は blur / Enter で発火。 */
function NumCell({
  value,
  step,
  disabled,
  muted,
  onCommit,
}: {
  value: number | null;
  step: number;
  disabled?: boolean;
  muted?: boolean;
  onCommit: (value: number) => void;
}) {
  return (
    <input
      type="number"
      step={step}
      inputMode="decimal"
      disabled={disabled}
      defaultValue={value ?? ""}
      onBlur={(e) => {
        if (e.target.value === "") {
          onCommit(Number.NaN);
          return;
        }
        onCommit(Number(e.target.value));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className={cn(
        "border-k-line-strong bg-k-well w-full rounded-lg border px-3 py-2.5 font-mono text-sm",
        muted && "text-k-fg-muted",
      )}
    />
  );
}

function ClosedExercise({
  exercise,
  onOpen,
}: {
  exercise: ExerciseRecord;
  onOpen: () => void;
}) {
  const topReps = exercise.sets[0]?.reps ?? 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="border-k-line bg-k-panel hover:border-k-accent-edge flex items-center gap-3 rounded-xl border px-[18px] py-3.5 text-left transition-colors"
    >
      <span className="bg-k-success size-[7px] shrink-0 rounded-full" />
      <span className="flex-1 truncate text-sm font-medium">
        {exercise.name}
      </span>
      <span className="text-k-fg-sub font-mono text-[13px]">
        {exercise.sets.length}×{topReps}
      </span>
      <span className="text-k-fg-dim w-20 text-right font-mono text-xs">
        {num(exerciseVolume(exercise))}kg
      </span>
    </button>
  );
}
