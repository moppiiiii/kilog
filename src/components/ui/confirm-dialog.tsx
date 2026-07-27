import { AlertDialog } from "radix-ui";

import { Button } from "@/components/ui/button";

// 確認ダイアログ（radix AlertDialog）。open で制御し、確定/取消を親に委譲する。
// Esc・オーバーレイクリックは取消として扱う（onOpenChange(false) → onCancel）。

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "削除",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm" />
        <AlertDialog.Content className="border-k-line bg-k-panel fixed top-1/2 left-1/2 z-[90] w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-6 shadow-xl">
          <AlertDialog.Title className="text-[15px] font-bold">
            {title}
          </AlertDialog.Title>
          {description ? (
            <AlertDialog.Description className="text-k-fg-dim mt-2 text-sm leading-relaxed">
              {description}
            </AlertDialog.Description>
          ) : null}
          <div className="mt-6 flex justify-end gap-2.5">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" size="sm" className="rounded-[9px]">
                キャンセル
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button
                variant="destructive"
                size="sm"
                className="rounded-[9px] font-bold"
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
