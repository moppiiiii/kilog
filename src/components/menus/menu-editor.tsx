import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import {
  DashedAction,
  HintCard,
  MonoLabel,
  Pane,
  Panel,
  SectionTitle,
  SegmentedGroup,
  segmentClass,
  SplitBody,
  TopBar,
} from "@/components/kirog/console";
import { TagInput } from "@/components/kirog/tag-input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useMenuEditor } from "@/hooks/use-menu-editor";
import { cn } from "@/lib/utils";
import type { ExerciseRead } from "@/schemas/exercises";
import type { MenuExercise, MenuKindValue, WorkoutMenu } from "@/schemas/menus";

// 10A: マイメニュー登録。左が登録済み、右が編集フォーム。
// 編集は即時保存（記録画面と同じ方針）で、まとめて押す「保存」は持たない。

const ICONS = ["🏋️", "💪", "🔥", "🥗"];

/** 新規メニューの初期値。作成直後に名前を直せるよう、汎用の名前を入れておく。 */
const NEW_MENU_NAME = "新しいメニュー";

export function MenuEditor({
  menus,
  kind,
  selected,
  exercises,
}: {
  menus: WorkoutMenu[];
  kind: MenuKindValue;
  /** 編集対象。登録が 1 件も無ければ null（空状態）。 */
  selected: WorkoutMenu | null;
  exercises: ExerciseRead[];
}) {
  const navigate = useNavigate();
  const editor = useMenuEditor();
  const [search, setSearch] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // どれも失敗時は遷移しない（理由はトーストに出る）。
  const createMenu = () => {
    const id = crypto.randomUUID();
    editor.create.mutate(
      {
        id,
        kind,
        name: NEW_MENU_NAME,
        icon: ICONS[0] ?? "🏋️",
        parts: [],
        estimated_min: 0,
        favorite: false,
        position: menus.length,
      },
      {
        onSuccess: () =>
          void navigate({ to: "/menus", search: { kind, menu: id } }),
      },
    );
  };

  const removeMenu = () => {
    if (!selected) return;
    editor.remove.mutate(selected.id, {
      onSuccess: () =>
        void navigate({ to: "/menus", search: { kind, menu: undefined } }),
    });
  };

  const startSession = () => {
    if (!selected) return;
    editor.start.mutate(
      { menuId: selected.id },
      { onSuccess: () => void navigate({ to: "/log" }) },
    );
  };

  /** メニュー本体（名前・アイコン・部位タグ）の部分更新。 */
  const patch = (value: { name?: string; icon?: string; parts?: string[] }) => {
    if (!selected) return;
    editor.update.mutate({ id: selected.id, ...value });
  };

  const usedExerciseIds = new Set(selected?.exercises.map((e) => e.id) ?? []);
  const candidates = exercises
    .filter((exercise) => !usedExerciseIds.has(exercise.id))
    .filter(
      (exercise) =>
        search !== "" &&
        (exercise.name.includes(search) || exercise.part.includes(search)),
    )
    .slice(0, 6);

  const addExercise = (exerciseId: string) => {
    if (!selected) return;
    editor.addExercise.mutate({
      id: crypto.randomUUID(),
      menu_id: selected.id,
      exercise_id: exerciseId,
      position: selected.exercises.length,
      target_sets: 3,
      target_reps: 10,
      rest_sec: 90,
    });
    setSearch("");
  };

  return (
    <Panel>
      <TopBar>
        <div className="flex flex-wrap items-center gap-3.5">
          <Link to="/log" className="text-k-fg-dim hover:text-k-fg text-[13px]">
            <span className="text-k-accent">◂</span> 記録に戻る
          </Link>
          <span className="bg-k-edge h-4 w-px" />
          <span className="text-[15px] font-bold">マイメニュー</span>
          <SegmentedGroup className="rounded-[9px] p-1">
            <Link
              to="/menus"
              search={{ kind: "training", menu: undefined }}
              className={segmentClass(kind === "training")}
            >
              トレーニング
            </Link>
            <Link
              to="/menus"
              search={{ kind: "meal", menu: undefined }}
              className={segmentClass(kind === "meal")}
            >
              食事
            </Link>
          </SegmentedGroup>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            className="bg-k-chip rounded-[9px]"
            disabled={editor.create.isPending}
            onClick={createMenu}
          >
            ＋ 新規メニュー
          </Button>
          {selected ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-[9px]"
                disabled={editor.remove.isPending}
                onClick={() => setConfirmingDelete(true)}
              >
                削除
              </Button>
              <ConfirmDialog
                open={confirmingDelete}
                title={`「${selected.name}」を削除しますか？`}
                description="このメニューと、登録した種目の既定値が消えます。記録済みのセッションは残ります。"
                confirmLabel="削除する"
                onConfirm={() => {
                  setConfirmingDelete(false);
                  removeMenu();
                }}
                onCancel={() => setConfirmingDelete(false)}
              />
              <Button
                size="sm"
                className="rounded-[9px] font-bold"
                disabled={editor.start.isPending}
                onClick={startSession}
              >
                {editor.start.isPending ? "作成中…" : "このメニューで開始 →"}
              </Button>
            </>
          ) : null}
        </div>
      </TopBar>

      <SplitBody className="lg:[grid-template-columns:280px_1fr]">
        <Pane className="p-[22px]">
          <MonoLabel className="mb-3">登録済み（{menus.length}）</MonoLabel>
          <div className="flex flex-col gap-2.5">
            {menus.map((menu) => {
              const active = menu.id === selected?.id;
              return (
                <Link
                  key={menu.id}
                  to="/menus"
                  search={{ kind, menu: menu.id }}
                  className={cn(
                    "rounded-xl border p-3.5 transition-colors",
                    active
                      ? "border-k-accent-edge bg-k-card"
                      : "border-k-line bg-k-panel hover:border-k-accent-edge",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-[9px] text-[15px]",
                        active ? "bg-k-accent-bg" : "bg-k-chip",
                      )}
                    >
                      {menu.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">
                        {menu.name}
                      </div>
                      <div className="text-k-fg-dim mt-px text-[11px]">
                        {menu.summary} · {menu.exercises.length}種目
                      </div>
                    </div>
                    {active ? (
                      <span className="bg-k-accent size-1.5 rounded-full" />
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
          <DashedAction className="mt-3" onClick={createMenu}>
            ＋ メニューを追加
          </DashedAction>
        </Pane>

        {selected ? (
          <Pane>
            <div className="mb-5.5 flex flex-wrap gap-3.5">
              <div className="min-w-[240px] flex-1">
                <MonoLabel className="mb-1.5">メニュー名</MonoLabel>
                <input
                  // メニューを切り替えたら入力欄も作り直す（未保存の値を持ち越さない）。
                  key={selected.id}
                  defaultValue={selected.name}
                  aria-label="メニュー名"
                  onBlur={(event) => {
                    const name = event.target.value.trim();
                    if (name === "" || name === selected.name) {
                      event.target.value = selected.name;
                      return;
                    }
                    patch({ name });
                  }}
                  className="border-k-accent-edge bg-k-raised text-k-fg w-full rounded-[10px] border px-4 py-3 text-base font-semibold outline-none"
                />
              </div>
              <div className="w-[190px]">
                <MonoLabel className="mb-1.5">アイコン</MonoLabel>
                <div className="flex gap-1.5">
                  {ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      aria-label={`アイコンを ${icon} にする`}
                      aria-pressed={icon === selected.icon}
                      onClick={() => patch({ icon })}
                      className={cn(
                        "flex-1 rounded-[10px] border p-3 text-center text-base transition-opacity",
                        icon === selected.icon
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
                values={selected.parts}
                onChange={(parts) => patch({ parts })}
                placeholder="＋ 部位"
                label="部位タグを追加"
              />
            </div>

            <SectionTitle
              right={
                <span className="text-k-fg-dim font-mono text-xs">
                  {selected.exercises.length}種目
                </span>
              }
            >
              種目とデフォルト設定
            </SectionTitle>

            <div className="flex flex-col gap-2.5">
              {selected.exercises.map((exercise) => (
                <MenuExerciseRow
                  key={exercise.rowId}
                  exercise={exercise}
                  onChange={(patchValue) =>
                    editor.updateExercise.mutate({
                      id: exercise.rowId,
                      ...patchValue,
                    })
                  }
                  onRemove={() => editor.removeExercise.mutate(exercise.rowId)}
                />
              ))}
              {selected.exercises.length === 0 ? (
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
                  onChange={(event) => setSearch(event.target.value)}
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
                      onClick={() => addExercise(exercise.id)}
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
        ) : (
          <Pane className="flex flex-col items-center justify-center gap-4 py-16">
            <p className="text-k-fg-dim text-[13px]">
              {kind === "training" ? "トレーニング" : "食事"}
              のメニューがまだありません
            </p>
            <Button
              size="sm"
              className="rounded-[9px] font-bold"
              disabled={editor.create.isPending}
              onClick={createMenu}
            >
              ＋ 最初のメニューを作る
            </Button>
          </Pane>
        )}
      </SplitBody>
    </Panel>
  );
}

/** メニュー内の 1 種目。セット数・レップ・休憩は入力欄から離れたときに保存する。 */
function MenuExerciseRow({
  exercise,
  onChange,
  onRemove,
}: {
  exercise: MenuExercise;
  onChange: (patch: {
    target_sets?: number;
    target_reps?: number;
    rest_sec?: number;
  }) => void;
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
        const next = Number(event.target.value);
        if (!Number.isInteger(next) || next < min || next === value) {
          event.target.value = String(value);
          return;
        }
        onCommit(next);
      }}
    />
  );
}
