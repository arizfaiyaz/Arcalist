import { X, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";

type Props = {
  selectedCount: number;
  onDelete: () => void;
  onCancel: () => void;
};

export function MultiSelectBar({ selectedCount, onDelete, onCancel }: Props) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-3 px-4 py-3",
        "arc-glass-strong rounded-2xl",
      )}
    >
      <span className="text-sm text-[var(--arc-text-primary)]">
        <span className="font-semibold text-[var(--arc-accent)]">{selectedCount}</span>{" "}
        selected
      </span>

      <div className="h-4 w-px bg-[var(--arc-glass-border)]" />

      <button
        type="button"
        onClick={onDelete}
        className="arc-btn arc-btn-danger min-h-9 px-3 text-sm"
      >
        <Trash2 size={13} />
        Delete all
      </button>

      <button
        type="button"
        onClick={onCancel}
        className="arc-btn arc-btn-secondary min-h-9 px-3 text-sm"
      >
        <X size={13} />
        Cancel
      </button>
    </div>
  );
}
