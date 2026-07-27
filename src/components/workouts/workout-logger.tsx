import { type QueryKey, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import {
  Card,
  Chip,
  DashedAction,
  Pane,
  Panel,
  PanelTitle,
  SectionTitle,
  SplitBody,
  TopBar,
} from "@/components/kirog/console";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { useCreateExercise } from "@/hooks/use-create-exercise";
import { useDeleteExercise } from "@/hooks/use-delete-exercise";
import { useSessionLogger } from "@/hooks/use-session-logger";
import { num, signedPct, stampDate, timeHm, todayIso } from "@/lib/format";
import {
  cardioExercises,
  cardioTotals,
  exerciseVolume,
  sessionVolume,
  strengthExercises,
  strengthSetCount,
} from "@/lib/metrics";
import { cn } from "@/lib/utils";
import type { ExerciseRead } from "@/schemas/exercises";
import type {
  ExerciseRecord,
  SetRecord,
  WorkoutSession,
} from "@/schemas/workouts";
import { exercisesQueryOptions } from "@/server/exercises";

// 2A: 記録画面（トレーニング）。当日セッションを作成し、種目・セットを編集して確定する。

const nowIso = () => new Date().toISOString();

// カスタム種目を新規作成するときの部位候補。
const EXERCISE_PARTS = [
  "胸",
  "背中",
  "肩",
  "腕",
  "脚",
  "体幹",
  "有酸素",
  "その他",
] as const;

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
  const createExercise = useCreateExercise();
  const deleteExercise = useDeleteExercise();
  const { data: master = [] } = useQuery(exercisesQueryOptions());
  const [openId, setOpenId] = useState(session.exercises[0]?.id ?? "");
  const [search, setSearch] = useState("");
  // 確認ダイアログの保留アクション（削除など）。null=閉じている。
  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string;
    description: string;
    action: () => void;
  } | null>(null);

  const volume = sessionVolume(session);
  const deltaPct = session.previous
    ? ((volume - session.previous.volumeKg) / session.previous.volumeKg) * 100
    : 0;
  const strength = strengthExercises(session);
  const cardio = cardioExercises(session);
  const cardioT = cardioTotals(session);

  const usedIds = new Set(session.exercises.map((exercise) => exercise.id));
  const candidates = master
    .filter((exercise) => !usedIds.has(exercise.id))
    .filter(
      (exercise) =>
        search === "" ||
        exercise.name.includes(search) ||
        exercise.part.includes(search),
    );

  const exactMatch = master.some((e) => e.name === search.trim());

  // 種目をセッションへ追加する（必要なら当日セッションを自動生成）。
  // 有酸素は「時間/距離/カロリー」1エントリを自動で用意する（セット表ではないため）。
  const addToSession = async (exerciseId: string, isCardio: boolean) => {
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
    const sessionExerciseId = crypto.randomUUID();
    await addExercise.mutateAsync({
      id: sessionExerciseId,
      session_id: sessionId,
      exercise_id: exerciseId,
      position: session.exercises.length,
    });
    if (isCardio) {
      addSet.mutate({
        id: crypto.randomUUID(),
        session_exercise_id: sessionExerciseId,
        set_no: 1,
        weight_kg: 0,
        reps: 0,
        rpe: null,
        rest_sec: null,
        done: false,
        duration_min: null,
        distance_km: null,
        kcal: null,
      });
    }
    setSearch("");
    setOpenId(exerciseId);
  };

  const onAddExercise = (exercise: ExerciseRead) =>
    addToSession(exercise.id, exercise.is_cardio);

  // 候補に無い種目を、その場で本人用カスタム種目として作成してセッションへ追加する。
  // 部位が「有酸素」なら is_cardio を立てる。
  const onCreateAndAdd = async (part: string) => {
    const name = search.trim();
    if (!name) return;
    const id = crypto.randomUUID();
    const isCardio = part === "有酸素";
    await createExercise.mutateAsync({
      id,
      name,
      part,
      is_bodyweight: false,
      is_cardio: isCardio,
    });
    await addToSession(id, isCardio);
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
      duration_min: null,
      distance_km: null,
      kcal: null,
    });
  };

  // 記録の書き込みエラーを 1 か所で表示する（握り潰さず原因を見えるように）。
  const writeError =
    create.error ??
    addExercise.error ??
    addSet.error ??
    updateSet.error ??
    removeSet.error;

  return (
    <Panel>
      <TopBar>
        <PanelTitle sub={session.id ? session.title : undefined}>
          トレーニングを記録
        </PanelTitle>
        <div className="flex flex-wrap items-center justify-end gap-2.5">
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
                onClick={() =>
                  setPendingConfirm({
                    title: "セッションを削除",
                    description:
                      "このセッションを削除しますか？種目とセットもすべて削除されます。",
                    action: () =>
                      removeSession.mutate(session.id, {
                        onSuccess: () => navigate({ to: "/" }),
                      }),
                  })
                }
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

      {writeError ? (
        <div
          role="alert"
          className="border-k-danger/40 bg-k-danger/10 text-k-danger mx-[26px] mt-4 rounded-[10px] border px-3.5 py-3 text-[13px]"
        >
          記録の保存に失敗しました: {writeError.message}
        </div>
      ) : null}

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
                    isCardio={
                      master.find((e) => e.id === exercise.id)?.is_cardio ??
                      false
                    }
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
          {deleteExercise.isError ? (
            <p className="text-k-danger mb-3 text-xs" role="alert">
              種目を削除できませんでした: {deleteExercise.error.message}
            </p>
          ) : null}
          {/* 検索して候補から追加。末尾に「新規作成」。 */}
          {search.trim() ? (
            <div className="border-k-line divide-k-line-soft mb-6 max-h-[280px] divide-y overflow-y-auto rounded-xl border">
              {candidates.map((exercise) => (
                <div
                  key={exercise.id}
                  className="hover:bg-k-raised flex items-center transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => void onAddExercise(exercise)}
                    aria-label={`${exercise.name} を追加`}
                    className="flex flex-1 items-center gap-2.5 px-3.5 py-2.5 text-left"
                  >
                    <span className="text-k-accent-soft">＋</span>
                    <span className="flex-1 truncate text-[13px]">
                      {exercise.name}
                    </span>
                    <span className="text-k-fg-dim font-mono text-[11px]">
                      {exercise.part}
                    </span>
                  </button>
                  {/* 本人が作ったカスタム種目だけ削除できる（共通マスタは owner_id=null）。 */}
                  {exercise.owner_id !== null ? (
                    <button
                      type="button"
                      disabled={deleteExercise.isPending}
                      onClick={() =>
                        setPendingConfirm({
                          title: "種目を削除",
                          description: `「${exercise.name}」を削除しますか？`,
                          action: () => deleteExercise.mutate(exercise.id),
                        })
                      }
                      aria-label={`${exercise.name} を削除`}
                      className="text-k-fg-faint hover:text-k-danger px-3 py-2.5 text-xs"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              ))}

              {!exactMatch ? (
                <div className="bg-k-well/40 p-3.5">
                  <div className="text-k-fg-dim mb-2.5 text-xs">
                    「
                    <span className="text-k-fg font-medium">
                      {search.trim()}
                    </span>
                    」を新規作成 — 部位を選択
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {EXERCISE_PARTS.map((part) => (
                      <button
                        key={part}
                        type="button"
                        disabled={createExercise.isPending}
                        onClick={() => void onCreateAndAdd(part)}
                        aria-label={`${search.trim()} を ${part} として作成`}
                      >
                        <Chip>＋ {part}</Chip>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-k-fg-faint mb-6 text-xs">
              種目名を入力して検索・追加できます
            </p>
          )}

          <SectionTitle>セッション サマリー</SectionTitle>
          {strength.length === 0 && cardio.length === 0 ? (
            <p className="text-k-fg-dim text-sm">
              種目を追加すると集計が表示されます。
            </p>
          ) : null}

          {strength.length > 0 ? (
            <div className="bg-k-line flex flex-col gap-px overflow-hidden rounded-[10px]">
              <SummaryRow
                label="筋トレ種目数"
                value={String(strength.length)}
              />
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
        </Pane>
      </SplitBody>

      <ConfirmDialog
        open={pendingConfirm !== null}
        title={pendingConfirm?.title ?? ""}
        description={pendingConfirm?.description ?? ""}
        onConfirm={() => pendingConfirm?.action()}
        onCancel={() => setPendingConfirm(null)}
      />
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

type EditSetPatch = {
  weight_kg?: number;
  reps?: number;
  rpe?: number | null;
  duration_min?: number | null;
  distance_km?: number | null;
  kcal?: number | null;
};

function OpenExercise({
  exercise,
  isCardio,
  onToggleDone,
  onEditSet,
  onRemoveSet,
  onAddSet,
  onRemoveExercise,
}: {
  exercise: ExerciseRecord;
  isCardio: boolean;
  onToggleDone: (setId: string, done: boolean) => void;
  onEditSet: (setId: string, patch: EditSetPatch) => void;
  onRemoveSet: (setId: string) => void;
  onAddSet: () => void;
  onRemoveExercise: () => void;
}) {
  return (
    <Card active>
      <div className="border-k-line flex items-center gap-3 border-b px-[18px] py-4">
        <span className="bg-k-accent size-[7px] rounded-full" />
        <span className="flex-1 text-[15px] font-bold">{exercise.name}</span>
        {!isCardio && exercise.previousTop ? (
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

      {isCardio ? (
        <CardioEntry set={exercise.sets[0]} onEditSet={onEditSet} />
      ) : (
        <StrengthSets
          exercise={exercise}
          onToggleDone={onToggleDone}
          onEditSet={onEditSet}
          onRemoveSet={onRemoveSet}
          onAddSet={onAddSet}
        />
      )}
    </Card>
  );
}

/** 有酸素の記録エントリ（時間・距離・カロリーの 1 行）。 */
function CardioEntry({
  set,
  onEditSet,
}: {
  set: SetRecord | undefined;
  onEditSet: (setId: string, patch: EditSetPatch) => void;
}) {
  // 行が来る前でも入力欄は表示する（無効状態）。id が入った瞬間に編集可能になる。
  const id = set?.id;
  return (
    <div className="grid grid-cols-3 gap-3 px-[18px] py-4">
      <CardioField
        label="時間"
        unit="分"
        value={set?.durationMin ?? null}
        step={1}
        disabled={!id}
        onCommit={(v) =>
          id && onEditSet(id, { duration_min: Number.isNaN(v) ? null : v })
        }
      />
      <CardioField
        label="距離"
        unit="km"
        value={set?.distanceKm ?? null}
        step={0.1}
        disabled={!id}
        onCommit={(v) =>
          id && onEditSet(id, { distance_km: Number.isNaN(v) ? null : v })
        }
      />
      <CardioField
        label="カロリー"
        unit="kcal"
        value={set?.kcal ?? null}
        step={10}
        disabled={!id}
        onCommit={(v) =>
          id && onEditSet(id, { kcal: Number.isNaN(v) ? null : Math.round(v) })
        }
      />
    </div>
  );
}

function CardioField({
  label,
  unit,
  value,
  step,
  disabled,
  onCommit,
}: {
  label: string;
  unit: string;
  value: number | null;
  step: number;
  disabled?: boolean;
  onCommit: (value: number) => void;
}) {
  return (
    <div>
      <div className="text-k-fg-faint mb-1.5 font-mono text-[11px] tracking-[0.5px]">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <NumCell
          value={value}
          step={step}
          disabled={disabled}
          onCommit={onCommit}
        />
        <span className="text-k-fg-dim text-[11px]">{unit}</span>
      </div>
    </div>
  );
}

/** 筋トレのセット表（重量×レップ＋RPE＋完了）。 */
function StrengthSets({
  exercise,
  onToggleDone,
  onEditSet,
  onRemoveSet,
  onAddSet,
}: {
  exercise: ExerciseRecord;
  onToggleDone: (setId: string, done: boolean) => void;
  onEditSet: (setId: string, patch: EditSetPatch) => void;
  onRemoveSet: (setId: string) => void;
  onAddSet: () => void;
}) {
  return (
    <>
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
    </>
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
  const cardioSet = exercise.sets[0];

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
      {exercise.isCardio ? (
        <span className="text-k-fg-sub font-mono text-[13px]">
          {cardioSet?.durationMin != null
            ? `${num(cardioSet.durationMin)}分`
            : "—"}
          {cardioSet?.distanceKm != null ? ` · ${cardioSet.distanceKm}km` : ""}
        </span>
      ) : (
        <>
          <span className="text-k-fg-sub font-mono text-[13px]">
            {exercise.sets.length}×{topReps}
          </span>
          <span className="text-k-fg-dim w-20 text-right font-mono text-xs">
            {num(exerciseVolume(exercise))}kg
          </span>
        </>
      )}
    </button>
  );
}
