import { normalizeSafeUrl } from "./urlSafety";
import type { ArcalistState, Board, Bookmark, Page } from "../types";

export const HOME_PAGE_ID = "home";
export const HOME_PAGE_TITLE = "Home";

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
]);

type FolderContext = {
  node: chrome.bookmarks.BookmarkTreeNode;
  titlePath: string[];
  directBookmarks: chrome.bookmarks.BookmarkTreeNode[];
};

const isBookmarkNode = (node: chrome.bookmarks.BookmarkTreeNode) =>
  typeof node.url === "string" && node.url.length > 0;

const isFolderNode = (node: chrome.bookmarks.BookmarkTreeNode) =>
  !isBookmarkNode(node);

const byIndex = <T extends { index?: number }>(items: T[]) =>
  [...items].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

const byOrder = <T extends { order?: number }>(items: T[]) =>
  [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

const isUserCreatedPage = (page: Page) =>
  page.createdByUser === true || page.source === "user_created";

const isVirtualPage = (page: Page) => page.source === "virtual_overflow";

const isUserCreatedBoard = (board: Board) =>
  board.createdByUser === true || board.source === "user_created";

function cloneBoard(board: Board, order = board.order): Board {
  return {
    ...board,
    order,
    bookmarks: [...(board.bookmarks ?? [])],
  };
}

function preservedUserPages(base?: Partial<ArcalistState>): Page[] {
  return byOrder(base?.pages ?? [])
    .filter((page) => isUserCreatedPage(page) && !isVirtualPage(page))
    .map((page) => ({
      ...page,
      source: "user_created",
      createdByUser: true,
      boards: byOrder(page.boards ?? []).map((board) => cloneBoard(board)),
    }));
}

export async function fetchChromeBookmarkTree() {
  return chrome.bookmarks.getTree();
}

export function folderHasBookmarks(
  folderNode: chrome.bookmarks.BookmarkTreeNode,
): boolean {
  for (const child of folderNode.children ?? []) {
    if (isBookmarkNode(child)) return true;
    if (isFolderNode(child) && folderHasBookmarks(child)) return true;
  }
  return false;
}

export function getFaviconUrl(url: string): string {
  try {
    return `https://www.google.com/s2/favicons?domain=${
      new URL(url).hostname
    }&sz=32`;
  } catch {
    return "";
  }
}

export function normalizeUrlForComparison(url: string): string {
  const safeUrl = normalizeSafeUrl(url);
  if (!safeUrl) return "";

  try {
    const parsed = new URL(safeUrl);
    parsed.hostname = parsed.hostname.toLowerCase();
    for (const param of Array.from(parsed.searchParams.keys())) {
      if (TRACKING_PARAMS.has(param.toLowerCase())) {
        parsed.searchParams.delete(param);
      }
    }
    parsed.hash = "";
    const normalized = parsed.toString();
    return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
  } catch {
    return "";
  }
}

function boardTitleForPath(titlePath: string[]) {
  const usablePath = titlePath.filter(Boolean);
  return usablePath.length > 0 ? usablePath.join(" / ") : "Bookmarks";
}

function bookmarkFromNode(node: chrome.bookmarks.BookmarkTreeNode): Bookmark | null {
  if (!node.url) return null;
  const url = normalizeSafeUrl(node.url);
  if (!url) return null;
  const createdAt = node.dateAdded ?? Date.now();

  return {
    id: `chrome-bookmark-${node.id}`,
    chromeBookmarkId: node.id,
    title: node.title || url,
    url,
    favicon: getFaviconUrl(url),
    faviconUrl: getFaviconUrl(url),
    createdAt,
    updatedAt: createdAt,
    visitCount: 0,
  };
}

function collectFoldersWithDirectBookmarks(
  node: chrome.bookmarks.BookmarkTreeNode,
  path: string[],
  out: FolderContext[],
) {
  if (!folderHasBookmarks(node)) return;

  const children = byIndex(node.children ?? []);
  const directBookmarks = children.filter(isBookmarkNode);
  if (directBookmarks.length > 0) {
    out.push({
      node,
      titlePath: path,
      directBookmarks,
    });
  }

  for (const child of children) {
    if (isBookmarkNode(child)) continue;
    const childTitle = child.title || "Bookmarks";
    collectFoldersWithDirectBookmarks(child, [...path, childTitle], out);
  }
}

export function flattenChromeFoldersToBoards(
  tree: chrome.bookmarks.BookmarkTreeNode[],
): Board[] {
  const root = tree[0];
  if (!root) return [];

  const contexts: FolderContext[] = [];
  for (const topLevel of byIndex(root.children ?? [])) {
    if (isBookmarkNode(topLevel)) continue;

    const topLevelTitle = topLevel.title || "Bookmarks";
    const directBookmarks = byIndex(topLevel.children ?? []).filter(isBookmarkNode);
    if (directBookmarks.length > 0) {
      contexts.push({
        node: topLevel,
        titlePath: [topLevelTitle],
        directBookmarks,
      });
    }

    for (const child of byIndex(topLevel.children ?? [])) {
      if (isBookmarkNode(child)) continue;
      collectFoldersWithDirectBookmarks(child, [child.title || "Bookmarks"], contexts);
    }
  }

  return contexts.map(({ node, titlePath, directBookmarks }, order) => {
    const bookmarks = directBookmarks
      .map(bookmarkFromNode)
      .filter((bookmark): bookmark is Bookmark => Boolean(bookmark));

    return {
      id: `chrome-folder-${node.id}`,
      chromeFolderId: node.id,
      chromeParentId: node.parentId,
      chromeIndex: node.index,
      source: "chrome_folder",
      title: boardTitleForPath(titlePath),
      order,
      bookmarks,
      updatedAt: Date.now(),
    };
  });
}

function getCachedBoardOrder(base?: Partial<ArcalistState>) {
  const orderByChromeFolderId = new Map<string, number>();
  const orderByBoardId = new Map<string, number>();

  for (const page of base?.pages ?? []) {
    for (const board of page.boards ?? []) {
      if (Number.isFinite(board.order)) {
        orderByBoardId.set(board.id, board.order);
        if (board.chromeFolderId) {
          orderByChromeFolderId.set(board.chromeFolderId, board.order);
        }
      }
    }
  }

  return { orderByChromeFolderId, orderByBoardId };
}

function applyCachedBoardOrder(
  boards: Board[],
  base?: Partial<ArcalistState>,
): Board[] {
  const { orderByChromeFolderId, orderByBoardId } = getCachedBoardOrder(base);
  if (orderByChromeFolderId.size === 0 && orderByBoardId.size === 0) {
    return boards.map((board, order) => ({ ...board, order }));
  }

  const getOrder = (board: Board) =>
    (board.chromeFolderId
      ? orderByChromeFolderId.get(board.chromeFolderId)
      : undefined) ??
    orderByBoardId.get(board.id) ??
    Number.MAX_SAFE_INTEGER + board.order;

  return [...boards]
    .sort((a, b) => getOrder(a) - getOrder(b) || a.order - b.order)
    .map((board, order) => ({ ...board, order }));
}

export function buildHomeWorkspaceFromChromeBookmarks(
  tree: chrome.bookmarks.BookmarkTreeNode[],
  base?: Partial<ArcalistState>,
): ArcalistState {
  const userPages = preservedUserPages(base);
  const userBoardByChromeFolderId = new Map<string, Board>();
  for (const page of userPages) {
    for (const board of page.boards ?? []) {
      if (board.chromeFolderId) userBoardByChromeFolderId.set(board.chromeFolderId, board);
    }
  }
  const chromeBoards = flattenChromeFoldersToBoards(tree).filter(
    (board) => (board.bookmarks ?? []).length > 0,
  );
  const refreshedUserPages = userPages.map((page) => ({
    ...page,
    boards: byOrder(page.boards ?? []).map((board) => {
      const chromeBoard = board.chromeFolderId
        ? chromeBoards.find(
            (candidate) => candidate.chromeFolderId === board.chromeFolderId,
          )
        : undefined;
      return chromeBoard
        ? {
            ...board,
            ...chromeBoard,
            id: board.id,
            source: "user_created" as const,
            createdByUser: true,
            order: board.order,
          }
        : board;
    }),
  }));
  const boards = applyCachedBoardOrder(
    chromeBoards.filter(
      (board) =>
        !board.chromeFolderId ||
        !userBoardByChromeFolderId.has(board.chromeFolderId),
    ),
    base,
  );

  const homePage: Page = {
    id: HOME_PAGE_ID,
    title: HOME_PAGE_TITLE,
    source: "chrome_home",
    order: 0,
    boards,
  };
  const orderedUserPages = refreshedUserPages.map((page, index) => ({
    ...page,
    order: index + 1,
  }));
  const activePageId =
    base?.activePageId &&
    [homePage, ...orderedUserPages].some((page) => page.id === base.activePageId)
      ? base.activePageId
      : HOME_PAGE_ID;

  return {
    pages: [homePage, ...orderedUserPages],
    activePageId,
    trash: base?.trash ?? [],
    overflowBoards: [],
    privacyMode: base?.privacyMode ?? false,
    updatedAt: Date.now(),
    settings: base?.settings as ArcalistState["settings"],
    wallpaperTheme: base?.wallpaperTheme as ArcalistState["wallpaperTheme"],
  };
}

export function canonicalizeToHomeWorkspace(
  workspace: ArcalistState,
): ArcalistState {
  const userPages = preservedUserPages(workspace);
  const boards = byOrder(workspace.pages ?? [])
    .filter((page) => !isUserCreatedPage(page) && !isVirtualPage(page))
    .flatMap((page) => byOrder(page.boards ?? []))
    .filter(
      (board) => (board.bookmarks ?? []).length > 0 || isUserCreatedBoard(board),
    )
    .map((board, order) => ({
      ...board,
      order,
      bookmarks: [...(board.bookmarks ?? [])],
    }));
  const pages: Page[] = [
    {
      id: HOME_PAGE_ID,
      title: HOME_PAGE_TITLE,
      source: "chrome_home",
      order: 0,
      boards,
    },
    ...userPages.map((page, index) => ({
      ...page,
      order: index + 1,
    })),
  ];
  const activePageId = pages.some((page) => page.id === workspace.activePageId)
    ? workspace.activePageId
    : HOME_PAGE_ID;

  return {
    ...workspace,
    pages,
    activePageId,
    overflowBoards: [],
  };
}

export const canonicalizeWorkspaceAsHome = canonicalizeToHomeWorkspace;
