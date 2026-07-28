import { Link, useNavigate } from "@tanstack/react-router";
import type * as React from "react";
import { useEffect, useRef, useState } from "react";

import {
  Badge,
  Chip,
  MonoLabel,
  Pane,
  Panel,
  PanelTitle,
  SplitBody,
  TopBar,
} from "@/components/kirog/console";
import { num, todayIso, toneClass } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LogFeed, LogFeedQueryInput } from "@/schemas/workouts";

// 3A: 一覧画面。トレーニングと食事が 1 本の時系列に並ぶ。

const PERIODS = [
  { key: "week", label: "今週" },
  { key: "month", label: "今月" },
  { key: "quarter", label: "3ヶ月" },
  { key: "all", label: "すべて" },
] as const;

const KINDS = [
  { key: "all", label: "すべて", dot: "bg-k-accent" },
  { key: "training", label: "トレーニング", dot: "bg-k-success" },
  { key: "meal", label: "食事", dot: "bg-k-warn" },
] as const;

export function LogFeedView({
  feed,
  filter,
}: {
  feed: LogFeed;
  filter: LogFeedQueryInput;
}) {
  // 絞り込み・ページングはサーバ側（getLogFeed）で確定済み。ここは表示のみ。
  const rows = feed.rows;
  const today = todayIso();
  const pageCount = Math.max(1, Math.ceil(feed.total / feed.pageSize));
  const rangeFrom = feed.total === 0 ? 0 : (feed.page - 1) * feed.pageSize + 1;
  const rangeTo = Math.min(feed.page * feed.pageSize, feed.total);
  const windowStart = Math.max(1, feed.page - 2);
  const windowEnd = Math.min(pageCount, feed.page + 2);
  const pages = Array.from(
    { length: windowEnd - windowStart + 1 },
    (_, i) => windowStart + i,
  );

  return (
    <Panel>
      <TopBar>
        <PanelTitle sub={`${num(feed.total)} 件`}>記録の履歴</PanelTitle>
        <div className="flex items-center gap-3.5">
          <SearchBox filter={filter} />
        </div>
      </TopBar>

      <SplitBody className="lg:[grid-template-columns:220px_1fr]">
        <Pane className="p-[22px]">
          <MonoLabel className="mb-3">TYPE</MonoLabel>
          <div className="mb-6 flex flex-col gap-1">
            {KINDS.map((kind) => (
              <Link
                key={kind.key}
                to="/history"
                search={{ ...filter, kind: kind.key, page: 1 }}
                className={cn(
                  "flex items-center gap-2.5 rounded-[9px] px-3 py-2 text-[13px] transition-colors",
                  filter.kind === kind.key
                    ? "bg-k-chip text-k-fg font-medium"
                    : "text-k-fg-sub hover:text-k-fg",
                )}
              >
                <span className={cn("size-2 rounded-full", kind.dot)} />
                {kind.label}
                <span className="text-k-fg-dim ml-auto font-mono text-xs">
                  {feed.counts[kind.key]}
                </span>
              </Link>
            ))}
          </div>

          <MonoLabel className="mb-3">PERIOD</MonoLabel>
          <div className="mb-6 flex flex-col gap-1">
            {PERIODS.map((period) => (
              <Link
                key={period.key}
                to="/history"
                search={{ ...filter, period: period.key, page: 1 }}
                className={cn(
                  "rounded-[9px] px-3 py-2 text-[13px] transition-colors",
                  filter.period === period.key
                    ? "bg-k-chip text-k-fg font-medium"
                    : "text-k-fg-sub hover:text-k-fg",
                )}
              >
                {period.label}
              </Link>
            ))}
          </div>

          <MonoLabel className="mb-3">部位</MonoLabel>
          <div className="flex flex-wrap gap-1.5">
            {feed.parts.map((part) => (
              <Chip key={part} className="px-2.5 py-1 text-[11px]">
                {part}
              </Chip>
            ))}
          </div>
        </Pane>

        <div className="bg-k-panel min-w-0">
          <div className="border-k-line grid grid-cols-2 border-b md:grid-cols-4">
            <SummaryCell label="SESSIONS" value={num(feed.summary.sessions)} />
            <SummaryCell
              label="総挙上量"
              value={feed.summary.volumeTons.toFixed(1)}
              unit="t"
            />
            <SummaryCell label="平均kcal" value={num(feed.summary.avgKcal)} />
            <SummaryCell
              label="体重変化"
              value={feed.summary.weightDeltaKg.toFixed(1)}
              unit="kg"
              valueClassName="text-k-success"
            />
          </div>

          {/* 狭い画面では表を横スクロールさせ、ページ全体の横崩れを防ぐ。 */}
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="border-k-line text-k-fg-faint grid grid-cols-[100px_1fr_110px_130px_80px] gap-4 border-b px-6 py-3 font-mono text-[11px] tracking-[0.5px]">
                <div>DATE</div>
                <div>RECORD</div>
                <div>種別</div>
                <div>VOLUME / KCAL</div>
                <div className="text-right">前回比</div>
              </div>

              {rows.map((row) => {
                const content = (
                  <>
                    <div>
                      <div className="font-mono text-sm">{row.date}</div>
                      <div className="text-k-fg-faint font-mono text-[11px]">
                        {row.dow}
                      </div>
                    </div>
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          row.kind === "training"
                            ? "bg-k-success"
                            : "bg-k-warn",
                        )}
                      />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {row.title}
                        </div>
                        <div className="text-k-fg-dim mt-0.5 truncate text-xs">
                          {row.detail}
                        </div>
                      </div>
                    </div>
                    <div>
                      <Badge tone={row.kind === "training" ? "accent" : "warn"}>
                        {row.kind === "training" ? "トレ" : "食事"}
                      </Badge>
                    </div>
                    <div className="text-k-fg-sub font-mono text-sm">
                      {row.metric}
                    </div>
                    <div
                      className={cn(
                        "text-right font-mono text-[13px]",
                        toneClass(row.tone),
                      )}
                    >
                      {row.delta}
                    </div>
                  </>
                );

                const rowClass =
                  "border-k-line-soft grid grid-cols-[100px_1fr_110px_130px_80px] items-center gap-4 border-b px-6 py-4";
                const linkClass = cn(
                  rowClass,
                  "hover:bg-k-raised transition-colors",
                );

                // 食事行はその日の食事記録へ。当日は正規 URL の /meals を指す。
                if (row.kind === "meal") {
                  return row.iso === today ? (
                    <Link key={row.id} to="/meals" className={linkClass}>
                      {content}
                    </Link>
                  ) : (
                    <Link
                      key={row.id}
                      to="/meals/$date"
                      params={{ date: row.iso }}
                      className={linkClass}
                    >
                      {content}
                    </Link>
                  );
                }

                return row.sessionId ? (
                  <Link
                    key={row.id}
                    to="/history/$sessionId"
                    params={{ sessionId: row.sessionId }}
                    className={linkClass}
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={row.id} className={rowClass}>
                    {content}
                  </div>
                );
              })}

              {rows.length === 0 ? (
                <div className="text-k-fg-dim px-6 py-12 text-center text-[13px]">
                  {filter.q
                    ? `「${filter.q}」に一致する記録がありません`
                    : "この条件の記録がありません"}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4.5">
            <div className="text-k-fg-dim font-mono text-xs">
              {rangeFrom}–{rangeTo} / {num(feed.total)} 件
            </div>
            <div className="flex gap-1.5 font-mono text-xs">
              <PageLink
                filter={filter}
                page={feed.page - 1}
                disabled={feed.page <= 1}
              >
                ◂
              </PageLink>
              {pages.map((p) => (
                <PageLink
                  key={p}
                  filter={filter}
                  page={p}
                  active={p === feed.page}
                >
                  {p}
                </PageLink>
              ))}
              <PageLink
                filter={filter}
                page={feed.page + 1}
                disabled={feed.page >= pageCount}
              >
                ▸
              </PageLink>
            </div>
          </div>
        </div>
      </SplitBody>
    </Panel>
  );
}

