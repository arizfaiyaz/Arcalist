import { setBookmarkMap } from "./chromeBookmarkMap";
import { markDirty } from "./sync/syncStorage";
import { getSafeDomain, normalizeSafeUrl } from "./urlSafety";
import type { ArcalistState, Board, Bookmark } from "../types";

const STORAGE_KEY = "arcalist_state";
const IMPORT_FLAG_KEY = "arcalist_chrome_imported";
const HOME_PAGE_TITLE = "Home";
const IMPORTED_PAGE_TITLE = "Imported";

function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function favicon(url: string): string {
  const domain = getSafeDomain(url);
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : "";
}

export function createBookmarkFromNode(
  node: chrome.bookmarks.BookmarkTreeNode
): Bookmark | null {
  if (!node.url) return null;
  const url = normalizeSafeUrl(node.url);
  if (!url) return null;
  const createdAt = node.dateAdded || Date.now();
  return {
    id: generateId(),
    title: node.title || url,
    url,
    favicon: favicon(url),
    chromeBookmarkId: node.id,
    createdAt,
    updatedAt: createdAt,
    visitCount: 0,
  };
}

export function createBoardFromFolder(
  folder: chrome.bookmarks.BookmarkTreeNode,
  order: number
): Board {
  return {
    id: generateId(),
    title: folder.title || "Bookmarks",
    order,
    bookmarks: [],
    chromeFolderId: folder.id,
  };
}

function getHomePage(state: ArcalistState, overwrite: boolean) {
  const pages = state.pages.map((page) => ({
    ...page,
    boards: page.boards.map((board) => ({
      ...board,
      bookmarks: [...board.bookmarks],
    })),
  }));

  let pageIndex = pages.findIndex((page) => page.title === HOME_PAGE_TITLE);
  if (pageIndex === -1) {
    pages.push({
      id: generateId(),
      title: HOME_PAGE_TITLE,
      order: pages.length,
      boards: [],
    });
    pageIndex = pages.length - 1;
  } else if (overwrite) {
    pages[pageIndex] = {
      ...pages[pageIndex],
      boards: [],
    };
  }

  return { pages, pageIndex };
}

function buildBoardUrlMap(state: ArcalistState): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const page of state.pages) {
    for (const board of page.boards) {
      const set = new Set<string>();
      for (const bookmark of board.bookmarks) {
        set.add(bookmark.url);
      }
      map.set(board.id, set);
    }
  }
  return map;
}

function mergeImportedPageIntoHome(
  state: ArcalistState
): ArcalistState | null {
  const pages = state.pages.map((page) => ({
    ...page,
    boards: page.boards.map((board) => ({
      ...board,
      bookmarks: [...board.bookmarks],
    })),
  }));

  const importedIndex = pages.findIndex(
    (page) => page.title === IMPORTED_PAGE_TITLE
  );
  if (importedIndex === -1) return null;

  let homeIndex = pages.findIndex((page) => page.title === HOME_PAGE_TITLE);
  if (homeIndex === -1) {
    pages.unshift({
      id: generateId(),
      title: HOME_PAGE_TITLE,
      order: 0,
      boards: [],
    });
    homeIndex = 0;
  }

  const homePage = pages[homeIndex];
  const importedPage = pages[importedIndex];

  for (const importedBoard of importedPage.boards) {
    const existingBoard = homePage.boards.find(
      (board) => board.title === importedBoard.title
    );

    if (!existingBoard) {
      homePage.boards.push(importedBoard);
      continue;
    }

    const existingUrls = new Set(
      existingBoard.bookmarks.map((bookmark) => bookmark.url)
    );
    for (const bookmark of importedBoard.bookmarks) {
      if (existingUrls.has(bookmark.url)) continue;
      existingBoard.bookmarks.push(bookmark);
      existingUrls.add(bookmark.url);
    }
  }

  pages.splice(importedIndex, 1);
  pages.forEach((page, index) => {
    page.order = index;
  });

  const activePageId =
    state.activePageId === importedPage.id
      ? homePage.id
      : state.activePageId;

  return {
    ...state,
    pages,
    activePageId,
    updatedAt: Date.now(),
  };
}

