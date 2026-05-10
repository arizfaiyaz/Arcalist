import {
  getBookmarkMap,
  addMapping,
  removeMapping,
} from "../lib/chromeBookmarkMap";
import { importChromeBookmarks } from "../lib/importBookmarks";
import type { ArcalistState } from "../types";

const STORAGE_KEY = "arcalist_state";

// ─── Helpers ─────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 8);
}

function favicon(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

async function getState(): Promise<ArcalistState | null> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as ArcalistState) ?? null;
}

async function saveState(state: object) {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

function notifyNewTab() {
  chrome.runtime.sendMessage({ type: "CHROME_BOOKMARKS_UPDATED" }).catch(() => {
    // New tab might not be open — that's fine
  });
}

// ─── Install ─────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("[Arcalist] Installed");

  // On a fresh install pull in all existing Chrome bookmarks so the user
  // sees their bookmarks immediately without any manual import step.
  if (details.reason === "install") {
    await importChromeBookmarks();
  }
});

// ─── Quick Save Command ───────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "quick-save") return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !tab?.title) return;
  if (
    tab.url.startsWith("chrome://") ||
    tab.url.startsWith("chrome-extension://")
  )
    return;

  let domain = "";
  try {
    domain = new URL(tab.url).hostname;
  } catch {
    return;
  }

  const state = await getState();
  if (!state) return;

  const firstPage = state.pages?.[0];
  if (!firstPage) return;

  const targetBoard =
    firstPage.boards?.find(
      (b: { title: string }) => b.title.toLowerCase() === "inbox",
    ) ?? firstPage.boards?.[0];

  if (!targetBoard) return;

  targetBoard.bookmarks.unshift({
    id: generateId(),
    title: tab.title,
    url: tab.url,
    favicon: favicon(domain),
    createdAt: Date.now(),
  });

  await saveState(state);

  chrome.runtime.sendMessage({ type: "QUICK_SAVE_DONE" }).catch(() => {});
});

// ─── Chrome Bookmarks Bridge ──────────────────────────────

// Fires when user creates a bookmark OR a folder in Chrome
chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
  const state = await getState();
  if (!state || !state.pages?.length) return;

  const isFolder = !bookmark.url;

  if (isFolder) {
    // User created a new folder in Chrome → create a matching Board in Arcalist
    const newBoard = {
      id: generateId(),
      title: bookmark.title || "New Board",
      order: 0,
      bookmarks: [],
    };

    // Add to the first page
    const firstPage = state.pages[0];
    firstPage.boards = firstPage.boards ?? [];
    firstPage.boards.push(newBoard);

    await saveState(state);

    // Remember the mapping so we know where to put bookmarks later
    await addMapping(id, newBoard.id);

    notifyNewTab();
  } else if (bookmark.url) {
    // User bookmarked a site inside a Chrome folder
    // Check if that folder is mapped to an Arcalist board
    const map = await getBookmarkMap();
    const boardId = bookmark.parentId ? map[bookmark.parentId] : null;

    if (!boardId) return; // Folder not tracked by Arcalist — ignore

    let domain = "";
    try {
      domain = new URL(bookmark.url).hostname;
    } catch {
      return;
    }

    const newBookmark = {
      id: generateId(),
      title: bookmark.title || domain,
      url: bookmark.url,
      favicon: favicon(domain),
      createdAt: Date.now(),
    };

    // Find the target board across all pages and add the bookmark
    let added = false;
    for (const page of state.pages) {
      for (const board of page.boards ?? []) {
        if (board.id === boardId) {
          board.bookmarks = board.bookmarks ?? [];
          board.bookmarks.push(newBookmark);
          added = true;
          break;
        }
      }
      if (added) break;
    }

    if (added) {
      await saveState(state);
      notifyNewTab();
    }
  }
});

// Fires when user renames a folder or bookmark in Chrome
chrome.bookmarks.onChanged.addListener(async (id, changeInfo) => {
  const map = await getBookmarkMap();
  const boardId = map[id];

  if (!boardId) return; // Not a tracked folder

  const state = await getState();
  if (!state) return;

  // Rename the matching board
  for (const page of state.pages) {
    for (const board of page.boards ?? []) {
      if (board.id === boardId) {
        board.title = changeInfo.title ?? board.title;
        break;
      }
    }
  }

  await saveState(state);
  notifyNewTab();
});

// Fires when user deletes a bookmark or folder in Chrome
chrome.bookmarks.onRemoved.addListener(async (id) => {
  const map = await getBookmarkMap();
  const boardId = map[id];

  if (!boardId) return; // Not a tracked folder — ignore

  const state = await getState();
  if (!state) return;

  // Remove the matching board from Arcalist
  for (const page of state.pages) {
    page.boards = (page.boards ?? []).filter(
      (b: { id: string }) => b.id !== boardId,
    );
  }

  await saveState(state);
  await removeMapping(id);
  notifyNewTab();
});
