import { useState, useEffect } from "react";
import { useArcalistStore } from "../store/useArcalistStore";
import { PageNav } from "../components/PageNav";
import { BoardGrid } from "../components/BoardGrid";
import { SearchOverlay } from "../components/Search/SearchOverlay";
import { ImportDialog } from "../components/Import/ImportDialog";
import { ActionBar } from "../components/ActionBar";
import { TrashPanel } from "../components/Trash/TrashPanel";
import { SettingsPanel } from "../components/Settings/SettingsPanel";
import { WallpaperPanel } from "../components/Wallpaper/WallpaperPanel";
import { WallpaperButton } from "../components/Wallpaper/WallpaperButton";
import { MultiSelectBar } from "../components/MultiSelect/MultiSelectBar";

export function NewTabPage() {
  const pages = useArcalistStore((state) => state.pages);
  const activePageId = useArcalistStore((state) => state.activePageId);
  const setActivePage = useArcalistStore((state) => state.setActivePage);
  const addPage = useArcalistStore((state) => state.addPage);
  const deletePage = useArcalistStore((state) => state.deletePage);
  const trashBookmark = useArcalistStore((state) => state.trashBookmark);
  const cleanupTrash = useArcalistStore((state) => state.cleanupTrash);
  const wallpaperTheme = useArcalistStore((state) => state.wallpaperTheme);
  const overflowBoards = useArcalistStore((state) => state.overflowBoards ?? []);

  const [searchOpen, setSearchOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [wallpaperOpen, setWallpaperOpen] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [overflowNoticeDismissed, setOverflowNoticeDismissed] = useState(false);
  const [selectedBookmarks, setSelectedBookmarks] = useState<
    { id: string; boardId: string }[]
  >([]);

  const activePage = pages.find((p) => p.id === activePageId) ?? pages[0];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setMultiSelectMode(false);
        setSelectedBookmarks([]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    cleanupTrash();
    const interval = setInterval(() => cleanupTrash(), 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [cleanupTrash]);

  const handleBookmarkSelect = (bookmarkId: string, boardId: string) => {
    setSelectedBookmarks((prev) => {
      const exists = prev.find((b) => b.id === bookmarkId);
      if (exists) return prev.filter((b) => b.id !== bookmarkId);
      return [...prev, { id: bookmarkId, boardId }];
    });
  };

  const handleBulkDelete = () => {
    selectedBookmarks.forEach(({ id, boardId }) => {
      trashBookmark(boardId, id);
    });
    setSelectedBookmarks([]);
    setMultiSelectMode(false);
  };

  if (!activePage) {
    return (
      <div
        className="min-h-screen bg-background flex items-center justify-center"
        style={wallpaperTheme.url ? { background: "transparent" } : undefined}
      >
        <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div
      className={
        wallpaperTheme.url
          ? "min-h-screen newtab-layout"
          : "min-h-screen bg-background newtab-layout"
      }
    >
      <aside className="newtab-rail newtab-rail-left">
        <div className="relative flex flex-col items-center gap-3">
          <WallpaperButton
            layout="rail"
            onClick={() => setWallpaperOpen((v) => !v)}
          />
          <WallpaperPanel
            open={wallpaperOpen}
            onClose={() => setWallpaperOpen(false)}
            layout="rail"
          />
        </div>
      </aside>

      <main className="newtab-center">
        <PageNav
          pages={pages}
          activePageId={activePageId}
          onPageChange={setActivePage}
          onAddPage={addPage}
          onDeletePage={deletePage}
        />

        {overflowBoards.length > 0 && !overflowNoticeDismissed && (
          <div className="mt-3 mb-2 flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/80">
            <div className="flex-1">
              <p className="text-amber-100">
                Some boards are hidden because the free plan supports up to 30
                visible boards.
              </p>
              <p className="text-amber-100/70">
                Your hidden boards are safe and can be restored when you
                upgrade.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled
                className="px-2.5 py-1 rounded-full text-xs border border-amber-300/30 text-amber-100/60 opacity-70 cursor-not-allowed"
                title="Upgrade coming soon"
              >
                Upgrade coming soon
              </button>
              <button
                onClick={() => setOverflowNoticeDismissed(true)}
                className="px-2 py-1 rounded-full text-xs text-amber-100/70 hover:text-amber-100 hover:bg-amber-500/10"
                title="Dismiss"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <BoardGrid
          page={activePage}
          multiSelectMode={multiSelectMode}
          selectedBookmarks={selectedBookmarks.map((b) => b.id)}
          onBookmarkSelect={handleBookmarkSelect}
        />
      </main>

      <aside className="newtab-rail newtab-rail-right">
        <ActionBar
          layout="rail"
          onSearchOpen={() => setSearchOpen(true)}
          onImportOpen={() => setImportOpen(true)}
          onTrashOpen={() => setTrashOpen(true)}
          onSettingsOpen={() => setSettingsOpen(true)}
          onMultiSelectToggle={() => {
            setMultiSelectMode((v) => !v);
            setSelectedBookmarks([]);
          }}
          multiSelectMode={multiSelectMode}
        />
      </aside>

      <MultiSelectBar
        selectedCount={selectedBookmarks.length}
        onDelete={handleBulkDelete}
        onCancel={() => {
          setMultiSelectMode(false);
          setSelectedBookmarks([]);
        }}
      />

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <TrashPanel open={trashOpen} onClose={() => setTrashOpen(false)} />
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
