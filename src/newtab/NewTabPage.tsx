import { PageNav } from '../components/PageNav'
import { BoardGrid } from '../components/BoardGrid'
import { useArcalistStore } from '../store/useArcalistStore'

export function NewTabPage() {
  const pages = useArcalistStore((state) => state.pages)
  const activePageId = useArcalistStore((state) => state.activePageId)
  const setActivePage = useArcalistStore((state) => state.setActivePage)
  const addPage = useArcalistStore((state) => state.addPage)

  const activePage = pages.find((p) => p.id === activePageId) ?? pages[0]

  // Don't render until store is initialized
  if (!activePage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageNav
        pages={pages}
        activePageId={activePageId}
        onPageChange={setActivePage}
        onAddPage={addPage}
      />
      <BoardGrid page={activePage} />
    </div>
  )
}