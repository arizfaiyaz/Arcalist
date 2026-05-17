import {
  initializeAutoSync,
  handleAutoSyncAlarm,
} from "../lib/autoSync";
import {
  getStoredAuthState,
  getWorkspaceStorageKey,
} from "../lib/storage";
import { resolveAuthenticatedPlanStatus } from "../lib/plan";
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
import type { ArcalistState } from "../types";

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

function getHostname(url: string): string | null {
  return getSafeDomain(url);
}

async function getState(): Promise<{ state: ArcalistState; userId: string } | null> {
  const authState = await getStoredAuthState();
  if (!authState.isAuthenticated || !authState.userId) return null;
  const storageKey = getWorkspaceStorageKey(authState.userId);
  const result = await chrome.storage.local.get(storageKey);
  const state = result[storageKey] as ArcalistState | undefined;
  return state ? { state, userId: authState.userId } : null;
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

function defaultAnalyticsPlanStatus(): AnalyticsPlanStatus {
  return {
    isProUser: false,
    planName: "free",
    updatedAt: new Date().toISOString(),
  };
}

async function getAnalyticsPlanStatus(): Promise<AnalyticsPlanStatus> {
  const authState = await getStoredAuthState();
  if (!authState.isAuthenticated || !authState.userId) {
    return defaultAnalyticsPlanStatus();
  }

  const resolved = await resolveAuthenticatedPlanStatus(authState.userId);
  return resolved.isProUser ? resolved : defaultAnalyticsPlanStatus();
}

async function canTrackAnalytics() {
  const authState = await getStoredAuthState();
  if (!authState.isAuthenticated || !authState.userId) {
    return {
      allowed: false,
      analytics: createDefaultAnalyticsState(),
    };
  }
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
  const authState = await getStoredAuthState();
  if (!authState.isAuthenticated || !authState.userId) return;

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

function isAnalyticsPlanStatus(value: unknown): value is AnalyticsPlanStatus {
  if (!value || typeof value !== "object") return false;
  const plan = value as Partial<AnalyticsPlanStatus>;
  return (
    typeof plan.isProUser === "boolean" &&
    (plan.planName === "free" || plan.planName === "pro") &&
    typeof plan.updatedAt === "string"
  );
}

function isAnalyticsMessage(
  message: unknown,
): message is AnalyticsMessage {
  if (!message || typeof message !== "object") return false;
  const candidate = message as Partial<AnalyticsMessage> & {
    type?: string;
    enabled?: unknown;
    plan?: unknown;
  };

  switch (candidate.type) {
    case "ANALYTICS_FLUSH_ACTIVE_SESSION":
    case "ANALYTICS_GET_STATS":
    case "ANALYTICS_CLEAR_TODAY":
    case "ANALYTICS_CLEAR_ALL":
      return true;
    case "ANALYTICS_SET_TRACKING_ENABLED":
      return typeof candidate.enabled === "boolean";
    case "ANALYTICS_SET_PLAN_STATUS":
      return isAnalyticsPlanStatus(candidate.plan);
    default:
      return false;
  }
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
  // Initialize auto-sync on install or update
  await initializeAutoSync();
  initializeAnalyticsTracking();

  if (details.reason === "install") {
    notifyNewTab();
  }
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
    message: unknown,
    _sender,
    sendResponse,
  ) => {
    const type = (message as { type?: unknown })?.type;
    if (typeof type !== "string" || !type.startsWith("ANALYTICS_")) return false;

    void (async () => {
      try {
        if (!isAnalyticsMessage(message)) {
          sendResponse({ ok: false, error: "Invalid analytics message." });
          return;
        }

        const analyticsMessage = message;
        const authState = await getStoredAuthState();
        if (!authState.isAuthenticated || !authState.userId) {
          activeSession = null;
          sendResponse({
            ok: false,
            stats: createDefaultAnalyticsState(),
            error: "Sign in to Arcalist to use analytics.",
          });
          return;
        }

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
          const resolvedPlan = await resolveAuthenticatedPlanStatus(
            authState.userId,
          );
          await chrome.storage.local.set({
            [ANALYTICS_PLAN_STORAGE_KEY]: resolvedPlan,
          });
          if (resolvedPlan.isProUser) {
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

  const loaded = await getState();
  if (!loaded) return;
  const { state } = loaded;

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

  const parentId = targetBoard.chromeFolderId;
  if (!parentId) return;

  await chrome.bookmarks.create({
    parentId,
    title: tab.title,
    url: safeUrl,
  });

  chrome.runtime.sendMessage({ type: "QUICK_SAVE_DONE" }).catch(() => {});
});

// ─── Chrome Bookmarks Bridge ──────────────────────────────

chrome.bookmarks.onCreated.addListener((_id, bookmark) => {
  if (!bookmark.url) return;
  notifyNewTab();
});

chrome.bookmarks.onChanged.addListener(() => {
  notifyNewTab();
});

chrome.bookmarks.onRemoved.addListener(() => {
  notifyNewTab();
});

chrome.bookmarks.onMoved.addListener(() => {
  notifyNewTab();
});

chrome.bookmarks.onChildrenReordered?.addListener(() => {
  notifyNewTab();
});
