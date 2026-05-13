import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "../lib/utils";
import { normalizeSafeUrl } from "../lib/urlSafety";
import { useArcalistStore } from "../store/useArcalistStore";
import type { Bookmark } from "../types";

type Props = {
  open: boolean;
  onClose: () => void;
  bookmark: Bookmark;
  boardId: string;
};

export function BookmarkEditModal({ open, onClose, bookmark, boardId }: Props) {
  if (!open) return null;

  return (
    <BookmarkEditForm
      key={`${boardId}:${bookmark.id}`}
      onClose={onClose}
      bookmark={bookmark}
      boardId={boardId}
    />
  );
}

function BookmarkEditForm({
  onClose,
  bookmark,
  boardId,
}: Omit<Props, "open">) {
  const updateBookmark = useArcalistStore((state) => state.updateBookmark);
  const [title, setTitle] = useState(bookmark.title);
  const [url, setUrl] = useState(bookmark.url);
  const [description, setDescription] = useState(bookmark.description ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = () => {
    const trimmedTitle = title.trim();
    const normalizedUrl = normalizeSafeUrl(url);
    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }
    if (!normalizedUrl) {
      setError("Enter a safe http or https URL.");
      return;
    }
    const trimmedDescription = description.trim();
    updateBookmark(boardId, bookmark.id, {
      title: trimmedTitle,
      url: normalizedUrl,
      description: trimmedDescription.length > 0 ? trimmedDescription : "",
    });
    onClose();
  };

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
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-white font-semibold text-sm">Edit bookmark</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3">
          <div>
            <label className="text-[11px] text-slate-500">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={cn(
                "mt-1 w-full px-3 py-2 rounded-lg text-sm",
                "bg-surface-2 text-white border border-white/10",
                "outline-none focus:border-accent/40",
              )}
              placeholder="Bookmark name"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-500">URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={cn(
                "mt-1 w-full px-3 py-2 rounded-lg text-sm",
                "bg-surface-2 text-white border border-white/10",
                "outline-none focus:border-accent/40",
              )}
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-500">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={cn(
                "mt-1 w-full px-3 py-2 rounded-lg text-sm",
                "bg-surface-2 text-white border border-white/10",
                "outline-none focus:border-accent/40",
                "resize-none",
              )}
              placeholder="Optional notes"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex items-center justify-end gap-2 mt-1">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 rounded-lg text-xs bg-accent text-background hover:bg-accent-hover"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
