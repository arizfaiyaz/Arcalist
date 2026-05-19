import { useState, useEffect, useMemo, useRef } from "react";
import { Sparkles, X } from "lucide-react";
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
import { SharePageModal } from "../components/sharing/SharePageModal";
import { usePlanLimits } from "../hooks/usePlanLimits";
import { setAnalyticsPlanStatus } from "../hooks/useProductivityAnalytics";
import { useTheme } from "../hooks/useTheme";
import { useEntitlementContext } from "../hooks/useEntitlement";
import { browserApi } from "../lib/browserApi";
import {
  canShareWorkspace,
  canUseProductivityAnalytics,
  canUseSmartCollections,
  getVisibleWorkspaceForPlan,
  type PlanVisibleBoard,
} from "../lib/planLimits";
import type { Board, Page } from "../types";

const FIRST_SEEN_STORAGE_KEY = "arcalist:firstSeenAt";
const PRO_BANNER_DISMISSED_STORAGE_KEY = "arcalist:proBannerDismissedAt";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function NewTabPage() {
  const pages = useArcalistStore((state) => state.pages);
  const user = useArcalistStore((state) => state.user);
  const activePageId = useArcalistStore((state) => state.activePageId);
  const setActivePage = useArcalistStore((state) => state.setActivePage);
  const addPage = useArcalistStore((state) => state.addPage);
  const deletePage = useArcalistStore((state) => state.deletePage);
  const renamePage = useArcalistStore((state) => state.renamePage);
  const trashBookmark = useArcalistStore((state) => state.trashBookmark);
  const cleanupTrash = useArcalistStore((state) => state.cleanupTrash);
  const planLimits = usePlanLimits();
  const { loading: entitlementLoading } = useEntitlementContext();
  const planLoading = planLimits.loading;
  const shouldShowProBadge = !planLoading && !planLimits.isProUser;
  const { effectiveTheme } = useTheme();
  const visibleWorkspace = useMemo(
    () => getVisibleWorkspaceForPlan({ pages, limits: planLimits }),
    [pages, planLimits],
  );
  const visiblePages = visibleWorkspace.visiblePages;
  const lockedPageCount = visibleWorkspace.hiddenPageCount;

  const [searchOpen, setSearchOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [smartCollectionsOpen, setSmartCollectionsOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [sharePage, setSharePage] = useState<Page | null>(null);
  const [wallpaperOpen, setWallpaperOpen] = useState(false);
  const [activeVisiblePageId, setActiveVisiblePageId] = useState<string | null>(
    null,
  );
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
  const [upgradePrompt, setUpgradePrompt] = useState<{
    title: string;
    description: string;
    featureName: string;
  } | null>(null);
  const [selectedBookmarks, setSelectedBookmarks] = useState<
    { id: string; boardId: string }[]
  >([]);
  const wallpaperMenuRef = useRef<HTMLDivElement>(null);

  const activePage =
    visiblePages.find((p) => p.id === activeVisiblePageId) ??
    visiblePages.find(
      (p) => p.id === activePageId || p.originalPageId === activePageId,
    ) ??
    visiblePages[0];
  const activeFullPage =
    pages.find((p) => p.id === activePage?.originalPageId) ??
    pages.find((p) => p.id === activePage?.id) ??
    pages[0];
  const lastVisiblePage = visiblePages[visiblePages.length - 1];
  const lockedBoardCount =
    activePage?.id === lastVisiblePage?.id
      ? visibleWorkspace.hiddenBoardCount
      : 0;
  const totalBoardCount = pages.reduce(
    (count, page) => count + (page.boards?.length ?? 0),
    0,
  );
  const totalFreeBoardCapacity =
    planLimits.maxPages * planLimits.maxBoardsPerPage;
  const canAddBoardToActivePage =
    Boolean(activePage && activeFullPage) &&
    !activePage?.isVirtualOverflowPage &&
    planLimits.canCreateBoard(activeFullPage?.boards?.length ?? 0) &&
    (planLimits.isProUser || totalBoardCount < totalFreeBoardCapacity);
  const activePageHasRedistributedBoards =
    !planLimits.isProUser &&
    Boolean(
      activePage?.boards.some(
        (board) => board.originalPageId !== activePage.originalPageId,
      ),
    );

  useEffect(() => {
    if (visiblePages.length === 0) return;
    const fallbackPage = visiblePages[0];
    const hasActiveVisiblePage =
      !activeVisiblePageId ||
      visiblePages.some((page) => page.id === activeVisiblePageId);
    const hasCanonicalActivePage =
      !activePageId ||
      visiblePages.some(
        (page) => page.id === activePageId || page.originalPageId === activePageId,
      );

    if (hasActiveVisiblePage && hasCanonicalActivePage) return;

    const timeout = window.setTimeout(() => {
      if (!hasActiveVisiblePage) {
        setActiveVisiblePageId(null);
      }
      if (!hasCanonicalActivePage) {
        setActivePage(fallbackPage.originalPageId || fallbackPage.id);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [activePageId, activeVisiblePageId, setActivePage, visiblePages]);

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
    let cancelled = false;

    const resolveBannerState = async () => {
      if (!user?.id || planLoading) {
        setShowUpgradeBanner(false);
        return;
      }

      const now = Date.now();
      const stored = await browserApi.storage.get<
        Record<string, string | number | undefined>
      >([FIRST_SEEN_STORAGE_KEY, PRO_BANNER_DISMISSED_STORAGE_KEY]);

      const dismissedAt = stored[PRO_BANNER_DISMISSED_STORAGE_KEY];
      if (dismissedAt) {
        if (!cancelled) setShowUpgradeBanner(false);
        return;
      }

      const firstSeenValue = stored[FIRST_SEEN_STORAGE_KEY];
      const firstSeenAt =
        typeof firstSeenValue === "number"
          ? firstSeenValue
          : Number(firstSeenValue);

      if (!Number.isFinite(firstSeenAt) || firstSeenAt <= 0) {
        await browserApi.storage.set({ [FIRST_SEEN_STORAGE_KEY]: now });
        if (!cancelled) setShowUpgradeBanner(false);
        return;
      }

      const shouldShow =
        !planLimits.isProUser && now - firstSeenAt >= ONE_DAY_MS;
      if (!cancelled) setShowUpgradeBanner(shouldShow);
    };

    void resolveBannerState();

    return () => {
      cancelled = true;
    };
  }, [planLimits.isProUser, planLoading, user?.id]);

  useEffect(() => {
    if (!wallpaperOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        wallpaperMenuRef.current?.contains(target)
      ) {
        return;
      }
      setWallpaperOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [wallpaperOpen]);

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

  const showGeneralUpgradePrompt = () => {
    setUpgradePrompt({
      title: "Upgrade to Arcalist Pro",
      description:
        "Unlock unlimited boards, premium themes, smart collections, analytics, sharing, and sync.",
      featureName: "Arcalist Pro",
    });
  };

  const dismissUpgradeBanner = () => {
    setShowUpgradeBanner(false);
    void browserApi.storage.set({
      [PRO_BANNER_DISMISSED_STORAGE_KEY]: new Date().toISOString(),
    });
  };

  const handleSmartCollectionsOpen = () => {
    if (entitlementLoading) return;

    if (!canUseSmartCollections(planLimits.isProUser)) {
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
    if (entitlementLoading) return;

    if (!canUseProductivityAnalytics(planLimits.isProUser)) {
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

  const handleSharePage = (page: Page) => {
    if (entitlementLoading || !canShareWorkspace(planLimits.isProUser)) {
      setUpgradePrompt({
        title: "Page sharing is available with Arcalist Pro.",
        description:
          "Upgrade to Pro to generate read-only share links for individual Arcalist pages.",
        featureName: "Page Sharing",
      });
      return;
    }
    setSharePage(page);
  };

  const handlePageChange = (pageId: string) => {
    const nextPage = visiblePages.find((page) => page.id === pageId);
    if (!nextPage) return;

    setActiveVisiblePageId(nextPage.id);
    if (!nextPage.isVirtualOverflowPage) {
      setActivePage(nextPage.originalPageId);
    }
  };

  const getBoardPageId = (board: Board) =>
    (board as PlanVisibleBoard).originalPageId ||
    activePage.originalPageId ||
    activePage.id;

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
        <div
          ref={wallpaperMenuRef}
          className="relative flex flex-col items-center gap-3"
        >
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
          {showUpgradeBanner && (
            <FreeUpgradeBanner
              onUpgrade={showGeneralUpgradePrompt}
              onDismiss={dismissUpgradeBanner}
            />
          )}

          <PageNav
            pages={visiblePages}
            activePageId={activePage?.id ?? activePageId}
            onPageChange={handlePageChange}
            onAddPage={addPage}
            onDeletePage={deletePage}
            onRenamePage={renamePage}
            onSharePage={handleSharePage}
            shareLocked={entitlementLoading || !planLimits.isProUser}
            lockedPageCount={lockedPageCount}
            onPageLimitReached={showPageUpgradePrompt}
          />

          <BoardGrid
            page={activePage}
            multiSelectMode={multiSelectMode}
            selectedBookmarks={selectedBookmarks.map((b) => b.id)}
            onBookmarkSelect={handleBookmarkSelect}
            lockedBoardCount={lockedBoardCount}
            onBoardLimitReached={showBoardUpgradePrompt}
            canAddBoardOverride={canAddBoardToActivePage}
            getBoardPageId={getBoardPageId}
            disableBoardReorder={activePageHasRedistributedBoards}
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
          smartCollectionsLocked={shouldShowProBadge}
          analyticsLocked={shouldShowProBadge}
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
        open={smartCollectionsOpen && !entitlementLoading && planLimits.isProUser}
        onClose={() => setSmartCollectionsOpen(false)}
      />
      <ProductivityAnalyticsPanel
        open={analyticsOpen && !entitlementLoading && planLimits.isProUser}
        onClose={() => setAnalyticsOpen(false)}
      />
      <SharePageModal
        open={Boolean(sharePage)}
        page={sharePage}
        userId={user?.id ?? null}
        isProUser={planLimits.isProUser}
        onClose={() => setSharePage(null)}
      />
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onUpgradeRequest={showGeneralUpgradePrompt}
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

function FreeUpgradeBanner({
  onUpgrade,
  onDismiss,
}: {
  onUpgrade: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="mb-3 rounded-xl border border-[var(--arc-glass-border)] bg-[var(--arc-modal-bg)] px-3 py-2 shadow-lg shadow-black/10 backdrop-blur-xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          <Sparkles
            size={16}
            className="mt-0.5 shrink-0 text-[var(--arc-accent)]"
          />
          <p className="text-sm leading-5 text-[var(--arc-text-primary)]">
            Get more from Arcalist — upgrade to Pro for unlimited boards,
            premium themes, smart collections, analytics, sharing, and sync.
          </p>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <button
            type="button"
            onClick={onUpgrade}
            className="arc-btn arc-btn-primary min-h-8 px-3 text-xs"
          >
            Upgrade to Pro
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss upgrade banner"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--arc-text-secondary)] hover:bg-[var(--arc-button-bg)] hover:text-[var(--arc-text-primary)]"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
