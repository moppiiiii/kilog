import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import {
  Card,
  MonoLabel,
  Pane,
  Panel,
  SplitBody,
  TopBar,
} from "@/components/kirog/console";
import { Button } from "@/components/ui/button";
import { useCopySession } from "@/hooks/use-copy-session";
import { kg, monthDay, num } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WorkoutMenu } from "@/schemas/menus";
import type { CopySource } from "@/schemas/workouts";

// 8A: 前回コピー入力。前回値を初期入力にして、差分だけ直して開始する。
// 複製は serverFn（copySession）が一括で行い、完了後は記録画面へ送る。

const BUMP_STEPS = [0, 2.5] as const;

export function CopySession({
  sources,
  menus,
}: {
  sources: CopySource[];
  menus: WorkoutMenu[];
}) {
  const navigate = useNavigate();
  const copy = useCopySession();
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? "");
  const [bump, setBump] = useState<number>(0);
  const selected = sources.find((source) => source.id === sourceId);
  const exercises = selected?.exercises ?? [];

  const setCount = exercises.reduce(
    (total, exercise) => total + exercise.sets.length,
    0,
  );
  const targetVolume = exercises.reduce(
    (total, exercise) =>
      total +
      exercise.sets.reduce(
        (sum, set) => sum + Math.max(0, set.kg + bump) * set.reps,
        0,
      ),
    0,
  );

  // 失敗時は遷移しない（理由はトーストに出る）。
  const start = () => {
    if (!selected) return;
    copy.mutate(
      { sourceId: selected.id, bumpKg: bump },
      { onSuccess: () => void navigate({ to: "/log" }) },
    );
  };

  return (
    <Panel>
      <TopBar>
        <div className="flex items-center gap-3.5">
          <Link
            to="/log"
            className="text-k-fg-dim hover:text-k-fg flex items-center gap-2 text-[13px]"
          >
            <span className="text-k-accent">◂</span> 記録に戻る
          </Link>
          <span className="bg-k-edge h-4 w-px" />
          <span className="text-[15px] font-bold">前回をコピーして記録</span>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="rounded-[9px]"
          >
            <Link to="/log">空のセッション</Link>
          </Button>
          <Button
            size="sm"
            className="rounded-[9px] font-bold"
            disabled={!selected || copy.isPending}
            onClick={start}
          >
            {copy.isPending ? "作成中…" : "この内容で開始 →"}
          </Button>
        </div>
      </TopBar>

      <SplitBody className="lg:[grid-template-columns:300px_1fr]">
        <Pane className="p-[22px]">
          <MonoLabel className="mb-3">コピー元を選択</MonoLabel>
          <div className="mb-6 flex flex-col gap-2.5">
            {sources.map((source) => {
              const active = source.id === sourceId;
              return (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => setSourceId(source.id)}
                  className={cn(
                    "rounded-xl border p-3.5 text-left transition-colors",
                    active
                      ? "border-k-accent-edge bg-k-card"
                      : "border-k-line bg-k-panel hover:border-k-accent-edge",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        active ? "bg-k-accent" : "bg-k-success",
                      )}
                    />
                    <span className="flex-1 text-sm font-semibold">
                      {source.name}
                    </span>
                    {active ? (
                      <span className="text-k-accent-soft text-[11px]">
                        ✓ 選択中
                      </span>
                    ) : null}
                  </div>
                  <div className="text-k-fg-dim mt-2 flex gap-3.5 pl-[18px] font-mono text-[11px]">
                    <span>{monthDay(source.date)}</span>
                    <span>
                      {source.exerciseCount}種目 · {num(source.volumeKg)}kg
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <MonoLabel className="mb-3">保存済みルーティン</MonoLabel>
          <div className="flex flex-col gap-2">
            {menus.slice(0, 3).map((menu) => (
              <Link
                key={menu.id}
                to="/menus"
                search={{ kind: "training", menu: menu.id }}
                className="border-k-line bg-k-raised hover:border-k-accent-edge flex items-center gap-2.5 rounded-[10px] border px-3.5 py-2.5 transition-colors"
              >
                <span className="text-sm">📋</span>
                <span className="flex-1 truncate text-[13px] font-medium">
                  {menu.name}
                </span>
                <span className="text-k-fg-dim font-mono text-[11px]">
                  {menu.exercises.length}種目
                </span>
              </Link>
            ))}
          </div>
        </Pane>

        <Pane>
          <div className="border-k-accent-edge mb-5 flex flex-wrap items-center gap-3.5 rounded-xl border bg-[linear-gradient(160deg,#1b2740,#141821)] px-4.5 py-4">
            <span className="text-xl">↺</span>
            <div className="flex-1">
              <div className="text-sm font-semibold">
                {selected?.name} · {selected ? monthDay(selected.date) : "—"}{" "}
                の記録をプリセットしました
              </div>
              <div className="text-k-accent-text mt-0.5 text-xs">
                前回値を初期入力として反映。実施しながら差分だけ修正できます。
              </div>
            </div>
            <div className="flex gap-2">
              {BUMP_STEPS.map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setBump(step)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs transition-colors",
                    bump === step
                      ? "bg-k-accent-bg text-k-accent-soft font-semibold"
                      : "bg-k-chip text-k-fg-sub",
                  )}
                >
                  {step === 0 ? "前回値そのまま" : `+${step}kg 一括`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            {exercises.map((exercise) => (
              <Card key={exercise.id}>
                <div className="border-k-line flex items-center gap-3 border-b px-[18px] py-3.5">
                  <span className="bg-k-accent-bg text-k-accent-soft flex size-6 items-center justify-center rounded-md text-sm">
                    ✓
                  </span>
                  <span className="flex-1 text-[15px] font-bold">
                    {exercise.name}
                  </span>
                  {exercise.previousTop ? (
                    <span className="text-k-fg-dim font-mono text-[11px]">
                      前回{" "}
                      <span className="text-k-fg-sub">
                        {exercise.previousTop}
                      </span>
                    </span>
                  ) : null}
                </div>

                {/* セット単位の修正は複製後の記録画面で行う。ここは何が入るかの確認だけ。 */}
                <div className="text-k-fg-faint grid grid-cols-[40px_1fr_1fr] gap-2.5 px-[18px] py-2.5 font-mono text-[10px]">
                  <div>SET</div>
                  <div>KG（コピー）</div>
                  <div>REPS（コピー）</div>
                </div>

                {exercise.sets.map((set) => (
                  <div
                    key={set.n}
                    className="grid grid-cols-[40px_1fr_1fr] items-center gap-2.5 px-[18px] pb-2"
                  >
                    <div className="text-k-fg-dim font-mono text-[13px]">
                      {set.n}
                    </div>
                    <div className="border-k-accent-edge bg-k-well flex items-center gap-2 rounded-lg border px-3 py-2.5 font-mono text-sm">
                      {kg(Math.max(0, set.kg + bump))}
                      <span className="text-k-fg-faint text-[11px]">
                        {bump === 0 ? "前回値" : `+${bump}`}
                      </span>
                    </div>
                    <div className="border-k-accent-edge bg-k-well rounded-lg border px-3 py-2.5 font-mono text-sm">
                      {set.reps}
                    </div>
                  </div>
                ))}
                <div className="h-2" />
              </Card>
            ))}
          </div>

          <div className="border-k-line bg-k-raised mt-4.5 flex flex-wrap items-center gap-4 rounded-xl border px-4.5 py-4">
            <div className="flex-1">
              <div className="text-k-fg-dim text-xs">コピーされる内容</div>
              <div className="mt-0.5 text-sm font-semibold">
                {exercises.length}種目 · {setCount}セット · 目標挙上量{" "}
                {num(targetVolume)}kg
              </div>
            </div>
            <div className="text-k-fg-dim font-mono text-xs">
              実施しながら差分を記録 →
            </div>
          </div>
        </Pane>
      </SplitBody>
    </Panel>
  );
}
