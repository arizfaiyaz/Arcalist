import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "../lib/utils";
import { BookmarkItem } from "./BookmarkItem";
import type { Board } from "../types";
import { useArcalistStore } from "../store/useArcalistStore";

type Props = {
  board: Board;
  pageId: string;
  multiSelectMode?: boolean;
  selectedBookmarks?: string[];
  onBookmarkSelect?: (bookmarkId: string, boardId: string) => void;
};

export function BoardCard({
  board,
  pageId,
  multiSelectMode = false,
  selectedBookmarks = [],
  onBookmarkSelect,
}: Props) {
  const addBookmark = useArcalistStore((state) => state.addBookmark);
  const deleteBoard = useArcalistStore((state) => state.deleteBoard);
  const { compactMode, smartTruncation, visibilityThreshold } =
    useArcalistStore((state) => state.settings);
  const [adding, setAdding] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [showAll, setShowAll] = useState(false);

  const privacyMode = useArcalistStore((state) => state.privacyMode);
  // Make the board itself sortable (for reordering boards)
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: board.id,
    data: { type: "board", board },
  });

  // Also make the board a droppable zone (for receiving bookmarks)
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `droppable-${board.id}`,
    data: { type: "board", boardId: board.id },
  });

  // Merge both refs onto the same element
  const setRef = (node: HTMLDivElement | null) => {
    setSortableRef(node);
    setDroppableRef(node);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  const threshold = Math.max(1, visibilityThreshold || 10);
  const shouldTruncate = smartTruncation && board.bookmarks.length > threshold;
  const visibleBookmarks = shouldTruncate && !showAll
    ? board.bookmarks.slice(0, threshold)
    : board.bookmarks;
  const bookmarkIds = visibleBookmarks.map((bm) => bm.id);

  const handleAddBookmark = () => {
    const trimmed = newUrl.trim();
    if (!trimmed) {
      setAdding(false);
      return;
    }

    const url = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    let domain: string;
    try {
      domain = new URL(url).hostname;
    } catch {
      domain = trimmed;
    }

    addBookmark(board.id, {
      title: domain.replace("www.", ""),
      url,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
    });
    setNewUrl("");
    setAdding(false);
  };

  return (
    <div
      ref={setRef}
      style={style}
      className={cn(
        "bg-[var(--arc-glass-bg)] rounded-xl h-fit",
        compactMode ? "p-2" : "p-3",
        "border border-[var(--arc-glass-border)] transition-colors duration-200",
        "shadow-[var(--arc-glass-shadow)] backdrop-blur-[var(--arc-glass-blur)]",
        "hover:border-[var(--arc-glass-border)]",
        // Highlight when a bookmark is dragged over this board
        isOver && "border-accent/40 bg-accent/5",
      )}
    >
      {/* Board Header */}
      <div className="flex items-center justify-between px-1 mb-1 group">
        {/* Drag handle for the board */}
        <div className="flex items-center gap-1.5">
          <button
            {...attributes}
            {...listeners}
            className={cn(
              "opacity-0 group-hover:opacity-100 transition-opacity",
              "text-[var(--arc-text-secondary)] opacity-60 hover:opacity-100",
              "cursor-grab active:cursor-grabbing touch-none",
            )}
          >
            <GripVertical size={12} />
          </button>
          <h3
            className={cn(
              "text-xs font-semibold text-[var(--arc-text-secondary)] uppercase tracking-wider",
              "transition-all duration-200 select-none",
              privacyMode && "blur-sm",
            )}
          >
            {board.title}
          </h3>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setAdding(true)}
            className="w-5 h-5 rounded-md flex items-center justify-center text-[var(--arc-text-secondary)] hover:text-[var(--arc-accent)] hover:bg-[var(--arc-button-bg)]"
          >
            <Plus size={12} />
          </button>
          <button
            onClick={() => deleteBoard(pageId, board.id)}
            className="w-5 h-5 rounded-md flex items-center justify-center text-[var(--arc-text-secondary)] hover:text-red-400 hover:bg-[var(--arc-button-bg)]"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="h-px bg-[var(--arc-glass-border)] mb-1" />

      {/* Sortable bookmark list */}
      <SortableContext
        items={bookmarkIds}
        strategy={verticalListSortingStrategy}
      >
        <div className={cn("flex flex-col min-h-8px", compactMode ? "gap-0" : "gap-0.5")}>
          {visibleBookmarks.map((bookmark) => (
            <BookmarkItem
              key={bookmark.id}
              bookmark={bookmark}
              boardId={board.id}
              multiSelectMode={multiSelectMode}
              isSelected={selectedBookmarks.includes(bookmark.id)}
              onSelect={(id) => onBookmarkSelect?.(id, board.id)}
            />
          ))}
        </div>
      </SortableContext>

      {shouldTruncate && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className={cn(
            "mt-2 w-full text-xs text-[var(--arc-text-secondary)] hover:text-[var(--arc-text-primary)]",
            "transition-colors text-left",
          )}
        >
          {showAll
            ? "Show less"
            : `Show more (${board.bookmarks.length - threshold})`}
        </button>
      )}

      {/* Add bookmark input */}
      {adding && (
        <input
          autoFocus
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddBookmark();
            if (e.key === "Escape") setAdding(false);
          }}
          onBlur={handleAddBookmark}
          placeholder="Paste URL..."
          className={cn(
            "w-full mt-2 px-2.5 py-1.5 rounded-lg text-sm",
            "bg-[var(--arc-button-bg)] text-[var(--arc-text-primary)] border border-[var(--arc-accent)]",
            "outline-none placeholder:text-[var(--arc-text-secondary)]",
          )}
        />
      )}
    </div>
  );
}
