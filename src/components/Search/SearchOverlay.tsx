import { useState, useEffect, useMemo, useRef } from 'react'
import { Search, X, ArrowRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useArcalistStore } from '../../store/useArcalistStore'
import type { Bookmark } from '../../types'

type SearchResult = {
  bookmark: Bookmark
  boardTitle: string
  pageTitle: string
  boardId: string
}

type Props = {
  open: boolean
  onClose: () => void
}

export function SearchOverlay({ open, onClose }: Props) {
  const pages = useArcalistStore((state) => state.pages)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when overlay opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setTimeout(() => setQuery(''), 50)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Flatten all bookmarks with their context for searching
  const allResults = useMemo<SearchResult[]>(() => {
    const results: SearchResult[] = []
    for (const page of pages) {
      for (const board of page.boards) {
        for (const bookmark of board.bookmarks) {
          results.push({
            bookmark,
            boardTitle: board.title,
            pageTitle: page.title,
            boardId: board.id,
          })
        }
      }
    }
    return results
  }, [pages])

  // Filter based on query
  const filtered = useMemo(() => {
    if (!query.trim()) return allResults.slice(0, 8) // show first 8 when no query
    const q = query.toLowerCase()
    return allResults
      .filter(
        (r) =>
          r.bookmark.title.toLowerCase().includes(q) ||
          r.bookmark.url.toLowerCase().includes(q) ||
          r.boardTitle.toLowerCase().includes(q) ||
          r.pageTitle.toLowerCase().includes(q)
      )
      .slice(0, 10) // max 10 results
  }, [query, allResults])

  if (!open) return null

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      onClick={onClose}
    >
      {/* Blur backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Search panel */}
      <div
        className={cn(
          'relative w-full max-w-xl mx-4',
          'bg-surface border border-white/10 rounded-2xl',
          'shadow-2xl shadow-black/60',
          'overflow-hidden'
        )}
        onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bookmarks, boards, pages..."
            className={cn(
              'flex-1 bg-transparent text-white text-sm',
              'outline-none placeholder:text-slate-500'
            )}
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-500 hover:text-white">
              <X size={14} />
            </button>
          )}
          <kbd className="text-[10px] text-slate-500 bg-surface-2 px-1.5 py-0.5 rounded border border-white/10">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">
              No bookmarks found
            </p>
          ) : (
            filtered.map((result) => (
              <SearchResult
                key={result.bookmark.id}
                result={result}
                query={query}
                onSelect={onClose}
              />
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-white/5 flex items-center gap-4">
          <span className="text-[10px] text-slate-600">
            {allResults.length} bookmarks across {pages.length} pages
          </span>
        </div>
      </div>
    </div>
  )
}

// Individual result row
function SearchResult({
  result,
  query,
  onSelect,
}: {
  result: SearchResult
  query: string
  onSelect: () => void
}) {
  const { bookmark, boardTitle, pageTitle } = result
  const [imgError, setImgError] = useState(false)

  const handleClick = () => {
    window.open(bookmark.url, '_self')
    onSelect()
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-2.5',
        'hover:bg-surface-2 transition-colors duration-100',
        'text-left group'
      )}
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
        <div className="w-4 h-4 rounded-sm bg-surface-2 flex items-center justify-center shrink-0">
          <span className="text-[8px] text-slate-400 font-bold uppercase">
            {bookmark.title.charAt(0)}
          </span>
        </div>
      )}

      {/* Title + breadcrumb */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200 truncate">
          <Highlight text={bookmark.title} query={query} />
        </p>
        <p className="text-[10px] text-slate-500 truncate mt-0.5">
          {pageTitle} · {boardTitle}
        </p>
      </div>

      <ArrowRight
        size={12}
        className="text-slate-600 group-hover:text-accent transition-colors shrink-0"
      />
    </button>
  )
}

// Highlights the matching portion of text in green
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>

  const index = text.toLowerCase().indexOf(query.toLowerCase())
  if (index === -1) return <>{text}</>

  return (
    <>
      {text.slice(0, index)}
      <span className="text-accent font-medium">
        {text.slice(index, index + query.length)}
      </span>
      {text.slice(index + query.length)}
    </>
  )
}