/** 検索の反映を待つ時間（ms）。打鍵ごとに fetch させないための debounce。 */
const SEARCH_DEBOUNCE_MS = 250;

/**
 * フリーワード検索。入力欄がローカルの正で、止まったら search params（q）へ反映する。
 * 絞り込みは serverFn 側（getLogFeed）で行うので、ここは search を書き換えるだけ。
 *
 * 入力を壊さないための約束が 2 つある。
 * - 自分がコミットした q は committed に控え、URL 側の変化が「外部由来（戻る/進む）」の
 *   ときだけ入力欄へ反映する。区別しないと debounce 中に打った文字が巻き戻る。
 * - IME 変換中（composing）はコミットも反映もしない。未確定の value を外から書き換えると
 *   IME が未確定文字を再挿入して重複入力になる。
 */
function SearchBox({ filter }: { filter: LogFeedQueryInput }) {
  const navigate = useNavigate();
  const [text, setText] = useState(filter.q);
  // 変換終了で commit を再開したいので ref ではなく state（effect の依存に入れる）。
  const [composing, setComposing] = useState(false);
  const committed = useRef(filter.q);

  // 外部由来（戻る/進む・リンク遷移）で q が変わったときだけ入力欄を合わせる。
  useEffect(() => {
    if (composing || filter.q === committed.current) return;
    committed.current = filter.q;
    setText(filter.q);
  }, [filter.q, composing]);

  // 入力が止まってから search を更新。履歴を汚さないよう replace で置き換える。
  useEffect(() => {
    if (composing) return;
    const next = text.trim();
    if (next === committed.current) return;
    const timer = setTimeout(() => {
      committed.current = next;
      void navigate({
        to: "/history",
        // 関数形式にして、他の絞り込み（kind/period）の変化でタイマーが再起動しないようにする。
        search: (prev) => ({ ...prev, q: next, page: 1 }),
        replace: true,
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, composing, navigate]);

  return (
    <div className="border-k-line bg-k-raised focus-within:border-k-accent-edge flex w-[200px] items-center gap-2.5 rounded-[9px] border px-3.5 py-2 text-[13px] transition-colors">
      <span className="text-k-fg-faint" aria-hidden>
        ⌕
      </span>
      <input
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onCompositionStart={() => setComposing(true)}
        // 確定値は composition の後に onChange が来ない環境があるのでここでも拾う。
        onCompositionEnd={(event) => {
          setComposing(false);
          setText(event.currentTarget.value);
        }}
        placeholder="記録を検索"
        aria-label="記録を検索"
        className="text-k-fg placeholder:text-k-fg-faint min-w-0 flex-1 bg-transparent outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {text ? (
        <button
          type="button"
          onClick={() => setText("")}
          aria-label="検索を消す"
          className="text-k-fg-faint hover:text-k-fg transition-colors"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}

/** ページ送りの 1 マス。無効・現在ページは span、それ以外は search 更新の Link。 */
function PageLink({
  filter,
  page,
  active,
  disabled,
  children,
}: {
  filter: LogFeedQueryInput;
  page: number;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const base = "rounded-[7px] px-3 py-1.5";
  if (disabled) {
    return (
      <span className={cn(base, "bg-k-chip text-k-fg-faint opacity-40")}>
        {children}
      </span>
    );
  }
  if (active) {
    return (
      <span className={cn(base, "bg-k-accent text-k-ink")}>{children}</span>
    );
  }
  return (
    <Link
      to="/history"
      search={{ ...filter, page }}
      className={cn(base, "bg-k-chip hover:text-k-fg transition-colors")}
    >
      {children}
    </Link>
  );
}

function SummaryCell({
  label,
  value,
  unit,
  valueClassName,
}: {
  label: string;
  value: string;
  unit?: string;
  valueClassName?: string;
}) {
  return (
    <div className="border-k-line border-r border-b px-[22px] py-4 last:border-r-0 md:border-b-0">
      <MonoLabel>{label}</MonoLabel>
      <div className={cn("mt-1 font-mono text-[22px]", valueClassName)}>
        {value}
        {unit ? <span className="text-k-fg-dim text-xs">{unit}</span> : null}
      </div>
    </div>
  );
}
