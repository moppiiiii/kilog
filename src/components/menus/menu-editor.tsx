import { Link } from "@tanstack/react-router";

import {
  Chip,
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
import { Button } from "@/components/ui/button";
import { clock } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WorkoutMenu } from "@/schemas/menus";

// 10A: マイメニュー登録。左が登録済み、右が編集フォーム。

const ICONS = ["🏋️", "💪", "🔥"];

export function MenuEditor({
  menus,
  kind,
  selected,
}: {
  menus: WorkoutMenu[];
  kind: "training" | "meal";
  selected: WorkoutMenu;
}) {
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
          <Button variant="ghost" size="sm" className="bg-k-chip rounded-[9px]">
            ＋ 新規メニュー
          </Button>
          <Button size="sm" className="rounded-[9px] font-bold">
            保存
          </Button>
        </div>
      </TopBar>

      <SplitBody className="lg:[grid-template-columns:280px_1fr]">
        <Pane className="p-[22px]">
          <MonoLabel className="mb-3">登録済み（{menus.length}）</MonoLabel>
          <div className="flex flex-col gap-2.5">
            {menus.map((menu) => {
              const active = menu.id === selected.id;
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
          <DashedAction className="mt-3">＋ メニューを追加</DashedAction>
        </Pane>

        <Pane>
          <div className="mb-5.5 flex flex-wrap gap-3.5">
            <div className="min-w-[240px] flex-1">
              <MonoLabel className="mb-1.5">メニュー名</MonoLabel>
              <div className="border-k-accent-edge bg-k-raised rounded-[10px] border px-4 py-3 text-base font-semibold">
                {selected.name}
              </div>
            </div>
            <div className="w-[150px]">
              <MonoLabel className="mb-1.5">アイコン</MonoLabel>
              <div className="flex gap-1.5">
                {ICONS.map((icon) => (
                  <span
                    key={icon}
                    className={cn(
                      "flex-1 rounded-[10px] border p-3 text-center text-base",
                      icon === selected.icon
                        ? "border-k-accent-edge bg-k-accent-bg"
                        : "border-k-line-strong bg-k-raised opacity-50",
                    )}
                  >
                    {icon}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-5.5 flex flex-wrap items-center gap-2.5">
            <span className="text-k-fg-dim text-xs">部位タグ</span>
            <div className="flex flex-wrap gap-1.5">
              {selected.parts.map((part) => (
                <Chip key={part} active>
                  {part}
                </Chip>
              ))}
              <Chip>＋</Chip>
            </div>
          </div>

          <SectionTitle
            right={
              <span className="text-k-fg-dim font-mono text-xs">
                {selected.exercises.length}種目 · 目安 {selected.estimatedMin}分
              </span>
            }
          >
            種目とデフォルト設定
          </SectionTitle>

          <div className="flex flex-col gap-2.5">
            {selected.exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="border-k-line bg-k-card grid grid-cols-[18px_minmax(0,1fr)_64px_64px_62px_22px] items-center gap-2 rounded-xl border px-3.5 py-3"
              >
                <span className="text-k-fg-faint text-[15px]">⋮⋮</span>
                <span className="truncate text-sm font-medium">
                  {exercise.name}
                </span>
                <span className="border-k-line-strong bg-k-well rounded-lg border px-1.5 py-2 text-center font-mono text-[13px]">
                  {exercise.sets}
                  <span className="text-k-fg-faint text-[10px]"> set</span>
                </span>
                <span className="border-k-line-strong bg-k-well rounded-lg border px-1.5 py-2 text-center font-mono text-[13px]">
                  {exercise.reps}
                  <span className="text-k-fg-faint text-[10px]"> rep</span>
                </span>
                <span className="border-k-line-strong bg-k-well text-k-fg-sub rounded-lg border px-1.5 py-2 text-center font-mono text-[13px]">
                  {clock(exercise.restSec)}
                </span>
                <button
                  type="button"
                  aria-label={`${exercise.name} を外す`}
                  className="text-k-fg-faint hover:text-k-danger text-center text-sm transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="border-k-line-strong bg-k-raised mt-3.5 flex flex-wrap items-center gap-2.5 rounded-[10px] border px-4 py-3">
            <span className="text-k-fg-faint">⌕</span>
            <span className="text-k-fg-faint text-[13px]">
              種目を検索して追加
            </span>
            <span className="text-k-fg-faint ml-auto font-mono text-[11px]">
              SET / REP / 休憩 を初期値で保存
            </span>
          </div>

          <HintCard className="mt-5 flex flex-wrap items-center gap-3">
            <span className="text-lg">⚡</span>
            <p className="flex-1 text-[13px] leading-relaxed">
              このメニューは記録画面の「セッション選択」と「前回コピー」から呼び出せます。
            </p>
            <Link
              to="/log/copy"
              className="bg-k-accent-bg text-k-accent-soft rounded-lg px-3.5 py-1.5 text-xs font-semibold"
            >
              前回コピーで使う
            </Link>
          </HintCard>
        </Pane>
      </SplitBody>
    </Panel>
  );
}
