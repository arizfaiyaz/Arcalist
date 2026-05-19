import { generateId } from "./id";
import type { ArcalistState, Board, Page } from "../types";
import type { PlanSource, UserEntitlement } from "./entitlements";

export type PlanName = "free" | "pro";

export const FREE_LIMITS = {
  pages: 3,
  boardsPerPage: 10,
};

export function canCreatePage(isPro: boolean, currentPageCount: number) {
  if (isPro) return true;
  return currentPageCount < FREE_LIMITS.pages;
}

export function canCreateBoard(isPro: boolean, currentBoardCount: number) {
  if (isPro) return true;
  return currentBoardCount < FREE_LIMITS.boardsPerPage;
}

export function canUseCloudSync(isPro: boolean) {
  return isPro;
}

export function canUseSmartCollections(isPro: boolean) {
  return isPro;
}

export function canUseProductivityAnalytics(isPro: boolean) {
  return isPro;
}

export function canUsePremiumThemes(isPro: boolean) {
  return isPro;
}

export function canUploadCustomWallpaper(isPro: boolean) {
  return isPro;
}

export function canUseCrossBrowserSync(isPro: boolean) {
  return isPro;
}

export function canShareWorkspace(isPro: boolean) {
  return isPro;
}

export type UserPlanLimits = {
  isProUser: boolean;
  planName: PlanName;
  maxPages: number;
  maxBoardsPerPage: number;
  loading?: boolean;
  planSource?: PlanSource;
  refreshPlan?: () => Promise<UserEntitlement | null>;
  canCreatePage: (currentPageCount: number) => boolean;
  canCreateBoard: (currentBoardCountForPage: number) => boolean;
};

export type PlanVisibleBoard = Board & {
  originalPageId: string;
};

export type PlanVisiblePage = Omit<Page, "boards"> & {
  boards: PlanVisibleBoard[];
  originalPageId: string;
  isVirtualOverflowPage?: boolean;
};

export type PlanVisibilityResult = {
  visiblePages: PlanVisiblePage[];
  hiddenBoardCount: number;
  hiddenPageCount: number;
  hasHiddenData: boolean;
  isPlanPending?: boolean;
};

export const getPlanLimits = (isPro: boolean): UserPlanLimits => {
  const planName: PlanName = isPro ? "pro" : "free";
  return {
    isProUser: isPro,
    planName,
    maxPages: isPro ? Infinity : FREE_LIMITS.pages,
    maxBoardsPerPage: isPro ? Infinity : FREE_LIMITS.boardsPerPage,
    canCreatePage: (currentPageCount) =>
      canCreatePage(isPro, currentPageCount),
    canCreateBoard: (currentBoardCountForPage) =>
      canCreateBoard(isPro, currentBoardCountForPage),
  };
};

const byOrder = <T extends { order: number }>(items: T[]) =>
  items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.order - b.item.order || a.index - b.index)
    .map(({ item }) => item);

const isUserCreatedPage = (page: Page) =>
  page.createdByUser === true || page.source === "user_created";

const isVirtualPage = (page: Page) => page.source === "virtual_overflow";

const isRenderableRealPage = (page: Page, index: number) =>
  index === 0 || isUserCreatedPage(page) || (page.boards ?? []).length > 0;

export const getVisibleBoardsForPlan = (
  boards: Board[],
  limits: UserPlanLimits,
) => {
  const orderedBoards = byOrder(boards ?? []);
  return limits.isProUser
    ? orderedBoards
    : orderedBoards.slice(0, limits.maxBoardsPerPage);
};

export const getVisiblePagesForPlan = (
  pages: Page[],
  limits: UserPlanLimits,
) => {
  return getVisibleWorkspaceForPlan({ pages, limits }).visiblePages;
};

export const getLockedPageCountForPlan = (
  pages: Page[],
  limits: UserPlanLimits,
) => (limits.isProUser ? 0 : Math.max(0, (pages ?? []).length - limits.maxPages));

export const getLockedBoardCountForPlan = (
  page: Page | undefined,
  limits: UserPlanLimits,
) =>
  limits.isProUser
    ? 0
    : Math.max(0, (page?.boards?.length ?? 0) - limits.maxBoardsPerPage);

