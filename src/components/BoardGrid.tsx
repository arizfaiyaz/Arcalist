import { useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '../lib/utils'
import { BoardCard } from './BoardCard'
import { useArcalistStore } from '../store/useArcalistStore'
import type { Page } from '../types'

type Props = {
  page: Page
}

export function BoardGrid({ page }: Props) {
  const addBoard = useArcalistStore((state) => state.addBoard)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const handleAdd = () => {
    const trimmed = newTitle.trim()
    if (trimmed) addBoard(page.id, trimmed)
    setNewTitle('')
    setAdding(false)
  }

  if (page.boards.length === 0 && !adding) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-slate-500 text-sm">No boards yet</p>
        <button
          onClick={() => setAdding(true)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg',
            'bg-surface-2 text-slate-400 hover:text-white',
            'border border-white/10 hover:border-accent/30',
            'transition-all duration-150 text-sm'
          )}
        >
          <Plus size={14} />
          Add your first board
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 flex-1 overflow-y-auto">
      <div
        style={{
          columnCount: 'auto',
          columnWidth: '220px',
          columnGap: '16px',
        }}
      >
        {page.boards.map((board) => (
          <div key={board.id} className="break-inside-avoid mb-4">
          <BoardCard board={board} pageId={page.id} />
          </div>
        ))}

        {/* Add board inline input */}
        {adding && (
          <div className="break-inside-avoid mb-4">
            <div className="bg-surface rounded-xl p-3 border border-accent/30">
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd()
                  if (e.key === 'Escape') setAdding(false)
                }}
                onBlur={handleAdd}
                placeholder="Board name..."
                className={cn(
                  'w-full bg-transparent text-sm text-white',
                  'outline-none placeholder:text-slate-500 px-1'
                )}
              />
            </div>
          </div>
        )}
      </div>

      {/* Add board button — bottom left */}
      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className={cn(
            'flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg',
            'text-slate-500 hover:text-white text-sm',
            'hover:bg-surface-2 transition-all duration-150'
          )}
        >
          <Plus size={14} />
          Add board
        </button>
      )}
    </div>
  )
}