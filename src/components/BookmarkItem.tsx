import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '../lib/utils'
import { useArcalistStore } from '../store/useArcalistStore'
import type { Bookmark } from '../types'

type Props = {
  bookmark: Bookmark
  boardId: string
}

export function BookmarkItem({ bookmark, boardId }: Props) {
  const deleteBookmark = useArcalistStore((state) => state.deleteBookmark)
  const [imgError, setImgError] = useState(false)

  return (
    <div className="group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-surface-2 transition-all duration-150">
      {/* Clickable area */}
      <button
        onClick={() => window.open(bookmark.url, '_self')}
        className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
      >
        {/* Favicon */}
        {!imgError ? (
          <img
            src={bookmark.favicon}
            alt=""
            className="w-4 h-4 rounded-sm shrink-0"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-4 h-4 rounded-sm shrink-0 bg-surface-2 flex items-center justify-center">
            <span className="text-[8px] text-slate-400 font-bold uppercase">
              {bookmark.title.charAt(0)}
            </span>
          </div>
        )}
        <span className="truncate text-sm text-slate-300 group-hover:text-white leading-none">
          {bookmark.title}
        </span>
      </button>

      {/* Delete button — only visible on hover */}
      <button
        onClick={() => deleteBookmark(boardId, bookmark.id)}
        className={cn(
          'opacity-0 group-hover:opacity-100 transition-opacity',
          'w-4 h-4 flex items-center justify-center shrink-0',
          'text-slate-600 hover:text-red-400'
        )}
        title="Remove bookmark"
      >
        <X size={10} />
      </button>
    </div>
  )
}
