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
        <div className="flex items-center justify-between border-b border-[var(--arc-glass-border)] px-5 py-4">
          <h2 className="text-sm font-semibold text-[var(--arc-text-primary)]">Edit bookmark</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close edit bookmark"
            className="rounded-full p-1 text-[var(--arc-text-secondary)] hover:bg-[var(--arc-button-hover-bg)] hover:text-[var(--arc-text-primary)]"
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3">
          <div>
            <label className="text-[11px] text-[var(--arc-text-secondary)]">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Bookmark title"
              className={cn(
                "arc-input mt-1 w-full px-3 py-2 text-sm",
              )}
              placeholder="Bookmark name"
            />
          </div>

          <div>
            <label className="text-[11px] text-[var(--arc-text-secondary)]">URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              aria-label="Bookmark URL"
              className={cn(
                "arc-input mt-1 w-full px-3 py-2 text-sm",
              )}
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="text-[11px] text-[var(--arc-text-secondary)]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-label="Bookmark description"
              rows={3}
              className={cn(
                "arc-input mt-1 w-full px-3 py-2 text-sm",
                "resize-none",
              )}
              placeholder="Optional notes"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex items-center justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="arc-btn arc-btn-ghost min-h-9 px-3 text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="arc-btn arc-btn-primary min-h-9 px-4 text-xs"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
