import { dismissToast, useToasts } from "@/lib/toast";
import { cn } from "@/lib/utils";

// 一時通知の表示口。__root.tsx で 1 度だけ描画する。
// 書き込み（mutation）の失敗はここに出る＝保存できたつもりを防ぐ。

export function Toaster() {
  const toasts = useToasts();
  if (toasts.length === 0) return null;

  return (
    <div
      // SP はボトムタブの上に重ねる。操作は妨げない（pointer-events は各通知だけ）。
      className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[100] flex flex-col items-center gap-2 px-4 md:right-6 md:bottom-6 md:left-auto md:items-end md:px-0"
      role="region"
      aria-label="通知"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === "error" ? "alert" : "status"}
          className={cn(
            "pointer-events-auto flex w-full max-w-[420px] items-start gap-3 rounded-xl border px-4 py-3 text-[13px] shadow-lg backdrop-blur",
            toast.tone === "error"
              ? "border-k-danger/40 bg-k-danger/15 text-k-danger"
              : "border-k-line bg-k-panel/95 text-k-fg",
          )}
        >
          <span className="flex-1 leading-relaxed">{toast.message}</span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="通知を閉じる"
            className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
