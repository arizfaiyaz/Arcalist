import { useState } from 'react'
import { PageNav } from '../components/PageNav'
import { BoardGrid } from '../components/BoardGrid'
import { mockPages } from '../data/mock'

export function NewTabPage() {
  // Track which page tab is active
  const [activePageId, setActivePageId] = useState(mockPages[0].id)

  // Find the full page object for the active tab
  const activePage = mockPages.find((p) => p.id === activePageId) ?? mockPages[0]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageNav
        pages={mockPages}
        activePageId={activePageId}
        onPageChange={setActivePageId}
      />
      <BoardGrid page={activePage} />
    </div>
  )
}