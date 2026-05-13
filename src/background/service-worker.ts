import {
  getBookmarkMap,
  addMapping,
  removeMapping,
} from "../lib/chromeBookmarkMap";
import { importChromeBookmarks } from "../lib/importBookmarks";
import {
  initializeAutoSync,
  handleAutoSyncAlarm,
} from "../lib/autoSync";
import { getPlanStatus, markDirty } from "../lib/sync/syncStorage";
import { FREE_PLAN } from "../config/plans";
import { getSafeDomain, normalizeSafeUrl } from "../lib/urlSafety";
import { getDomainFromUrl, getFaviconForDomain } from "../lib/domain";
import {
  addDomainTime,
  ANALYTICS_PLAN_STORAGE_KEY,
  ANALYTICS_STORAGE_KEY,
  createDefaultAnalyticsState,
  getTodayKey,
  normalizeAnalyticsState,
  type AnalyticsMessage,
  type AnalyticsPlanStatus,
  type ProductivityAnalyticsState,
} from "../lib/productivityAnalytics";
import type { ArcalistState, Board, Page } from "../types";

const STORAGE_KEY = "arcalist_state";
const ANALYTICS_ALARM_NAME = "arcalist-analytics-flush";
const ANALYTICS_IDLE_THRESHOLD_SECONDS = 60;
const MIN_TRACKED_MS = 1000;

type ActiveTrackingSession = {
  domain: string;
  startedAt: number;
  tabId: number;
  windowId: number;
  faviconUrl?: string;
};

type IdleStateValue = `${chrome.idle.IdleState}`;

let activeSession: ActiveTrackingSession | null = null;
let currentWindowFocused = true;
let currentIdleState: IdleStateValue = "active";

// ─── Helpers ─────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 8);
}

function favicon(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

function getHostname(url: string): string | null {
  return getSafeDomain(url);
}

async function getState(): Promise<ArcalistState | null> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as ArcalistState) ?? null;
}

async function saveState(state: object) {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
  await markDirty();
}

function notifyNewTab() {
  chrome.runtime.sendMessage({ type: "CHROME_BOOKMARKS_UPDATED" }).catch(() => {
    // New tab might not be open — that's fine
  });
}

// ─── Productivity Analytics ──────────────────────────────

async function getAnalyticsState(): Promise<ProductivityAnalyticsState> {
  const result = await chrome.storage.local.get(ANALYTICS_STORAGE_KEY);
  return normalizeAnalyticsState(
    result[ANALYTICS_STORAGE_KEY] as Partial<ProductivityAnalyticsState> | null,
  );
}

async function saveAnalyticsState(state: ProductivityAnalyticsState) {
  await chrome.storage.local.set({ [ANALYTICS_STORAGE_KEY]: state });
}

async function getAnalyticsPlanStatus(): Promise<AnalyticsPlanStatus> {
  const result = await chrome.storage.local.get(ANALYTICS_PLAN_STORAGE_KEY);
  const stored = result[ANALYTICS_PLAN_STORAGE_KEY] as
    | Partial<AnalyticsPlanStatus>
    | undefined;
  return {
    isProUser: stored?.isProUser ?? false,
    planName: stored?.planName === "pro" ? "pro" : "free",
    updatedAt: stored?.updatedAt ?? new Date().toISOString(),
  };
}

async function canTrackAnalytics() {
  const [analytics, plan] = await Promise.all([
    getAnalyticsState(),
    getAnalyticsPlanStatus(),
  ]);
  return {
    allowed:
      analytics.trackingEnabled &&
      plan.isProUser &&
      currentWindowFocused &&
      currentIdleState === "active",
    analytics,
  };
}

async function flushActiveSession() {
  if (!activeSession) return;
  const session = activeSession;
  activeSession = null;

  const elapsedMs = Date.now() - session.startedAt;
  if (elapsedMs < MIN_TRACKED_MS) return;

  const [analytics, plan] = await Promise.all([
    getAnalyticsState(),
    getAnalyticsPlanStatus(),
  ]);
  if (
    !plan.isProUser ||
    !analytics.trackingEnabled ||
    analytics.excludedDomains.includes(session.domain)
  ) {
    return;
  }

  await saveAnalyticsState(
    addDomainTime(
      analytics,
      session.domain,
      elapsedMs,
      session.faviconUrl,
      getTodayKey(),
    ),
  );
}

async function getActiveTab(windowId?: number) {
  const query: chrome.tabs.QueryInfo =
    typeof windowId === "number"
      ? { active: true, windowId }
      : { active: true, lastFocusedWindow: true };
  const [tab] = await chrome.tabs.query(query);
  return tab ?? null;
}

