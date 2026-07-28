import { Link } from "@tanstack/react-router";

import {
  HintCard,
  MonoLabel,
  Pane,
  SectionTitle,
} from "@/components/kirog/console";
import { TagInput } from "@/components/kirog/tag-input";
import { MENU_ICONS } from "@/components/menus/menu-icons";
import { cn } from "@/lib/utils";
import type { ExerciseRead } from "@/schemas/exercises";
import type { MenuExercise, WorkoutMenu } from "@/schemas/menus";

/** メニュー本体の部分更新（名前・アイコン・部位タグ）。 */
type MenuPatch = { name?: string; icon?: string; parts?: string[] };

/** メニュー内 1 種目の既定値の部分更新。 */
type ExercisePatch = {
  target_sets?: number;
  target_reps?: number;
  rest_sec?: number;
};

/** 右ペイン：選択中メニューの編集フォーム。すべて即時保存。 */
export function MenuDetailPane({
  menu,
  exercises,
  search,
  onSearchChange,
  onPatch,
  onAddExercise,
  onUpdateExercise,
  onRemoveExercise,
}: {
  menu: WorkoutMenu;
  exercises: ExerciseRead[];
  search: string;
  onSearchChange: (value: string) => void;
  onPatch: (patch: MenuPatch) => void;
  onAddExercise: (exerciseId: string) => void;
  onUpdateExercise: (rowId: string, patch: ExercisePatch) => void;
  onRemoveExercise: (rowId: string) => void;
}) {
  const usedExerciseIds = new Set(menu.exercises.map((e) => e.id));
  const candidates = exercises
    .filter(
      (exercise) =>
        !usedExerciseIds.has(exercise.id) &&
        search !== "" &&
        (exercise.name.includes(search) || exercise.part.includes(search)),
    )
    .slice(0, 6);

  return (
    <Pane>
      <div className="mb-5.5 flex flex-wrap gap-3.5">
        <div className="min-w-[240px] flex-1">
          <MonoLabel className="mb-1.5">メニュー名</MonoLabel>
          <input
            // メニューを切り替えたら入力欄も作り直す（未保存の値を持ち越さない）。
            key={menu.id}
            defaultValue={menu.name}
            aria-label="メニュー名"
            onBlur={(event) => {
              const name = event.target.value.trim();
              if (name === "" || name === menu.name) {
                event.target.value = menu.name;
                return;
              }
              onPatch({ name });
            }}
            className="border-k-accent-edge bg-k-raised text-k-fg w-full rounded-[10px] border px-4 py-3 text-base font-semibold outline-none"
          />
        </div>
        <div className="w-[190px]">
          <MonoLabel className="mb-1.5">アイコン</MonoLabel>
          <div className="flex gap-1.5">
            {MENU_ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                aria-label={`アイコンを ${icon} にする`}
                aria-pressed={icon === menu.icon}
                onClick={() => onPatch({ icon })}
                className={cn(
                  "flex-1 rounded-[10px] border p-3 text-center text-base transition-opacity",
                  icon === menu.icon
                    ? "border-k-accent-edge bg-k-accent-bg"
                    : "border-k-line-strong bg-k-raised opacity-50 hover:opacity-100",
                )}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-5.5 flex flex-wrap items-center gap-2.5">
        <span className="text-k-fg-dim text-xs">部位タグ</span>
        <TagInput
          values={menu.parts}
          onChange={(parts) => onPatch({ parts })}
          placeholder="＋ 部位"
          label="部位タグを追加"
        />
      </div>

      <SectionTitle
        right={
          <span className="text-k-fg-dim font-mono text-xs">
            {menu.exercises.length}種目
          </span>
        }
      >
        種目とデフォルト設定
      </SectionTitle>

      <div className="flex flex-col gap-2.5">
        {menu.exercises.map((exercise) => (
          <MenuExerciseRow
            key={exercise.rowId}
            exercise={exercise}
            onChange={(patchValue) =>
              onUpdateExercise(exercise.rowId, patchValue)
            }
            onRemove={() => onRemoveExercise(exercise.rowId)}
          />
        ))}
        {menu.exercises.length === 0 ? (
          <p className="text-k-fg-dim py-2 text-[13px]">
            まだ種目がありません。下の検索から追加してください。
          </p>
        ) : null}
      </div>

      <div className="border-k-line-strong bg-k-raised mt-3.5 rounded-[10px] border px-4 py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-k-fg-faint">⌕</span>
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="種目を検索して追加"
            aria-label="種目を検索して追加"
            className="text-k-fg placeholder:text-k-fg-faint min-w-0 flex-1 bg-transparent text-[13px] outline-none"
          />
          <span className="text-k-fg-faint font-mono text-[11px]">
            3 set / 10 rep / 1:30 を初期値で追加
          </span>
        </div>

        {candidates.length > 0 ? (
          <div className="mt-3 flex flex-col gap-1.5">
            {candidates.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => onAddExercise(exercise.id)}
                className="border-k-line bg-k-panel hover:border-k-accent-edge flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors"
              >
                <span className="flex-1 truncate text-[13px]">
                  {exercise.name}
                </span>
                <span className="text-k-fg-dim text-[11px]">
                  {exercise.part}
                </span>
                <span className="text-k-accent-soft text-sm">＋</span>
              </button>
            ))}
          </div>
        ) : null}
        {search !== "" && candidates.length === 0 ? (
          <p className="text-k-fg-dim mt-3 text-[13px]">
            該当する種目がありません（記録画面から新しい種目を作れます）
          </p>
        ) : null}
      </div>

      <HintCard className="mt-5 flex flex-wrap items-center gap-3">
        <span className="text-lg">⚡</span>
        <p className="flex-1 text-[13px] leading-relaxed">
          「このメニューで開始」で、種目と目標セットを入れた当日のセッションを作れます。
        </p>
        <Link
          to="/log/copy"
          className="bg-k-accent-bg text-k-accent-soft rounded-lg px-3.5 py-1.5 text-xs font-semibold"
        >
          前回コピーで使う
        </Link>
      </HintCard>
    </Pane>
  );
}

