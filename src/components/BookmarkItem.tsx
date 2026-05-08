import { cn } from '../lib/utils'
import type { Bookmark } from '../data/mock'

type Props = {
  bookmark: Bookmark
}
export function BookmarkItem({ bookmark }: Props) {
  const handleClick = () => {
    window.open(bookmark.url, '_self')
  }
  return (
    <button onClick={handleClick}
      className={cn('w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg',
        'text-left text-sm text-slate-300',
        'transition-all duration-150',
        'hover:bg-surface-2 hover:text-white',
        'group'
      )}>
      {/* favicon */}
      <img src={bookmark.favicon} alt={bookmark.title} className="w-4 h-4 rounded-sm shrink-0"
        onError={(e) => {
          const target = e.currentTarget
          target.style.display = 'none'
          target.nextElementSibling?.removeAttribute('hidden')
      }}
      />
      <div
              hidden
              className="w-4 h-4 rounded-sm shrink-0 bg-surface-2 flex items-center justify-center"
            >
        <span>{bookmark.title.charAt(0)}</span>
      </div>
      {/* title */}
      <span className='truncate leading-none'>{bookmark.title}</span>
    </button>
  )
}