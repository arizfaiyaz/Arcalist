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
            'bg-surface-2 border border-accent/30',
            'shadow-xl shadow-black/40',
            'cursor-grabbing w-48'
          )}>
            <img
              src={activeBookmark.favicon}
              alt=""
              className="w-4 h-4 rounded-sm shrink-0"
            />
            <span className="truncate text-sm text-white">
              {activeBookmark.title}
            </span>
          </div>
        )}
  
        {/* Board ghost */}
        {activeBoard && (
          <div className={cn(
            'bg-surface rounded-xl p-3',
            'border border-accent/30',
            'shadow-xl shadow-black/40',
            'opacity-90 cursor-grabbing w-56'
          )}>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              {activeBoard.title}
            </h3>
            <div className="h-px bg-white/5 my-2" />
            <p className="text-xs text-slate-500 px-1">
              {activeBoard.bookmarks.length} bookmarks
            </p>
          </div>
        )}
      </DndDragOverlay>
    )
  
}