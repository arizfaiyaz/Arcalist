import { Plus } from 'lucide-react'
import { cn } from '../lib/utils'
import { BookmarkItem } from './BookmarkItem'
import type { Board } from '../data/mock'

type Props = {
  board: Board
}

export function BoardCard({ board }: Props) {
  return (
    <div
          className={cn(
            'bg-surface rounded-xl p-3',
            'border border-white/5',
            'flex flex-col gap-1',
            // This makes boards feel "alive" on hover
            'hover:border-white/10 transition-colors duration-200',
            // Self-contained height — no stretching
            'h-fit'
          )}
        >
          {/* Board Header */}
          <div className="flex items-center justify-between px-1 mb-1 group">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {board.title}
            </h3>
            
            {/* Add bookmark button — visible on board hover */}
            <button
              className={cn(
                'opacity-0 group-hover:opacity-100',
                'transition-opacity duration-150',
                'w-5 h-5 rounded-md flex items-center justify-center',
                'text-slate-500 hover:text-accent hover:bg-surface-2'
              )}
              title="Add bookmark"
            >
              <Plus size={12} />
            </button>
          </div>
    
          {/* Separator */}
          <div className="h-px bg-white/5 mb-1" />
    
          {/* Bookmark List */}
          <div className="flex flex-col gap-0.5">
            {board.bookmarks.map((bookmark) => (
              <BookmarkItem key={bookmark.id} bookmark={bookmark} />
            ))}
          </div>
        </div>
  )
}