/** メニュー内の 1 種目。セット数・レップ・休憩は入力欄から離れたときに保存する。 */
function MenuExerciseRow({
  exercise,
  onChange,
  onRemove,
}: {
  exercise: MenuExercise;
  onChange: (patch: ExercisePatch) => void;
  onRemove: () => void;
}) {
  const fieldClass =
    "border-k-line-strong bg-k-well text-k-fg w-full rounded-lg border px-1.5 py-2 text-center font-mono text-[13px] outline-none";

  return (
    <div className="border-k-line bg-k-card grid grid-cols-[minmax(0,1fr)_64px_64px_72px_22px] items-center gap-2 rounded-xl border px-3.5 py-3">
      <span className="truncate text-sm font-medium">{exercise.name}</span>
      <NumberField
        label={`${exercise.name} のセット数`}
        value={exercise.sets}
        min={1}
        className={fieldClass}
        onCommit={(target_sets) => onChange({ target_sets })}
      />
      <NumberField
        label={`${exercise.name} のレップ数`}
        value={exercise.reps}
        min={1}
        className={fieldClass}
        onCommit={(target_reps) => onChange({ target_reps })}
      />
      <NumberField
        label={`${exercise.name} の休憩秒数`}
        value={exercise.restSec}
        min={0}
        className={fieldClass}
        onCommit={(rest_sec) => onChange({ rest_sec })}
      />
      <button
        type="button"
        aria-label={`${exercise.name} を外す`}
        onClick={onRemove}
        className="text-k-fg-faint hover:text-k-danger text-center text-sm transition-colors"
      >
        ✕
      </button>
    </div>
  );
}

/** 整数入力。値は blur で確定し、空欄や不正値は元の値へ戻す。 */
function NumberField({
  label,
  value,
  min,
  className,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  className?: string;
  onCommit: (value: number) => void;
}) {
  return (
    <input
      // 保存後に届いた値で作り直す（サーバの値を正とする）。
      key={value}
      type="text"
      inputMode="numeric"
      defaultValue={String(value)}
      aria-label={label}
      className={className}
      onBlur={(event) => {
        // 空欄・空白のみは Number() が 0 になるため、不正値として明示的に弾く
        // （min=0 のフィールドだと 0 がそのまま確定されてしまう）。
        const raw = event.target.value.trim();
        const next = raw === "" ? Number.NaN : Number(raw);
        if (!Number.isInteger(next) || next < min || next === value) {
          event.target.value = String(value);
          return;
        }
        onCommit(next);
      }}
    />
  );
}
