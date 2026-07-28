import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
  HintCard,
  Pane,
  Panel,
  SectionTitle,
  SplitBody,
  TopBar,
} from "@/components/kirog/console";
import { Button } from "@/components/ui/button";
import { useRecordRest } from "@/hooks/use-record-rest";
import { clock, kg } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RestContext } from "@/schemas/workouts";

// 9A: 休憩タイマー。セット間インターバルのカウントダウン。
// カウントダウンは「目安」で、記録するのは実際に休んだ秒数（rested）。
// 次のセットへ進むときに、直前に完了したセットの rest_sec として書き込む。

const PRESETS = [60, 90, 120, 180];
/** 残りがこの秒数を切ったらリングを緑に切り替える。 */
const NEAR_END_SEC = 10;

/** 休憩終了の合図。外部アセットを持たないので WebAudio で短く鳴らす。 */
function playBeep() {
  if (typeof AudioContext === "undefined") return;
  const ctx = new AudioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.frequency.value = 880;
  gain.gain.value = 0.08;
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.onended = () => void ctx.close();
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.18);
}

export function RestTimer({ context }: { context: RestContext }) {
  const navigate = useNavigate();
  const recordRest = useRecordRest();
  const [minRest, maxRest] = context.recommendedRestSec;
  // 目安は推奨休憩の下限から始める（プリセットで上書きできる）。
  const [total, setTotal] = useState(minRest);
  const [remaining, setRemaining] = useState(minRest);
  const [running, setRunning] = useState(true);
  /** 実際に休んだ秒数。±15/30 やプリセットでは動かさず、記録する値はこれ。 */
  const [rested, setRested] = useState(0);
  const [sound, setSound] = useState(true);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRested((current) => current + 1);
      setRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  // 目安の 0 到達で止めて合図を鳴らす（休憩自体は続けられる）。
  useEffect(() => {
    if (!running || remaining > 0) return;
    setRunning(false);
    if (sound) playBeep();
  }, [remaining, running, sound]);

  const ratio = total === 0 ? 0 : Math.max(0, Math.min(1, remaining / total));
  const nearEnd = remaining <= NEAR_END_SEC;
  const ringColor = nearEnd ? "#4fd39a" : "#5b8bff";
  const deg = ratio * 360;

  const usePreset = (seconds: number) => {
    setTotal(seconds);
    setRemaining(seconds);
    setRunning(true);
  };

  /** 直前に完了したセット＝この休憩の持ち主。未完了しか無ければ記録先は無し。 */
  const lastDoneSetId = context.doneSets.at(-1)?.id ?? null;

  const finishRest = async () => {
    if (lastDoneSetId) {
      await recordRest.mutateAsync({ setId: lastDoneSetId, restSec: rested });
    }
    void navigate({ to: "/log" });
  };

  return (
    <Panel>
      <TopBar>
        <div className="flex items-center gap-3.5">
          <span className="bg-k-success size-2 rounded-full shadow-[0_0_0_4px_rgba(79,211,154,0.15)]" />
          <span className="text-[15px] font-bold">
            {context.sessionTitle}{" "}
            <span className="text-k-fg-dim text-[13px] font-normal">
              記録中
            </span>
          </span>
          <span className="text-k-fg-dim font-mono text-[13px]">
            経過 {clock(context.elapsedSec)}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            className="bg-k-chip rounded-[9px]"
            aria-pressed={sound}
            onClick={() => setSound((current) => !current)}
          >
            サウンド {sound ? "ON 🔔" : "OFF 🔕"}
          </Button>
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="rounded-[9px]"
          >
            <Link to="/log">セッション終了</Link>
          </Button>
        </div>
      </TopBar>

      <SplitBody className="lg:[grid-template-columns:1fr_380px]">
        <Pane className="flex flex-col items-center px-6 pt-10 pb-11">
          <div className="text-k-fg-dim mb-7 font-mono text-xs tracking-[2px]">
            REST · 休憩中
          </div>

          <div
            className="mb-8 flex size-[280px] items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(${ringColor} ${deg}deg, #1c212b ${deg}deg)`,
            }}
            role="timer"
            aria-live="off"
          >
            <div className="bg-k-panel flex size-[236px] flex-col items-center justify-center gap-1 rounded-full">
              <div className="font-mono text-[64px] leading-none font-semibold tracking-[1px]">
                {clock(remaining)}
              </div>
              <div className="text-k-fg-dim font-mono text-xs">
                / {clock(total)} 設定
              </div>
              <div className="text-k-fg-faint font-mono text-[11px]">
                実休憩 {clock(rested)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() =>
                setRemaining((current) => Math.max(0, current - 15))
              }
              className="border-k-line-strong bg-k-chip text-k-fg-sub hover:border-k-accent-edge flex size-14 items-center justify-center rounded-2xl border font-mono text-[13px] transition-colors"
            >
              −15s
            </button>
            <button
              type="button"
              onClick={() => setRunning((current) => !current)}
              aria-label={running ? "一時停止" : "再開"}
              className="bg-k-accent text-k-ink flex size-[76px] items-center justify-center rounded-[22px] text-[26px]"
            >
              {running ? "❚❚" : "▶"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRemaining((current) => {
                  const next = current + 30;
                  setTotal((currentTotal) => Math.max(currentTotal, next));
                  return next;
                });
              }}
              className="border-k-line-strong bg-k-chip text-k-fg-sub hover:border-k-accent-edge flex size-14 items-center justify-center rounded-2xl border font-mono text-[13px] transition-colors"
            >
              +30s
            </button>
          </div>

          <button
            type="button"
            disabled={recordRest.isPending}
            onClick={() => void finishRest()}
            className="text-k-accent hover:text-k-fg mt-5 text-[13px] transition-colors disabled:opacity-50"
          >
            {lastDoneSetId
              ? `休憩 ${clock(rested)} を記録して次のセットへ →`
              : "次のセットへ →"}
          </button>
          {lastDoneSetId ? null : (
            <p className="text-k-fg-faint mt-1.5 text-[11px]">
              完了済みのセットが無いため、この休憩は記録されません
            </p>
          )}

          <div className="mt-7 flex gap-2">
            {PRESETS.map((seconds) => (
              <button
                key={seconds}
                type="button"
                onClick={() => usePreset(seconds)}
                className={cn(
                  "rounded-[20px] border px-4 py-2 font-mono text-xs transition-colors",
                  total === seconds
                    ? "border-k-accent-edge bg-k-accent-bg text-k-accent-soft"
                    : "border-k-line-strong bg-k-raised text-k-fg-muted",
                )}
              >
                {clock(seconds)}
              </button>
            ))}
          </div>
        </Pane>

        <Pane>
          <SectionTitle>次のセット</SectionTitle>
          <div className="border-k-accent-edge bg-k-card mb-5.5 rounded-[14px] border p-4.5">
            <div className="text-base font-bold">{context.exerciseName}</div>
            <div className="mt-3.5 flex gap-5">
              <NextStat
                label="SET"
                value={
                  <>
                    {context.setNo}
                    <span className="text-k-fg-dim text-xs">
                      /{context.setTotal}
                    </span>
                  </>
                }
              />
              <NextStat
                label="目標 KG"
                value={kg(context.targetKg)}
                className="text-k-accent-soft"
              />
              <NextStat label="目標 REPS" value={context.targetReps} />
            </div>
          </div>

          <SectionTitle>直前のセット</SectionTitle>
          <div className="bg-k-line mb-5.5 flex flex-col gap-px overflow-hidden rounded-[10px]">
            {context.doneSets.map((set) => (
              <div
                key={set.n}
                className="bg-k-raised flex items-center gap-3 px-3.5 py-3"
              >
                <span className="bg-k-success-bg text-k-success flex size-5.5 items-center justify-center rounded-md text-xs">
                  ✓
                </span>
                <span className="text-k-fg-muted font-mono text-[13px]">
                  SET {set.n}
                </span>
                <span className="ml-auto font-mono text-sm">
                  {kg(set.kg)}kg × {set.reps}
                </span>
                <span className="text-k-fg-dim w-11 text-right font-mono text-[11px]">
                  RPE {set.rpe ?? "—"}
                </span>
              </div>
            ))}
          </div>

          <HintCard>
            <div className="text-k-accent-text mb-1.5 text-xs">💡 推奨休憩</div>
            <div className="text-[13px] leading-relaxed">
              高重量コンパウンド種目のため、次セットは{" "}
              <span className="text-k-accent-soft font-mono">
                {clock(minRest)}〜{clock(maxRest)}
              </span>{" "}
              の休憩が効果的です。
            </div>
          </HintCard>
        </Pane>
      </SplitBody>
    </Panel>
  );
}

function NextStat({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div>
      <div className="text-k-fg-dim font-mono text-[11px]">{label}</div>
      <div className={cn("mt-0.5 font-mono text-[22px]", className)}>
        {value}
      </div>
    </div>
  );
}
