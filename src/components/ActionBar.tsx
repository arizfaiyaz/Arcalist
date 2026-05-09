import { Search, Download, Settings } from 'lucide-react'
import { cn } from '../lib/utils'

type Props = {
  onSearchOpen: () => void
  onImportOpen: () => void
}

export function ActionBar({ onSearchOpen, onImportOpen }: Props) {
  return (
    <div className={cn(
      'fixed right-4 top-1/2 -translate-y-1/2 z-40',
      'flex flex-col gap-2'
    )}>
      {[
        { icon: Search, label: 'Search (Ctrl+K)', onClick: onSearchOpen },
        { icon: Download, label: 'Import bookmarks', onClick: onImportOpen },
        { icon: Settings, label: 'Settings', onClick: () => {} },
      ].map(({ icon: Icon, label, onClick }) => (
        <button
          key={label}
          onClick={onClick}
          title={label}
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center',
            'bg-surface border border-white/10',
            'text-slate-400 hover:text-white',
            'hover:border-accent/30 hover:bg-surface-2',
            'transition-all duration-150',
            'shadow-lg shadow-black/20'
          )}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  )
}