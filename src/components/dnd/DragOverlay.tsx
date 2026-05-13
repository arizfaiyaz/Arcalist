import { DragOverlay as DndDragOverlay } from "@dnd-kit/core";
import { cn } from "../../lib/utils";
import type { Bookmark, Board } from "../../types";

type Props = {
  activeBookmark: Bookmark | null
  activeBoard: Board | null
}

export function ArcalistDragOverlay({ activeBoard, activeBookmark }: Props) {

  return (
      <DndDragOverlay>
        {/* Bookmark ghost */}
        {activeBookmark && (
          <div className={cn(
            'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg',
            'bg-[var(--arc-button-bg)] border border-[var(--arc-accent)]',
            'shadow-xl shadow-black/40',
            'cursor-grabbing w-48'
          )}>
            <img
              src={activeBookmark.favicon}
              alt=""
              className="w-4 h-4 rounded-sm shrink-0"
            />
            <span className="truncate text-sm text-[var(--arc-text-primary)]">
              {activeBookmark.title}
            </span>
          </div>
        )}
  
        {/* Board ghost */}
        {activeBoard && (
          <div className={cn(
            'arc-glass-soft rounded-xl p-3',
            'border-[var(--arc-accent)]',
            'shadow-xl shadow-black/40',
            'opacity-90 cursor-grabbing w-56'
          )}>
            <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-[var(--arc-text-secondary)]">
              {activeBoard.title}
            </h3>
            <div className="my-2 h-px bg-[var(--arc-glass-border)]" />
            <p className="px-1 text-xs text-[var(--arc-text-secondary)]">
              {activeBoard.bookmarks.length} bookmarks
            </p>
          </div>
        )}
      </DndDragOverlay>
    )
  
}
