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
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className={cn(
          "relative w-full max-w-md mx-4",
          "bg-surface border border-white/10 rounded-2xl",
          "shadow-2xl shadow-black/60",
          "overflow-hidden",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Trash2 size={15} className="text-slate-400" />
            <h2 className="text-white font-semibold text-sm">Trash</h2>
            {trash.length > 0 && (
              <span className="text-xs bg-surface-2 text-slate-400 px-1.5 py-0.5 rounded-full">
                {trash.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {trash.length > 0 && (
              <button
                onClick={clearTrash}
                className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-white"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto">
          {trash.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Trash2 size={24} className="text-slate-600" />
              <p className="text-slate-500 text-sm">Trash is empty</p>
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
                      "hover:bg-surface-2 transition-colors group",
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
                      <p className="text-slate-300 text-sm truncate">
                        {item.bookmark.title}
                      </p>
                      <p className="text-slate-500 text-[10px] mt-0.5">
                        {item.fromPageTitle} · {item.fromBoardTitle} ·{" "}
                        {timeAgo(item.deletedAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => restoreBookmark(item.bookmark.id)}
                        title="Restore"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-accent hover:bg-accent/10 transition-colors"
                      >
                        <RotateCcw size={12} />
                      </button>
                      <button
                        onClick={() => permanentlyDelete(item.bookmark.id)}
                        title="Delete permanently"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}

              {/* Warning about permanent deletion */}
              <div className="flex items-start gap-2 mt-2 px-3 py-2 rounded-xl bg-surface-2">
                <AlertTriangle
                  size={12}
                  className="text-yellow-500/70 shrink-0 mt-0.5"
                />
                <p className="text-[10px] text-slate-500">
                  Items in trash are permanently deleted after 30 days.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
