import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import {
  Pane,
  Panel,
  SegmentedGroup,
  SplitBody,
  TopBar,
} from "@/components/kirog/console";
import { segmentClass } from "@/components/kirog/segment-class";
import { MenuDetailPane } from "@/components/menus/menu-detail-pane";
import { MENU_ICONS } from "@/components/menus/menu-icons";
import { MenuListPane } from "@/components/menus/menu-list-pane";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useMenuEditor } from "@/hooks/use-menu-editor";
import type { ExerciseRead } from "@/schemas/exercises";
import type { MenuKindValue, WorkoutMenu } from "@/schemas/menus";

// 10A: マイメニュー登録。左が登録済み、右が編集フォーム。
// 編集は即時保存（記録画面と同じ方針）で、まとめて押す「保存」は持たない。

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
        icon: MENU_ICONS[0] ?? "🏋️",
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
        <MenuListPane
          menus={menus}
          kind={kind}
          selectedId={selected?.id ?? null}
          onCreate={createMenu}
        />

        {selected ? (
          <MenuDetailPane
            menu={selected}
            exercises={exercises}
            search={search}
            onSearchChange={setSearch}
            onPatch={patch}
            onAddExercise={addExercise}
            onUpdateExercise={(id, patchValue) =>
              editor.updateExercise.mutate({ id, ...patchValue })
            }
            onRemoveExercise={(id) => editor.removeExercise.mutate(id)}
          />
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
