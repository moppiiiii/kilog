import { Link } from "@tanstack/react-router";

import { PanelTitle, TopBar } from "@/components/kirog/console";
import { Button } from "@/components/ui/button";
import { stampDate, todayIso } from "@/lib/format";
import type { WorkoutSession } from "@/schemas/workouts";

/** 記録画面のヘッダ。セッション未作成のときは削除・確定を出さない。 */
export function SessionTopBar({
  session,
  isDeleting,
  isConfirming,
  onRequestDelete,
  onConfirm,
}: {
  session: WorkoutSession;
  isDeleting: boolean;
  isConfirming: boolean;
  onRequestDelete: () => void;
  onConfirm: () => void;
}) {
  return (
    <TopBar>
      <PanelTitle sub={session.id ? session.title : undefined}>
        トレーニングを記録
      </PanelTitle>
      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <Link to="/log/copy" className="text-k-fg-dim hover:text-k-fg text-xs">
          ↺ 前回コピー
        </Link>
        <Link to="/log/timer" className="text-k-fg-dim hover:text-k-fg text-xs">
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
              disabled={isDeleting}
              onClick={onRequestDelete}
            >
              削除
            </Button>
            <Button
              size="sm"
              className="rounded-[9px] font-bold"
              disabled={isConfirming}
              onClick={onConfirm}
            >
              記録を確定
            </Button>
          </>
        ) : null}
      </div>
    </TopBar>
  );
}