async function tabWindowIsFocused(tab: chrome.tabs.Tab) {
  if (typeof tab.windowId !== "number") return false;
  try {
    const windowInfo = await chrome.windows.get(tab.windowId);
    return Boolean(windowInfo.focused);
  } catch {
    return false;
  }
}

async function startSessionForTab(tab: chrome.tabs.Tab | null) {
  await flushActiveSession();
  if (!tab?.url || tab.id === undefined || tab.windowId === undefined) return;
  if (tab.incognito) return;

  const domain = getDomainFromUrl(tab.url);
  if (!domain) return;

  const focused = await tabWindowIsFocused(tab);
  currentWindowFocused = focused;
  if (!focused) return;

  const { allowed, analytics } = await canTrackAnalytics();
  if (!allowed || analytics.excludedDomains.includes(domain)) return;

  activeSession = {
    domain,
    tabId: tab.id,
    windowId: tab.windowId,
    startedAt: Date.now(),
    faviconUrl: tab.favIconUrl || getFaviconForDomain(domain),
  };
}

function canCreateBackgroundBoard(state: ArcalistState) {
  return getPlanStatus().then((plan) => {
    if (plan.isProUser) return true;
    const firstPage = state.pages?.[0];
    return (firstPage?.boards?.length ?? 0) < FREE_PLAN.maxBoardsPerPage;
  });
}

function createTrashedItemsForBoard(board: Board, page: Page) {
  return (board.bookmarks ?? []).map((bookmark) => ({
    bookmark: { ...bookmark, isTrashed: true },
    deletedAt: Date.now(),
    fromBoardTitle: board.title,
    fromPageTitle: page.title,
    fromBoardId: board.id,
    fromPageId: page.id,
  }));
}

async function restartTrackingForActiveTab(windowId?: number) {
  const tab = await getActiveTab(windowId);
  await startSessionForTab(tab);
}

async function flushAndRestartActiveSession() {
  const sessionWindowId = activeSession?.windowId;
  await flushActiveSession();
  await restartTrackingForActiveTab(sessionWindowId);
}

function initializeAnalyticsTracking() {
  chrome.alarms.create(ANALYTICS_ALARM_NAME, { periodInMinutes: 1 });
  chrome.idle?.setDetectionInterval?.(ANALYTICS_IDLE_THRESHOLD_SECONDS);
  void chrome.idle?.queryState?.(
    ANALYTICS_IDLE_THRESHOLD_SECONDS,
    (state) => {
      currentIdleState = state ?? "active";
      if (currentIdleState === "active") {
        void restartTrackingForActiveTab();
      }
    },
  );
}

// ─── Install ─────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async (details) => {

  // On a fresh install pull in all existing Chrome bookmarks so the user
  // sees their bookmarks immediately without any manual import step.
  if (details.reason === "install") {
    await importChromeBookmarks();
  }

  // Initialize auto-sync on install or update
  await initializeAutoSync();
  initializeAnalyticsTracking();
});

chrome.runtime.onStartup?.addListener(() => {
  initializeAnalyticsTracking();
  void restartTrackingForActiveTab();
});

// ─── Auto-Sync Alarm ──────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "arcalist-auto-sync") {
    await handleAutoSyncAlarm();
  } else if (alarm.name === ANALYTICS_ALARM_NAME) {
    await flushAndRestartActiveSession();
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  void restartTrackingForActiveTab(activeInfo.windowId);
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (!tab.active) return;
  if (!changeInfo.url && changeInfo.status !== "complete") return;
  void startSessionForTab(tab);
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    currentWindowFocused = false;
    void flushActiveSession();
    return;
  }
  currentWindowFocused = true;
  void restartTrackingForActiveTab(windowId);
});

chrome.idle?.onStateChanged?.addListener((newState) => {
  currentIdleState = newState;
  if (newState === "active") {
    void restartTrackingForActiveTab();
  } else {
    void flushActiveSession();
  }
});

