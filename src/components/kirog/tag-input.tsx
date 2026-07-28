import { useState } from "react";

import { cn } from "@/lib/utils";

// 文字列タグの編集（部位タグ・セッションのタグ）。チップで消し、入力欄で足す。
// 値の保存は親（onChange）に委譲する＝この部品は状態を持たない。

export function TagInput({
  values,
  onChange,
  placeholder = "＋ タグ",
  label,
  className,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** 入力欄の aria-label。 */
  label: string;
  className?: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const value = draft.trim();
    if (value === "" || values.includes(value)) {
      setDraft("");
      return;
    }
    onChange([...values, value]);
    setDraft("");
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {values.map((value) => (
        <button
          key={value}
          type="button"
          aria-label={`${value} を外す`}
          onClick={() => onChange(values.filter((item) => item !== value))}
          className="border-k-accent-edge bg-k-accent-bg text-k-accent-soft rounded-2xl border px-3 py-1.5 text-xs transition-colors"
        >
          {value} <span className="opacity-60">✕</span>
        </button>
      ))}
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          // 親のフォーム送信を誘発しないよう既定動作は止める。
          event.preventDefault();
          add();
        }}
        onBlur={add}
        placeholder={placeholder}
        aria-label={label}
        className="border-k-line-strong bg-k-chip text-k-fg placeholder:text-k-fg-faint w-24 rounded-2xl border px-3 py-1.5 text-xs outline-none"
      />
    </div>
  );
}
