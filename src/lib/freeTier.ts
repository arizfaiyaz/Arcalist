import { generateId } from "./id";
import type { ArcalistState, Page, Board, OverflowBoard } from "../types";

export const FREE_TIER_LIMITS = {
  maxPages: 3,
  maxBoardsPerPage: 10,
  maxVisibleBoards: 30,
};

const DEFAULT_PAGE_TITLES = ["Home", "Page 2", "Page 3"];

const cloneBoard = (board: Board): Board => ({
  ...board,
  bookmarks: [...(board.bookmarks ?? [])],
});

const clonePage = (page: Page): Page => ({
  ...page,
  boards: (page.boards ?? []).map(cloneBoard),
});

const createEmptyPage = (index: number): Page => ({
  id: generateId(),
  title: DEFAULT_PAGE_TITLES[index] ?? `Page ${index + 1}`,
  order: index,
  boards: [],
});

export const canCreatePage = (pages: Page[], isProUser = false) => {
  if (isProUser) return true;
  return pages.length < FREE_TIER_LIMITS.maxPages;
};

export const canCreateBoard = (page: Page | undefined, isProUser = false) => {
  if (isProUser) return true;
  return (page?.boards?.length ?? 0) < FREE_TIER_LIMITS.maxBoardsPerPage;
};

export const normalizeBoardsForFreeTier = (
  state: ArcalistState,
): ArcalistState => {
  const sourcePages = (state.pages ?? []).map(clonePage);
  if (sourcePages.length === 0) {
    sourcePages.push(createEmptyPage(0));
  }

  const visiblePages: Page[] = sourcePages
    .slice(0, FREE_TIER_LIMITS.maxPages)
    .map((page, index) => ({
      ...page,
      order: index,
      boards: [],
    }));

  if (visiblePages.length === 0) {
    visiblePages.push(createEmptyPage(0));
  }

  const overflowQueue: OverflowBoard[] = [];
  const pushOverflow = (board: Board, page?: Page) => {
    overflowQueue.push({
      board: cloneBoard(board),
      fromPageId: page?.id,
      fromPageTitle: page?.title,
    });
  };

  for (let index = 0; index < sourcePages.length; index += 1) {
    const sourcePage = sourcePages[index];
    if (index < visiblePages.length) {
      const pageSlot = visiblePages[index];
      const keep = sourcePage.boards.slice(0, FREE_TIER_LIMITS.maxBoardsPerPage);
      pageSlot.boards = keep.map(cloneBoard);
      if (sourcePage.boards.length > FREE_TIER_LIMITS.maxBoardsPerPage) {
        for (const board of sourcePage.boards.slice(
          FREE_TIER_LIMITS.maxBoardsPerPage,
        )) {
          pushOverflow(board, sourcePage);
        }
      }
    } else {
      for (const board of sourcePage.boards) {
        pushOverflow(board, sourcePage);
      }
    }
  }

  while (
    overflowQueue.length > 0 &&
    visiblePages.length < FREE_TIER_LIMITS.maxPages
  ) {
    visiblePages.push(createEmptyPage(visiblePages.length));
  }

  for (const page of visiblePages) {
    while (
      page.boards.length < FREE_TIER_LIMITS.maxBoardsPerPage &&
      overflowQueue.length > 0
    ) {
      const item = overflowQueue.shift();
      if (!item) break;
      page.boards.push(item.board);
    }
  }

  const visibleBoardIds = new Set(
    visiblePages.flatMap((page) => page.boards.map((board) => board.id)),
  );

  const existingOverflow = (state.overflowBoards ?? []).filter(
    (item) => !visibleBoardIds.has(item.board.id),
  );

  const overflowBoards = [...existingOverflow, ...overflowQueue];

  visiblePages.forEach((page, pageIndex) => {
    page.order = pageIndex;
    page.boards.forEach((board, boardIndex) => {
      board.order = boardIndex;
    });
  });

  const activePageId = visiblePages.some((p) => p.id === state.activePageId)
    ? state.activePageId
    : visiblePages[0].id;

  return {
    ...state,
    pages: visiblePages,
    overflowBoards,
    activePageId,
  };
};
