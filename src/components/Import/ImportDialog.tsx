import { useMemo, useState, useRef } from 'react'
import { Upload, X, Check, FileText } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useArcalistStore } from '../../store/useArcalistStore'
import { usePlanLimits } from '../../hooks/usePlanLimits'
import { getVisiblePagesForPlan } from '../../lib/planLimits'
import { getSafeDomain, normalizeSafeUrl } from '../../lib/urlSafety'

type ParsedBookmark = {
  title: string
  url: string
  favicon: string
}

type Props = {
  open: boolean
  onClose: () => void
}

export function ImportDialog({ open, onClose }: Props) {
  const allPages = useArcalistStore((state) => state.pages)
  const addBookmark = useArcalistStore((state) => state.addBookmark)
  const planLimits = usePlanLimits()
  const pages = useMemo(
    () => getVisiblePagesForPlan(allPages, planLimits),
    [allPages, planLimits],
  )

  const [parsed, setParsed] = useState<ParsedBookmark[]>([])
  const [targetBoardId, setTargetBoardId] = useState('')
  const [step, setStep] = useState<'upload' | 'confirm'>('upload')
  const [done, setDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  // Parse Chrome's exported bookmarks HTML file
  const parseBookmarksFile = (html: string): ParsedBookmark[] => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const links = Array.from(doc.querySelectorAll('a'))

    return links
      .map((a) => ({
        title: a.textContent?.trim() ?? "",
        url: normalizeSafeUrl(a.getAttribute('href') ?? a.href),
      }))
      .filter((item): item is { title: string; url: string } => Boolean(item.url))
      .map((a) => {
        const domain = getSafeDomain(a.url) ?? ''
        return {
          title: a.title || domain,
          url: a.url,
          favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
        }
      })
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const html = ev.target?.result as string
      const bookmarks = parseBookmarksFile(html)
      setParsed(bookmarks)
      // Default to first available board
      if (pages[0]?.boards[0]) {
        setTargetBoardId(pages[0].boards[0].id)
      }
      setStep('confirm')
    }
    reader.readAsText(file)
  }

  const handleImport = () => {
    if (!targetBoardId) return
    parsed.forEach((bm) => {
      addBookmark(targetBoardId, {
        title: bm.title,
        url: bm.url,
        favicon: bm.favicon,
      })
    })
    setDone(true)
    setTimeout(() => {
      onClose()
      setStep('upload')
      setParsed([])
      setDone(false)
    }, 1500)
  }

  const handleClose = () => {
    onClose()
    setStep('upload')
    setParsed([])
    setDone(false)
  }

  // Flatten all boards for the dropdown
  const allBoards = pages.flatMap((p) =>
    p.boards.map((b) => ({ ...b, pageTitle: p.title }))
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-[var(--arc-overlay)] backdrop-blur-sm" />

      <div
        className={cn(
          'relative w-full max-w-md mx-4',
          'bg-[var(--arc-modal-bg)] border border-[var(--arc-glass-border)] rounded-2xl',
          'shadow-2xl shadow-black/60 p-6'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[var(--arc-text-primary)] font-semibold">Import Bookmarks</h2>
          <button onClick={handleClose} className="text-[var(--arc-text-secondary)] hover:text-[var(--arc-text-primary)]">
            <X size={16} />
          </button>
        </div>

        {/* Step 1 — Upload */}
        {step === 'upload' && (
          <div>
            <p className="text-[var(--arc-text-secondary)] text-sm mb-4">
              Export your Chrome bookmarks as an HTML file, then upload it here.
              <br />
              <span className="text-slate-500 text-xs mt-1 block">
                Chrome → Bookmarks → Bookmark Manager → ⋮ → Export bookmarks
              </span>
            </p>

            {/* Drop zone */}
            <button
              onClick={() => fileRef.current?.click()}
              className={cn(
                'w-full border-2 border-dashed border-white/10 rounded-xl p-8',
                'flex flex-col items-center gap-3',
                'hover:border-accent/40 hover:bg-accent/5',
                'transition-all duration-200 text-center'
              )}
            >
              <Upload size={24} className="text-slate-500" />
              <div>
                <p className="text-slate-300 text-sm">Click to upload HTML file</p>
                <p className="text-slate-500 text-xs mt-1">
                  bookmarks_month_year.html
                </p>
              </div>
            </button>

            <input
              ref={fileRef}
              type="file"
              accept=".html,.htm"
              onChange={handleFile}
              className="hidden"
            />
          </div>
        )}

        {/* Step 2 — Confirm */}
        {step === 'confirm' && (
          <div>
            {/* Summary */}
            <div className="flex items-center gap-3 bg-[var(--arc-button-bg)] rounded-xl p-3 mb-4">
              <FileText size={16} className="text-[var(--arc-accent)] shrink-0" />
              <div>
                <p className="text-[var(--arc-text-primary)] text-sm font-medium">
                  {parsed.length} bookmarks found
                </p>
                <p className="text-slate-500 text-xs">Ready to import</p>
              </div>
            </div>

            {/* Preview — first 5 */}
            <div className="mb-4 max-h-36 overflow-y-auto flex flex-col gap-1">
              {parsed.slice(0, 5).map((bm, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1">
                  <img src={bm.favicon} alt="" className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-slate-300 text-xs truncate">{bm.title}</span>
                </div>
              ))}
              {parsed.length > 5 && (
                <p className="text-slate-500 text-xs px-2 mt-1">
                  + {parsed.length - 5} more
                </p>
              )}
            </div>

            {/* Board selector */}
            <div className="mb-5">
              <label className="text-slate-400 text-xs block mb-1.5">
                Import into board
              </label>
              <select
                value={targetBoardId}
                onChange={(e) => setTargetBoardId(e.target.value)}
                className={cn(
                  'w-full bg-[var(--arc-button-bg)] text-[var(--arc-text-primary)] text-sm',
                  'border border-[var(--arc-glass-border)] rounded-lg px-3 py-2',
                  'outline-none focus:border-[var(--arc-accent)]'
                )}
              >
                {allBoards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.pageTitle} → {b.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setStep('upload')}
                className="flex-1 py-2 rounded-lg text-sm text-slate-400 hover:text-white bg-surface-2 hover:bg-white/10 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={done}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                  done
                    ? 'bg-accent/20 text-accent'
                    : 'bg-accent text-background hover:bg-accent-hover'
                )}
              >
                {done ? (
                  <span className="flex items-center justify-center gap-2">
                    <Check size={14} /> Imported!
                  </span>
                ) : (
                  `Import ${parsed.length} bookmarks`
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
