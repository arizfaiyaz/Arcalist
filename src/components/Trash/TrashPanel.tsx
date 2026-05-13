import { Trash2, RotateCcw, X, AlertTriangle } from "lucide-react";
import { cn } from "../../lib/utils";
import { useArcalistStore } from "../../store/useArcalistStore";

// Pure utility — lives outside the component so Date.now() is never called during render
function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${minutes}m ago`;
}

type Props = {
  open: boolean;
  onClose: () => void;
};

export function TrashPanel({ open, onClose }: Props) {
  const trash = useArcalistStore((state) => state.trash);
  const restoreBookmark = useArcalistStore((state) => state.restoreBookmark);
  const permanentlyDelete = useArcalistStore(
    (state) => state.permanentlyDelete,
  );
  const clearTrash = useArcalistStore((state) => state.clearTrash);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[var(--arc-overlay)] backdrop-blur-sm" />

      <div
        className={cn(
          "arc-glass-strong relative w-full max-w-md rounded-2xl",
          "overflow-hidden",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--arc-glass-border)] px-5 py-4">
          <div className="flex items-center gap-2">
            <Trash2 size={15} className="text-[var(--arc-text-secondary)]" />
            <h2 className="text-sm font-semibold text-[var(--arc-text-primary)]">Trash</h2>
            {trash.length > 0 && (
              <span className="rounded-full bg-[var(--arc-button-bg)] px-1.5 py-0.5 text-xs text-[var(--arc-text-secondary)]">
                {trash.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {trash.length > 0 && (
              <button
                type="button"
                onClick={clearTrash}
                className="rounded-lg px-2 py-1 text-xs text-red-300/80 transition-colors hover:bg-red-400/10 hover:text-red-300"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close trash"
              className="rounded-full p-1 text-[var(--arc-text-secondary)] hover:bg-[var(--arc-button-hover-bg)] hover:text-[var(--arc-text-primary)]"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto">
          {trash.length === 0 ? (
            <div className="arc-empty-state py-12">
              <Trash2 size={24} className="text-[var(--arc-text-secondary)] opacity-70" />
              <p className="text-sm font-semibold text-[var(--arc-text-primary)]">Trash is empty</p>
              <p className="text-xs text-[var(--arc-text-secondary)]">
                Deleted bookmarks will appear here before they expire.
              </p>
            </div>
          ) : (
            <div className="p-3 flex flex-col gap-1">
              {/* Sort by most recently deleted first */}
              {[...trash]
                .sort((a, b) => b.deletedAt - a.deletedAt)
                .map((item) => (
                  <div
                    key={item.bookmark.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl",
                      "hover:bg-[var(--arc-button-hover-bg)] transition-colors group",
                    )}
                  >
                    {/* Favicon */}
                    <img
                      src={item.bookmark.favicon}
                      alt=""
                      className="w-4 h-4 rounded-sm shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm text-[var(--arc-text-primary)]">
                        {item.bookmark.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[var(--arc-text-secondary)]">
                        {item.fromPageTitle} · {item.fromBoardTitle} ·{" "}
                        {timeAgo(item.deletedAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => restoreBookmark(item.bookmark.id)}
                        title="Restore"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--arc-text-secondary)] transition-colors hover:bg-[var(--arc-button-hover-bg)] hover:text-[var(--arc-accent)]"
                      >
                        <RotateCcw size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => permanentlyDelete(item.bookmark.id)}
                        title="Delete permanently"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--arc-text-secondary)] transition-colors hover:bg-red-400/10 hover:text-red-400"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}

              {/* Warning about permanent deletion */}
              <div className="mt-2 flex items-start gap-2 rounded-xl border border-[var(--arc-glass-border)] bg-[var(--arc-button-bg)] px-3 py-2">
                <AlertTriangle
                  size={12}
                  className="text-yellow-500/70 shrink-0 mt-0.5"
                />
                <p className="text-[10px] text-[var(--arc-text-secondary)]">
                  Items in trash are permanently deleted after 7 days.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
