import { useState, useEffect, useMemo } from "react";
import { useArcalistStore } from "../store/useArcalistStore";
import { PageNav } from "../components/PageNav";
import { BoardGrid } from "../components/BoardGrid";
import { SearchOverlay } from "../components/Search/SearchOverlay";
import { ImportDialog } from "../components/Import/ImportDialog";
import { ActionBar } from "../components/ActionBar";
import { TrashPanel } from "../components/Trash/TrashPanel";
import { SettingsPanel } from "../components/Settings/SettingsPanel";
import { ProductivityAnalyticsPanel } from "../components/analytics/ProductivityAnalyticsPanel";
import { SmartCollectionsPanel } from "../components/smart-collections/SmartCollectionsPanel";
import { WallpaperPanel } from "../components/Wallpaper/WallpaperPanel";
import { WallpaperButton } from "../components/Wallpaper/WallpaperButton";
import { MultiSelectBar } from "../components/MultiSelect/MultiSelectBar";
import { UpgradePromptModal } from "../components/UpgradePromptModal";
import { usePlanLimits } from "../hooks/usePlanLimits";
import { setAnalyticsPlanStatus } from "../hooks/useProductivityAnalytics";
import { useTheme } from "../hooks/useTheme";
import {
  getLockedBoardCountForPlan,
  getLockedPageCountForPlan,
  getVisiblePagesForPlan,
} from "../lib/planLimits";

export function NewTabPage() {
  const pages = useArcalistStore((state) => state.pages);
  const activePageId = useArcalistStore((state) => state.activePageId);
  const setActivePage = useArcalistStore((state) => state.setActivePage);
  const addPage = useArcalistStore((state) => state.addPage);
  const deletePage = useArcalistStore((state) => state.deletePage);
  const trashBookmark = useArcalistStore((state) => state.trashBookmark);
  const cleanupTrash = useArcalistStore((state) => state.cleanupTrash);
  const planLimits = usePlanLimits();
  const { effectiveTheme } = useTheme();
  const visiblePages = useMemo(
    () => getVisiblePagesForPlan(pages, planLimits),
    [pages, planLimits],
  );
  const lockedPageCount = useMemo(
    () => getLockedPageCountForPlan(pages, planLimits),
    [pages, planLimits],
  );

  const [searchOpen, setSearchOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [smartCollectionsOpen, setSmartCollectionsOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [wallpaperOpen, setWallpaperOpen] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [pageLockNoticeDismissed, setPageLockNoticeDismissed] = useState(false);
  const [upgradePrompt, setUpgradePrompt] = useState<{
    title: string;
    description: string;
    featureName: string;
  } | null>(null);
  const [selectedBookmarks, setSelectedBookmarks] = useState<
    { id: string; boardId: string }[]
  >([]);

  const activePage =
    visiblePages.find((p) => p.id === activePageId) ?? visiblePages[0];
  const activeFullPage =
    pages.find((p) => p.id === activePage?.id) ?? pages[0];
  const lockedBoardCount = getLockedBoardCountForPlan(
    activeFullPage,
    planLimits,
  );

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

  useEffect(() => {
    void setAnalyticsPlanStatus(planLimits.isProUser, planLimits.planName);
  }, [planLimits.isProUser, planLimits.planName]);

  useEffect(() => {
    if (!activePage && visiblePages[0]) {
      setActivePage(visiblePages[0].id);
      return;
    }

    if (activePage && activePage.id !== activePageId) {
      setActivePage(activePage.id);
    }
  }, [activePage, activePageId, setActivePage, visiblePages]);

  const showPageUpgradePrompt = () => {
    setUpgradePrompt({
      title: "Page limit reached",
      description:
        "Free plan supports up to 3 pages. Upgrade to Pro for unlimited pages.",
      featureName: "Pages",
    });
  };

  const showBoardUpgradePrompt = () => {
    setUpgradePrompt({
      title: "Board limit reached",
      description:
        "Free plan supports up to 10 boards per page. Upgrade to Pro for unlimited boards.",
      featureName: "Boards",
    });
  };

  const handleSmartCollectionsOpen = () => {
    if (!planLimits.isProUser) {
      setUpgradePrompt({
        title: "Smart Collections are available with Arcalist Pro.",
        description:
          "Upgrade to Pro to unlock automatic bookmark collections like Recently Added, Most Visited, Duplicate Links, domains, developer tools, social links, and reading lists.",
        featureName: "Smart Collections",
      });
      return;
    }
    setSmartCollectionsOpen(true);
  };

  const handleAnalyticsOpen = () => {
    if (!planLimits.isProUser) {
      setUpgradePrompt({
        title: "Productivity analytics are available with Arcalist Pro.",
        description:
          "Upgrade to Pro to see domain-level time tracking, daily and weekly trends, top websites, and productivity breakdowns.",
        featureName: "Productivity Analytics",
      });
      return;
    }
    setAnalyticsOpen(true);
  };

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
        style={effectiveTheme.wallpaper ? { background: "transparent" } : undefined}
      >
        <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div
      className={
        effectiveTheme.wallpaper
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
        <div className="newtab-workspace">
          <PageNav
            pages={visiblePages}
            activePageId={activePage?.id ?? activePageId}
            onPageChange={setActivePage}
            onAddPage={addPage}
            onDeletePage={deletePage}
            lockedPageCount={lockedPageCount}
            onPageLimitReached={showPageUpgradePrompt}
          />

          {lockedPageCount > 0 && !pageLockNoticeDismissed && (
            <div className="mt-3 mb-2 flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/80">
              <div className="flex-1">
                <p className="text-amber-100">
                  You have {lockedPageCount} extra{" "}
                  {lockedPageCount === 1 ? "page" : "pages"} saved.
                </p>
                <p className="text-amber-100/70">
                  Upgrade to Pro to unlock them.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={showPageUpgradePrompt}
                  className="px-2.5 py-1 rounded-full text-xs border border-amber-300/30 text-amber-100/80 hover:bg-amber-500/10"
                  title="Upgrade to Pro"
                >
                  Upgrade
                </button>
                <button
                  onClick={() => setPageLockNoticeDismissed(true)}
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
            lockedBoardCount={lockedBoardCount}
            onBoardLimitReached={showBoardUpgradePrompt}
          />
        </div>
      </main>

      <aside className="newtab-rail newtab-rail-right">
        <ActionBar
          layout="rail"
          onSearchOpen={() => setSearchOpen(true)}
          onImportOpen={() => setImportOpen(true)}
          onTrashOpen={() => setTrashOpen(true)}
          onSettingsOpen={() => setSettingsOpen(true)}
          onSmartCollectionsOpen={handleSmartCollectionsOpen}
          onAnalyticsOpen={handleAnalyticsOpen}
          onMultiSelectToggle={() => {
            setMultiSelectMode((v) => !v);
            setSelectedBookmarks([]);
          }}
          multiSelectMode={multiSelectMode}
          smartCollectionsLocked={!planLimits.isProUser}
          analyticsLocked={!planLimits.isProUser}
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
      <SmartCollectionsPanel
        open={smartCollectionsOpen && planLimits.isProUser}
        onClose={() => setSmartCollectionsOpen(false)}
      />
      <ProductivityAnalyticsPanel
        open={analyticsOpen && planLimits.isProUser}
        onClose={() => setAnalyticsOpen(false)}
      />
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      {upgradePrompt && (
        <UpgradePromptModal
          title={upgradePrompt.title}
          description={upgradePrompt.description}
          featureName={upgradePrompt.featureName}
          onClose={() => setUpgradePrompt(null)}
        />
      )}
    </div>
  );
}
