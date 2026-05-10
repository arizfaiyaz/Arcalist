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
        "bg-surface border border-white/10 rounded-2xl",
        "shadow-2xl shadow-black/40",
      )}
    >
      <span className="text-slate-300 text-sm">
        <span className="text-accent font-semibold">{selectedCount}</span>{" "}
        selected
      </span>

      <div className="w-px h-4 bg-white/10" />

      <button
        onClick={onDelete}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-red-400 hover:bg-red-400/10 transition-colors"
      >
        <Trash2 size={13} />
        Delete all
      </button>

      <button
        onClick={onCancel}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-surface-2 transition-colors"
      >
        <X size={13} />
        Cancel
      </button>
    </div>
  );
}
