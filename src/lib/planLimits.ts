import type { User } from "@supabase/supabase-js";
import { DEV_IS_PRO, FREE_PLAN, PRO_PLAN, type PlanName } from "../config/plans";
import { generateId } from "./id";
import type { ArcalistState, Board, Page } from "../types";

export type UserPlanLimits = {
  isProUser: boolean;
  planName: PlanName;
  maxPages: number;
  maxBoardsPerPage: number;
  canCreatePage: (currentPageCount: number) => boolean;
  canCreateBoard: (currentBoardCountForPage: number) => boolean;
};

const getMetadataPlan = (user: User | null | undefined): PlanName | null => {
  const metadataPlan =
    user?.user_metadata?.plan ??
    user?.app_metadata?.plan ??
    user?.user_metadata?.subscription_plan ??
    user?.app_metadata?.subscription_plan;

  return metadataPlan === "pro" ? "pro" : metadataPlan === "free" ? "free" : null;
};

export const getUserPlanName = (user?: User | null): PlanName => {
  if (DEV_IS_PRO) return "pro";
  return getMetadataPlan(user) ?? "free";
};

export const getUserPlanLimits = (user?: User | null): UserPlanLimits => {
  const planName = getUserPlanName(user);
  const plan = planName === "pro" ? PRO_PLAN : FREE_PLAN;

  return {
    isProUser: planName === "pro",
    planName,
    maxPages: plan.maxPages,
    maxBoardsPerPage: plan.maxBoardsPerPage,
    canCreatePage: (currentPageCount) => currentPageCount < plan.maxPages,
    canCreateBoard: (currentBoardCountForPage) =>
      currentBoardCountForPage < plan.maxBoardsPerPage,
  };
};

const byOrder = <T extends { order: number }>(items: T[]) =>
  items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.order - b.item.order || a.index - b.index)
    .map(({ item }) => item);

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
  const orderedPages = byOrder(pages ?? []);
  const visiblePages = limits.isProUser
    ? orderedPages
    : orderedPages.slice(0, limits.maxPages);

  return visiblePages.map((page) => ({
    ...page,
    boards: getVisibleBoardsForPlan(page.boards ?? [], limits),
  }));
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
      id: generateId(),
      title: "Home",
      order: 0,
      boards: [],
    });
  }

  pages.forEach((page, pageIndex) => {
    page.order = Number.isFinite(page.order) ? page.order : pageIndex;
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

