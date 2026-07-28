import { useSyncExternalStore } from "react";

// 書き込み失敗などの一時通知。依存を増やさない最小のストア（購読 → 再描画）。
// 追加は pushToast、表示は components/kirog/toaster.tsx が担当する。

export type Toast = {
  id: number;
  tone: "error" | "info";
  message: string;
};

/** 自動で消えるまでの時間。読み終わる余裕を持たせる。 */
const DISMISS_MS = 6000;

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function pushToast(tone: Toast["tone"], message: string): void {
  const id = nextId++;
  toasts = [...toasts, { id, tone, message }];
  emit();
  setTimeout(() => dismissToast(id), DISMISS_MS);
}

export function dismissToast(id: number): void {
  const next = toasts.filter((toast) => toast.id !== id);
  if (next.length === toasts.length) return;
  toasts = next;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => toasts;

export function useToasts(): Toast[] {
  // サーバでは常に空（通知は操作の結果なので SSR では出ない）。
  return useSyncExternalStore(subscribe, getSnapshot, () => toasts);
}