export async function parseBookmarkTree(
  root: chrome.bookmarks.BookmarkTreeNode,
  state: ArcalistState,
  overwriteImportedPage: boolean
): Promise<{ state: ArcalistState; map: Record<string, string> } | null> {
  const { pages, pageIndex } = getHomePage(state, overwriteImportedPage);
  const homePage = pages[pageIndex];
  const map: Record<string, string> = {};
  const boardUrlMap = buildBoardUrlMap({ ...state, pages });

  let hasChanges = false;

  function findBoardById(boardId: string): Board | null {
    for (const page of pages) {
      const board = page.boards.find((b) => b.id === boardId);
      if (board) return board;
    }
    return null;
  }

  function ensureBoard(folder: chrome.bookmarks.BookmarkTreeNode): Board {
    const folderId = folder.id;
    const mappedId = folderId ? map[folderId] : undefined;
    const mappedBoard = mappedId ? findBoardById(mappedId) : null;
    if (mappedBoard) {
      if (!mappedBoard.chromeFolderId) {
        mappedBoard.chromeFolderId = folder.id;
      }
      return mappedBoard;
    }

    const newBoard = createBoardFromFolder(folder, homePage.boards.length);
    homePage.boards.push(newBoard);
    if (folderId) {
      map[folderId] = newBoard.id;
    }
    hasChanges = true;
    return newBoard;
  }

  function addBookmarkToBoard(board: Board, bookmark: Bookmark) {
    const existingUrls =
      boardUrlMap.get(board.id) ?? new Set<string>();
    if (existingUrls.has(bookmark.url)) return;
    board.bookmarks.push(bookmark);
    existingUrls.add(bookmark.url);
    boardUrlMap.set(board.id, existingUrls);
    hasChanges = true;
  }

  function parseFolder(folder: chrome.bookmarks.BookmarkTreeNode): boolean {
    let hasContent = false;
    let board: Board | null = null;

    for (const child of folder.children ?? []) {
      if (child.url) {
        const bookmark = createBookmarkFromNode(child);
        if (!bookmark) continue;
        if (!board) board = ensureBoard(folder);
        addBookmarkToBoard(board, bookmark);
        hasContent = true;
      } else {
        const childHasContent = parseFolder(child);
        if (childHasContent) hasContent = true;
      }
    }

    if (hasContent && !board) {
      ensureBoard(folder);
    }

    return hasContent;
  }

  for (const topFolder of root.children ?? []) {
    parseFolder(topFolder);
  }

  const activePageId = state.activePageId || pages[0]?.id || "";

  if (!hasChanges) return null;

  return {
    state: {
      ...state,
      pages,
      activePageId,
      updatedAt: Date.now(),
    },
    map,
  };
}

export async function importChromeBookmarks(
  existingState?: ArcalistState
): Promise<ArcalistState | null> {
  const stored = await chrome.storage.local.get([
    STORAGE_KEY,
    IMPORT_FLAG_KEY,
  ]);

  const state = (existingState ?? stored[STORAGE_KEY]) as
    | ArcalistState
    | undefined;
  if (!state) return null;

  const migrated = mergeImportedPageIntoHome(state);
  if (migrated) {
    await chrome.storage.local.set({ [STORAGE_KEY]: migrated });
    await markDirty();
    return migrated;
  }

  const homePage = state.pages.find((page) => page.title === HOME_PAGE_TITLE);
  const importedCount = homePage
    ? homePage.boards.reduce(
        (acc, board) => acc + board.bookmarks.length,
        0,
      )
    : 0;
  const forceReimport = Boolean(stored[IMPORT_FLAG_KEY]) && importedCount === 0;

  if (stored[IMPORT_FLAG_KEY] && !forceReimport) return null;

  const tree = await chrome.bookmarks.getTree();
  const root = tree[0];
  if (!root?.children) {
    await chrome.storage.local.set({ [IMPORT_FLAG_KEY]: true });
    return null;
  }

  const parsed = await parseBookmarkTree(root, state, forceReimport);
  if (!parsed) {
    await chrome.storage.local.set({ [IMPORT_FLAG_KEY]: true });
    return null;
  }

  await chrome.storage.local.set({
    [STORAGE_KEY]: parsed.state,
    [IMPORT_FLAG_KEY]: true,
  });
  await markDirty();
  await setBookmarkMap(parsed.map);

  return parsed.state;
}