export const getVisibleWorkspaceForPlan = ({
  pages,
  limits,
  isProUser = limits.isProUser,
  maxPages = limits.maxPages,
  maxBoardsPerPage = limits.maxBoardsPerPage,
}: {
  pages: Page[];
  limits: UserPlanLimits;
  isProUser?: boolean;
  maxPages?: number;
  maxBoardsPerPage?: number;
}): PlanVisibilityResult => {
  const orderedPages = byOrder(pages ?? []).filter((page) => !isVirtualPage(page));
  const realPages = orderedPages.filter(isRenderableRealPage);
  const sourceHomePage = realPages[0] ?? orderedPages[0] ?? {
    id: "home",
    title: "Home",
    source: "chrome_home" as const,
    order: 0,
    boards: [],
  };

  if (limits.loading) {
    return {
      visiblePages: [
        {
          ...sourceHomePage,
          boards: byOrder(sourceHomePage.boards ?? []).map((board) => ({
            ...board,
            originalPageId: sourceHomePage.id,
          })),
          originalPageId: sourceHomePage.id,
        },
      ],
      hiddenBoardCount: 0,
      hiddenPageCount: 0,
      hasHiddenData: false,
      isPlanPending: true,
    };
  }

  if (isProUser) {
    const visiblePages: PlanVisiblePage[] = (realPages.length > 0
      ? realPages
      : [sourceHomePage]
    ).map((page) => ({
      ...page,
      boards: byOrder(page.boards ?? []).map((board) => ({
        ...board,
        originalPageId: page.id,
      })),
      originalPageId: page.id,
    }));

    return {
      visiblePages,
      hiddenBoardCount: 0,
      hiddenPageCount: 0,
      hasHiddenData: false,
    };
  }

  const visiblePageLimit = Number.isFinite(maxPages) ? maxPages : orderedPages.length;
  const visibleBoardLimit = Number.isFinite(maxBoardsPerPage)
    ? maxBoardsPerPage
    : Infinity;
  const visibleRealPages = realPages.slice(0, visiblePageLimit);
  const hiddenRealPages = realPages.slice(visiblePageLimit);
  const visiblePages: PlanVisiblePage[] = visibleRealPages.map((page) => ({
    ...page,
    boards: byOrder(page.boards ?? [])
      .slice(0, visibleBoardLimit)
      .map((board) => ({
        ...board,
        originalPageId: page.id,
      })),
    originalPageId: page.id,
  }));
  const overflowBoards = visibleRealPages.flatMap((page) =>
    byOrder(page.boards ?? [])
      .slice(visibleBoardLimit)
      .map((board) => ({
        ...board,
        originalPageId: page.id,
      })),
  );
  const availableVirtualPageSlots = Math.max(
    0,
    visiblePageLimit - visiblePages.length,
  );

  for (let index = 0; index < availableVirtualPageSlots; index += 1) {
    const boards = overflowBoards.slice(
      index * visibleBoardLimit,
      (index + 1) * visibleBoardLimit,
    );
    if (boards.length === 0) break;
    visiblePages.push({
      id: `virtual-free-overflow-page-${index + 1}`,
      title: `Overflow ${index + 1}`,
      source: "virtual_overflow",
      order: visiblePages.length,
      boards,
      originalPageId: "",
      isVirtualOverflowPage: true,
    });
  }

  if (visiblePages.length === 0) {
    visiblePages.push({
      ...sourceHomePage,
      boards: [],
      originalPageId: sourceHomePage.id,
    });
  }

  const hiddenBoardCount =
    overflowBoards.length -
    Math.min(overflowBoards.length, availableVirtualPageSlots * visibleBoardLimit) +
    hiddenRealPages.reduce((count, page) => count + (page.boards?.length ?? 0), 0);
  const hiddenPageCount = Math.max(0, realPages.length - visiblePageLimit);

  return {
    visiblePages,
    hiddenBoardCount,
    hiddenPageCount,
    hasHiddenData: hiddenBoardCount > 0 || hiddenPageCount > 0,
  };
};

const cloneBoard = (board: Board): Board => ({
  ...board,
  bookmarks: [...(board.bookmarks ?? [])],
});

const clonePage = (page: Page): Page => ({
  ...page,
  boards: (page.boards ?? []).map(cloneBoard),
});

export const normalizeWorkspaceState = (state: ArcalistState): ArcalistState => {
  const pages = (state.pages ?? []).map(clonePage);
  const boardIds = new Set(pages.flatMap((page) => page.boards.map((b) => b.id)));

  for (const item of state.overflowBoards ?? []) {
    if (!item?.board || boardIds.has(item.board.id)) continue;

    let targetPage =
      pages.find((page) => item.fromPageId && page.id === item.fromPageId) ??
      pages.find(
        (page) => item.fromPageTitle && page.title === item.fromPageTitle,
      );

    if (!targetPage) {
      targetPage = {
        id: item.fromPageId ?? generateId(),
        title: item.fromPageTitle ?? `Recovered Page ${pages.length + 1}`,
        order: pages.length,
        boards: [],
        source: "user_created",
        createdByUser: true,
      };
      pages.push(targetPage);
    }

    targetPage.boards.push({
      ...cloneBoard(item.board),
      order: targetPage.boards.length,
    });
    boardIds.add(item.board.id);
  }

  if (pages.length === 0) {
    pages.push({
      id: "home",
      title: "Home",
      source: "chrome_home",
      order: 0,
      boards: [],
    });
  }

  pages.forEach((page, pageIndex) => {
    page.order = Number.isFinite(page.order) ? page.order : pageIndex;
    if (page.id === "home" && !page.source) page.source = "chrome_home";
    page.boards.forEach((board, boardIndex) => {
      board.order = Number.isFinite(board.order) ? board.order : boardIndex;
      board.bookmarks = board.bookmarks ?? [];
    });
  });

  const orderedPages = byOrder(pages);
  const activePageId = pages.some((page) => page.id === state.activePageId)
    ? state.activePageId
    : orderedPages[0]?.id ?? "";

  return {
    ...state,
    pages,
    activePageId,
    overflowBoards: [],
  };
};
