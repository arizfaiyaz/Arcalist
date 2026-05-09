import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '../lib/utils'
import { BookmarkItem } from './BookmarkItem'
import type { Board } from '../types'
import { useArcalistStore } from '../store/useArcalistStore'
type Props = {
  board: Board
  pageId: string
}

export function BoardCard({ board, pageId }: Props) {
  const addBookmark = useArcalistStore((state) => state.addBookmark)
  const deleteBoard = useArcalistStore((state) => state.deleteBoard)

  const [adding, setAdding] = useState(false)
  const [newUrl, setNewUrl] = useState('')

  const handleAddBookmark = () => {
    const trimmed = newUrl.trim()
    if (!trimmed) {
      setAdding(false)
      return
    }

    // Normalize URL — add https if missing
    const url = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`

    // Extract domain for favicon and use as title fallback
    let domain: string
    try {
      domain = new URL(url).hostname
    } catch {
      domain = trimmed
    }

    addBookmark(board.id, {
      title: domain.replace('www.', ''),
      url,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
    })

    setNewUrl('')
    setAdding(false)
  }

  return (
    <div className={cn(
      'bg-surface rounded-xl p-3',
      'border border-white/5',
      'hover:border-white/10 transition-colors duration-200',
      'h-fit'
    )}>
      {/* Board Header */}
      <div className="flex items-center justify-between px-1 mb-1 group">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {board.title}
        </h3>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Add bookmark */}
          <button
            onClick={() => setAdding(true)}
            className="w-5 h-5 rounded-md flex items-center justify-center text-slate-500 hover:text-accent hover:bg-surface-2"
            title="Add bookmark"
          >
            <Plus size={12} />
          </button>
          {/* Delete board */}
          <button
            onClick={() => deleteBoard(pageId, board.id)}
            className="w-5 h-5 rounded-md flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-surface-2"
            title="Delete board"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="h-px bg-white/5 mb-1" />

      {/* Bookmarks */}
      <div className="flex flex-col gap-0.5">
        {board.bookmarks.map((bookmark) => (
          <BookmarkItem
            key={bookmark.id}
            bookmark={bookmark}
            boardId={board.id}
          />
        ))}
      </div>

      {/* Inline add bookmark input */}
      {adding && (
        <input
          autoFocus
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddBookmark()
            if (e.key === 'Escape') setAdding(false)
          }}
          onBlur={handleAddBookmark}
          placeholder="Paste URL..."
          className={cn(
            'w-full mt-2 px-2.5 py-1.5 rounded-lg text-sm',
            'bg-surface-2 text-white border border-accent/30',
            'outline-none placeholder:text-slate-500'
          )}
        />
      )}
    </div>
  )
}