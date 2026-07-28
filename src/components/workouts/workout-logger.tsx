import { type QueryKey, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import {
  Card,
  DashedAction,
  MonoLabel,
  Pane,
  Panel,
  SectionTitle,
  SplitBody,
} from "@/components/kirog/console";
import { TagInput } from "@/components/kirog/tag-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Textarea } from "@/components/ui/textarea";
import { AddExercisePanel } from "@/components/workouts/add-exercise-panel";
import { SessionSummary } from "@/components/workouts/session-summary";
import { SessionTopBar } from "@/components/workouts/session-top-bar";
import { useCreateExercise } from "@/hooks/use-create-exercise";
import { useDeleteExercise } from "@/hooks/use-delete-exercise";
import { useSessionLogger } from "@/hooks/use-session-logger";
import { num, timeHm, todayIso } from "@/lib/format";
import { exerciseVolume } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import type { ExerciseRead } from "@/schemas/exercises";
import {
  type ExerciseRecord,
  PB_TAG,
  type SetRecord,
  type WorkoutSession,
} from "@/schemas/workouts";
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
    updateSession,
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
    removeSet.error ??
    updateSession.error;

  return (
    <Panel>
      <SessionTopBar
        session={session}
        isDeleting={removeSession.isPending}
        isConfirming={confirm.isPending}
        onRequestDelete={() =>
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
        onConfirm={() =>
          confirm.mutate(
            { id: session.id, ended_at: nowIso() },
            { onSuccess: () => navigate({ to: "/" }) },
          )
        }
      />

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
          <AddExercisePanel
            master={master}
            exercises={session.exercises}
            search={search}
            onSearchChange={setSearch}
            onAdd={(exercise) => void onAddExercise(exercise)}
            onCreate={(part) => void onCreateAndAdd(part)}
            onRequestDelete={(exercise) =>
              setPendingConfirm({
                title: "種目を削除",
                description: `「${exercise.name}」を削除しますか？`,
                action: () => deleteExercise.mutate(exercise.id),
              })
            }
            isCreating={createExercise.isPending}
            isDeleting={deleteExercise.isPending}
            deleteError={deleteExercise.error}
          />

          <SessionSummary session={session} />

          {session.id ? (
            <SessionMeta
              session={session}
              onChange={(patch) =>
                updateSession.mutate({ id: session.id, ...patch })
              }
            />
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

/**
 * セッションのメタ情報（名前・部位・メモ・タグ）。すべて即時保存で、
 * テキストは入力欄から離れたときに確定する。「PB更新」タグを付けると詳細に 🏆 が出る。
 */
function SessionMeta({
  session,
  onChange,
}: {
  session: WorkoutSession;
  onChange: (patch: {
    title?: string;
    parts?: string[];
    note?: string;
    tags?: string[];
  }) => void;
}) {
  const fieldClass =
    "border-k-line-strong bg-k-well text-k-fg w-full rounded-[10px] border px-3.5 py-2.5 text-[13px] outline-none";

  return (
    <div className="mt-6 flex flex-col gap-3.5">
      <SectionTitle>セッション情報</SectionTitle>

      <div>
        <MonoLabel className="mb-1.5">セッション名</MonoLabel>
        <input
          // セッションが切り替わったら入力欄も作り直す（未確定の値を持ち越さない）。
          key={`${session.id}-title`}
          defaultValue={session.title}
          aria-label="セッション名"
          className={fieldClass}
          onBlur={(event) => {
            const title = event.target.value.trim();
            if (title === "" || title === session.title) {
              event.target.value = session.title;
              return;
            }
            onChange({ title });
          }}
        />
      </div>

      <div>
        <MonoLabel className="mb-1.5">部位</MonoLabel>
        <TagInput
          values={session.parts}
          onChange={(parts) => onChange({ parts })}
          placeholder="＋ 部位"
          label="部位を追加"
        />
      </div>

      <div>
        <MonoLabel className="mb-1.5">タグ</MonoLabel>
        <TagInput
          values={session.tags}
          onChange={(tags) => onChange({ tags })}
          placeholder={`＋ ${PB_TAG} など`}
          label="タグを追加"
        />
      </div>

      <div>
        <MonoLabel className="mb-1.5">メモ</MonoLabel>
        <Textarea
          key={`${session.id}-note`}
          defaultValue={session.note}
          rows={3}
          placeholder="コンディション・気づきなど"
          aria-label="メモ"
          className={cn(fieldClass, "min-h-[76px] resize-y shadow-none")}
          onBlur={(event) => {
            const note = event.target.value;
            if (note === session.note) return;
            onChange({ note });
          }}
        />
      </div>
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
          label={`${label} (${unit})`}
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
            label={`セット ${set.n} の重量 (kg)`}
            value={set.kg}
            step={2.5}
            disabled={!set.id}
            onCommit={(v) => set.id && onEditSet(set.id, { weight_kg: v })}
          />
          <NumCell
            label={`セット ${set.n} のレップ数`}
            value={set.reps}
            step={1}
            disabled={!set.id}
            onCommit={(v) =>
              set.id && onEditSet(set.id, { reps: Math.round(v) })
            }
          />
          <NumCell
            label={`セット ${set.n} の RPE`}
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

/**
 * 数値セル。表示は div ライクだが編集可能。onCommit は blur / Enter で発火。
 * 列見出し（KG / REPS / RPE）は視覚的なものでセルと紐づかないため、
 * label は必須にして読み上げ用の名前を必ず持たせる。
 */
function NumCell({
  label,
  value,
  step,
  disabled,
  muted,
  onCommit,
}: {
  label: string;
  value: number | null;
  step: number;
  disabled?: boolean;
  muted?: boolean;
  onCommit: (value: number) => void;
}) {
  return (
    <input
      type="number"
      aria-label={label}
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