chrome.runtime.onMessage.addListener(
  (
    message: AnalyticsMessage | { type: string },
    _sender,
    sendResponse,
  ) => {
    if (!message?.type?.startsWith("ANALYTICS_")) return false;

    void (async () => {
      try {
        const analyticsMessage = message as AnalyticsMessage;

        if (analyticsMessage.type === "ANALYTICS_FLUSH_ACTIVE_SESSION") {
          await flushAndRestartActiveSession();
          sendResponse({ ok: true, stats: await getAnalyticsState() });
          return;
        }

        if (analyticsMessage.type === "ANALYTICS_GET_STATS") {
          await flushAndRestartActiveSession();
          sendResponse({ ok: true, stats: await getAnalyticsState() });
          return;
        }

        if (analyticsMessage.type === "ANALYTICS_SET_TRACKING_ENABLED") {
          const analytics = await getAnalyticsState();
          const next = {
            ...analytics,
            trackingEnabled: analyticsMessage.enabled,
            lastUpdatedAt: new Date().toISOString(),
          };
          await saveAnalyticsState(next);
          if (analyticsMessage.enabled) {
            await restartTrackingForActiveTab();
          } else {
            await flushActiveSession();
          }
          sendResponse({ ok: true, stats: next });
          return;
        }

        if (analyticsMessage.type === "ANALYTICS_CLEAR_TODAY") {
          await flushActiveSession();
          const analytics = await getAnalyticsState();
          const next = {
            ...analytics,
            lastUpdatedAt: new Date().toISOString(),
            domainStats: {
              ...analytics.domainStats,
              [getTodayKey()]: {},
            },
          };
          await saveAnalyticsState(next);
          await restartTrackingForActiveTab();
          sendResponse({ ok: true, stats: next });
          return;
        }

        if (analyticsMessage.type === "ANALYTICS_CLEAR_ALL") {
          await flushActiveSession();
          const next = {
            ...createDefaultAnalyticsState(),
            trackingEnabled: (await getAnalyticsState()).trackingEnabled,
          };
          await saveAnalyticsState(next);
          await restartTrackingForActiveTab();
          sendResponse({ ok: true, stats: next });
          return;
        }

        if (analyticsMessage.type === "ANALYTICS_SET_PLAN_STATUS") {
          await chrome.storage.local.set({
            [ANALYTICS_PLAN_STORAGE_KEY]: analyticsMessage.plan,
          });
          if (analyticsMessage.plan.isProUser) {
            await restartTrackingForActiveTab();
          } else {
            await flushActiveSession();
          }
          sendResponse({ ok: true });
          return;
        }

        sendResponse({ ok: false, error: "Unknown analytics message." });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();

    return true;
  },
);

// ─── Quick Save Command ───────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "quick-save") return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !tab?.title) return;
  const safeUrl = normalizeSafeUrl(tab.url);
  if (!safeUrl) return;

  const domain = getHostname(safeUrl);
  if (!domain) return;

  const state = await getState();
  if (!state) return;

  const firstPage = state.pages?.[0];
  if (!firstPage) return;
  const preferredBoardId = state.settings?.defaultCaptureBoardId;
  let targetBoard = preferredBoardId
    ? firstPage.boards?.find((b: { id: string }) => b.id === preferredBoardId)
    : null;

  if (!targetBoard) {
    targetBoard =
      firstPage.boards?.find(
        (b: { title: string }) => b.title.toLowerCase() === "inbox",
      ) ?? firstPage.boards?.[0];
  }

  if (!targetBoard) return;

  const now = new Date().toISOString();
  targetBoard.bookmarks.unshift({
    id: generateId(),
    title: tab.title,
    url: safeUrl,
    favicon: favicon(domain),
    createdAt: now,
    updatedAt: now,
    visitCount: 0,
  });
  state.updatedAt = Date.now();

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
    if (!(await canCreateBackgroundBoard(state))) return;

    // User created a new folder in Chrome → create a matching Board in Arcalist
    const newBoard = {
      id: generateId(),
      title: bookmark.title || "New Board",
      order: 0,
      bookmarks: [],
      chromeFolderId: id,
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

    const safeUrl = normalizeSafeUrl(bookmark.url);
    if (!safeUrl) return;
    const domain = getHostname(safeUrl);
    if (!domain) return;

    const now = new Date().toISOString();
    const newBookmark = {
      id: generateId(),
      title: bookmark.title || domain,
      url: safeUrl,
      favicon: favicon(domain),
      chromeBookmarkId: id,
      createdAt: now,
      updatedAt: now,
      visitCount: 0,
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
      state.updatedAt = Date.now();
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

  // Move the matching board's bookmarks to trash before removing the board.
  const trashedItems = [];
  for (const page of state.pages) {
    const board = page.boards?.find(
      (b: { id: string }) => b.id === boardId,
    ) as Board | undefined;
    if (board) {
      trashedItems.push(...createTrashedItemsForBoard(board, page));
    }
    page.boards = (page.boards ?? []).filter(
      (b: { id: string }) => b.id !== boardId,
    );
  }
  state.trash = [...(state.trash ?? []), ...trashedItems];
  state.updatedAt = Date.now();

  await saveState(state);
  await removeMapping(id);
  notifyNewTab();
});
