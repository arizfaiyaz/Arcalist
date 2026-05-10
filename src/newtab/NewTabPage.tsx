import { useState, useEffect } from "react";
import { PageNav } from "../components/PageNav";
import { BoardGrid } from "../components/BoardGrid";
import { useArcalistStore } from "../store/useArcalistStore";
import { ActionBar } from "../components/ActionBar";
import { SearchOverlay } from "../components/Search/SearchOverlay";
import { ImportDialog } from "../components/Import/ImportDialog";
import { TrashPanel } from "../components/Trash/TrashPanel";

export function NewTabPage() {
  const pages = useArcalistStore((state) => state.pages);
  const activePageId = useArcalistStore((state) => state.activePageId);
  const setActivePage = useArcalistStore((state) => state.setActivePage);
  const addPage = useArcalistStore((state) => state.addPage);

  const [searchOpen, setSearchOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);

  const activePage = pages.find((p) => p.id === activePageId) ?? pages[0];

  // Global keyboard shortcut for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!activePage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
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

      <ActionBar
        onSearchOpen={() => setSearchOpen(true)}
        onImportOpen={() => setImportOpen(true)}
        onTrashOpen={() => setTrashOpen(true)}
      />

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />

      <TrashPanel open={trashOpen} onClose={() => setTrashOpen(false)} />
    </div>
  );
}
