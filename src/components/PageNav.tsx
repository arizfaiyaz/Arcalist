import { Plus } from 'lucide-react'
import { cn } from '../lib/utils'
import type { Page } from '../data/mock'

type Props = {
  pages: Page[]
  activePageId: string
  onPageChange: (id: string) => void
}

export function PageNav({ pages, activePageId, onPageChange }: Props) {
  return (
    <nav
      className={cn(
        'flex items-center gap-1.5 px-4 py-3',
        'border-b border-white/5',
        'bg-surface/50 backdrop-blur-sm',
        // Stick to top
        'sticky top-0 z-10'
      )}
    >
      {/* Page Tabs */}
      {pages.map((page) => {
        const isActive = page.id === activePageId
        return (
          <button
            key={page.id}
            onClick={() => onPageChange(page.id)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium',
              'transition-all duration-150',
              isActive
                ? 'bg-accent text-background font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-surface-2'
            )}
          >
            {page.title}
          </button>
        )
      })}

      {/* Add New Page Button */}
      <button
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center',
          'text-slate-500 hover:text-white',
          'hover:bg-surface-2 transition-all duration-150',
          'border border-white/10 hover:border-white/20',
          'ml-1'
        )}
        title="Add new page"
      >
        <Plus size={14} />
      </button>
    </nav>
  )
}