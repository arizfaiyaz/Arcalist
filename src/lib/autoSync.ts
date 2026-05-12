import { addMapping, getBookmarkMap } from "./chromeBookmarkMap";
import { createBookmarkFromNode } from "./importBookmarks";
import type { ArcalistState, Bookmark } from "../types";

const LAST_SYNC_KEY = "arcalist_last_sync";

function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function collectDirectBookmarks(
  node: chrome.bookmarks.BookmarkTreeNode
): Bookmark[] {
  const out: Bookmark[] = [];
  for (const child of node.children ?? []) {
    if (!child.url) continue;
    const bookmark = createBookmarkFromNode(child);
    if (bookmark) out.push(bookmark);
  }
  return out;
}

function buildBoardUrlMap(state: ArcalistState): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const page of state.pages ?? []) {
    for (const board of page.boards ?? []) {
      const set = new Set<string>();
      for (const bookmark of board.bookmarks ?? []) {
        if (bookmark.url) set.add(bookmark.url);
      }
      map.set(board.id, set);
    }
  }
  return map;
}

function timestampValue(value: number | string | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export async function autoSyncChromeBookmarks(
  state: ArcalistState
): Promise<boolean> {
  try {
    const tree = await chrome.bookmarks.getTree();
    const root = tree[0];
    if (!root?.children) {
      return false;
    }

    const boardUrlMap = buildBoardUrlMap(state);
    const map = await getBookmarkMap();
    const lastSyncResult = await chrome.storage.local.get(LAST_SYNC_KEY);
    const lastSyncTime = (lastSyncResult[LAST_SYNC_KEY] as number) ?? 0;
    const isFirstSync = lastSyncTime === 0;

    let hasChanges = false;

    if (!state.pages || state.pages.length === 0) {
      state.pages = [
        {
          id: generateId(),
          title: "Home",
          order: 0,
          boards: [],
        },
      ];
      hasChanges = true;
    }

    const targetPage =
      state.pages.find((page) => page.title === "Home") ?? state.pages[0];
    targetPage.boards = targetPage.boards ?? [];

    function findBoardById(boardId: string) {
      for (const page of state.pages) {
        const board = page.boards.find((b) => b.id === boardId);
        if (board) return board;
      }
      return null;
    }

    function ensureBoardForFolder(
      folder: chrome.bookmarks.BookmarkTreeNode
    ) {
      const folderId = folder.id;
      const mappedId = folderId ? map[folderId] : undefined;
      const folderTitle = folder.title || "Bookmarks";
      let board = mappedId ? findBoardById(mappedId) : null;

      if (board && board.title !== folderTitle) {
        board = null;
      }

      if (!board) {
        board = {
          id: generateId(),
          title: folderTitle,
          order: targetPage.boards.length,
          bookmarks: [],
          chromeFolderId: folderId,
        };
        targetPage.boards.push(board);
      } else if (!board.chromeFolderId) {
        board.chromeFolderId = folderId;
      }

      if (folderId) {
        map[folderId] = board.id;
        addMapping(folderId, board.id).catch(() => {});
      }

      return board;
    }

    function processFolder(folder: chrome.bookmarks.BookmarkTreeNode) {
      const directBookmarks = collectDirectBookmarks(folder);
      if (directBookmarks.length > 0) {
        const board = ensureBoardForFolder(folder);
        board.bookmarks = board.bookmarks ?? [];
        const existingUrls =
          boardUrlMap.get(board.id) ?? new Set<string>();
        const before = board.bookmarks.length;

        for (const bm of directBookmarks) {
          if (!isFirstSync && timestampValue(bm.createdAt) < lastSyncTime) continue;
          if (existingUrls.has(bm.url)) continue;
          board.bookmarks.push(bm);
          existingUrls.add(bm.url);
        }

        boardUrlMap.set(board.id, existingUrls);
        if (board.bookmarks.length > before) {
          hasChanges = true;
        }
      }

      for (const child of folder.children ?? []) {
        if (!child.url) processFolder(child);
      }
    }

    for (const topFolder of root.children) {
      processFolder(topFolder);
    }

    if (!state.activePageId && state.pages && state.pages.length > 0) {
      state.activePageId = state.pages[0].id;
    }

    if (hasChanges) {
      state.updatedAt = Date.now();
      await chrome.storage.local.set({ arcalist_state: state });
      await chrome.storage.local.set({ [LAST_SYNC_KEY]: Date.now() });
    }

    return hasChanges;
  } catch (error) {
    console.error("[Arcalist] Auto-sync failed:", error);
    return false;
  }
}

export async function initializeAutoSync(): Promise<void> {
  chrome.alarms.create("arcalist-auto-sync", {
    periodInMinutes: 1,
  });
}

export async function handleAutoSyncAlarm(): Promise<void> {
  const result = await chrome.storage.local.get("arcalist_state");
  const state = result["arcalist_state"] as ArcalistState | undefined;

  if (!state) return;

  const changed = await autoSyncChromeBookmarks(state);

  if (changed) {
    chrome.runtime.sendMessage({ type: "CHROME_BOOKMARKS_UPDATED" }).catch(
      () => {
        // New tab might not be open — that's fine
      }
    );
  }
}
