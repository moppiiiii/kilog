import type * as React from "react";
import { useId, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { filterFoodCandidates } from "@/lib/food-candidates";
import { dec } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FoodCandidate } from "@/schemas/meals";

// 食品名の入力欄＋過去の記録からの補完。候補は親が保持する配列を絞るだけなので、
// 打鍵ごとの通信は発生しない。選ぶと量・kcal・PFC まで親が流し込む。

/** ドロップダウンに出す候補の最大件数。 */
const VISIBLE_LIMIT = 8;

export function FoodNameCombobox({
  value,
  candidates,
  invalid,
  className,
  onValueChange,
  onBlur,
  onSelect,
}: {
  value: string;
  candidates: FoodCandidate[];
  invalid?: boolean;
  className?: string;
  onValueChange: (value: string) => void;
  onBlur: () => void;
  /** 候補を選んだとき。量・kcal・PFC の流し込みは親が行う。 */
  onSelect: (candidate: FoodCandidate) => void;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const matches = useMemo(
    () => (open ? filterFoodCandidates(candidates, value, VISIBLE_LIMIT) : []),
    [open, candidates, value],
  );
  // 絞り込みで候補が減ったときに、消えた行を指したままにしない。
  const active = activeIndex < matches.length ? activeIndex : -1;
  const expanded = matches.length > 0;

  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const choose = (candidate: FoodCandidate) => {
    onSelect(candidate);
    close();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      close();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(0);
        return;
      }
      if (matches.length === 0) return;
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex(
        (index) => (index + delta + matches.length) % matches.length,
      );
      return;
    }
    if (event.key === "Enter" && active >= 0) {
      const candidate = matches[active];
      if (candidate) {
        // 候補を確定する Enter はフォーム送信にしない。
        event.preventDefault();
        choose(candidate);
      }
    }
  };

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(event) => {
          onValueChange(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        // 候補は onMouseDown で確定するので、blur 時点で閉じてよい。
        onBlur={() => {
          close();
          onBlur();
        }}
        onKeyDown={handleKeyDown}
        placeholder="食品名"
        aria-label="食品名"
        aria-invalid={invalid}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        aria-activedescendant={
          active >= 0 ? `${listId}-${String(active)}` : undefined
        }
        className={className}
      />

      {expanded ? (
        <ul
          id={listId}
          // キーボード操作はフォーカスを持つ input 側で受けるので、listbox 自体は非フォーカス。
          role="listbox"
          aria-label="過去の記録から候補"
          className="border-k-line bg-k-raised absolute top-[calc(100%+4px)] right-0 left-0 z-20 max-h-64 overflow-y-auto rounded-[10px] border py-1 shadow-lg"
        >
          {matches.map((candidate, index) => (
            <li
              key={candidate.name}
              id={`${listId}-${String(index)}`}
              role="option"
              aria-selected={index === active}
              // input の blur より先に確定させる（click だと閉じた後になる）。
              onMouseDown={(event) => {
                event.preventDefault();
                choose(candidate);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={cn(
                "flex cursor-pointer items-center gap-2 px-3 py-2",
                index === active && "bg-k-chip",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">
                  {candidate.name}
                </div>
                <div className="text-k-fg-dim text-[11px]">
                  {candidate.qty === "" ? null : `${candidate.qty}・`}P
                  {dec(candidate.macros.p)} F{dec(candidate.macros.f)} C
                  {dec(candidate.macros.c)}
                </div>
              </div>
              <span className="text-k-fg-sub shrink-0 font-mono text-[13px]">
                {dec(candidate.kcal)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
