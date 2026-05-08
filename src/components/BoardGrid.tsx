import { BoardCard } from './BoardCard'
import type { Page } from '../data/mock'

type Props = {
  page: Page
}

export function BoardGrid({ page }: Props) {
  if (page.boards.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 text-sm">No boards yet</p>
          <p className="text-slate-600 text-xs mt-1">
            Click the + button to create your first board
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="p-6 flex-1 overflow-y-auto"
      style={{
        // CSS columns give the masonry feel without a library
        // Boards flow top-to-bottom then start a new column
        columnCount: 'auto',
        columnWidth: '220px',
        columnGap: '16px',
      }}
    >
      {page.boards.map((board) => (
        // break-inside-avoid prevents a board from being split across columns
        <div key={board.id} className="break-inside-avoid mb-4">
          <BoardCard board={board} />
        </div>
      ))}
    </div>
  )
}