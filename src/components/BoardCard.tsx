import { useState } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'
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
    data: { type: 'board', board },
  })

  // Also make the board a droppable zone (for receiving bookmarks)
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `droppable-${board.id}`,
    data: { type: 'board', boardId: board.id },
  })

  // Merge both refs onto the same element
  const setRef = (node: HTMLDivElement | null) => {
    setSortableRef(node)
    setDroppableRef(node)
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  }

  const bookmarkIds = board.bookmarks.map((bm) => bm.id)

  const handleAddBookmark = () => {
    const trimmed = newUrl.trim()
    if (!trimmed) { setAdding(false); return }

    const url = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
    let domain: string
    try { domain = new URL(url).hostname } catch { domain = trimmed }

    addBookmark(board.id, {
      title: domain.replace('www.', ''),
      url,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
    })
    setNewUrl('')
    setAdding(false)
  }

  return (
    <div
      ref={setRef}
      style={style}
      className={cn(
        'bg-surface rounded-xl p-3 h-fit',
        'border border-white/5 transition-colors duration-200',
        'hover:border-white/10',
        // Highlight when a bookmark is dragged over this board
        isOver && 'border-accent/40 bg-accent/5'
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
              'opacity-0 group-hover:opacity-100 transition-opacity',
              'text-slate-600 hover:text-slate-400',
              'cursor-grab active:cursor-grabbing touch-none'
            )}
          >
            <GripVertical size={12} />
          </button>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {board.title}
          </h3>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setAdding(true)}
            className="w-5 h-5 rounded-md flex items-center justify-center text-slate-500 hover:text-accent hover:bg-surface-2"
          >
            <Plus size={12} />
          </button>
          <button
            onClick={() => deleteBoard(pageId, board.id)}
            className="w-5 h-5 rounded-md flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-surface-2"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="h-px bg-white/5 mb-1" />

      {/* Sortable bookmark list */}
      <SortableContext items={bookmarkIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-0.5 min-h-8px">
          {board.bookmarks.map((bookmark) => (
            <BookmarkItem
              key={bookmark.id}
              bookmark={bookmark}
              boardId={board.id}
            />
          ))}
        </div>
      </SortableContext>

      {/* Add bookmark input */}
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