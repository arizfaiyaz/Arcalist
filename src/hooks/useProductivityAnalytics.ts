import { useCallback, useEffect, useMemo, useState } from "react";
import type { PlanName } from "../lib/planLimits";
import { useArcalistStore } from "../store/useArcalistStore";
import { usePlanLimits } from "./usePlanLimits";
import {
  aggregateStatsForDates,
  ANALYTICS_PLAN_STORAGE_KEY,
  ANALYTICS_STORAGE_KEY,
  createDefaultAnalyticsState,
  getDateRangeKeys,
  getTodayKey,
  normalizeAnalyticsState,
  type AnalyticsMessage,
  type AnalyticsPlanStatus,
  type DomainTimeStat,
  type ProductivityAnalyticsState,
} from "../lib/productivityAnalytics";
import { syncProductivityAnalyticsToCloud } from "../lib/productivityAnalyticsSync";

type AnalyticsRange = "today" | "7d" | "30d";

type AnalyticsMessageResponse = {
  ok: boolean;
  stats?: ProductivityAnalyticsState;
  error?: string;
};

const hasChromeStorage = () =>
  typeof chrome !== "undefined" && Boolean(chrome.storage?.local);

const hasChromeRuntime = () =>
  typeof chrome !== "undefined" && Boolean(chrome.runtime?.sendMessage);

async function readAnalyticsFromStorage() {
  if (hasChromeStorage()) {
    const result = await chrome.storage.local.get(ANALYTICS_STORAGE_KEY);
    return normalizeAnalyticsState(
      result[ANALYTICS_STORAGE_KEY] as Partial<ProductivityAnalyticsState> | null,
    );
  }

  const raw = localStorage.getItem(ANALYTICS_STORAGE_KEY);
  return normalizeAnalyticsState(
    raw
      ? (JSON.parse(raw) as Partial<ProductivityAnalyticsState>)
      : createDefaultAnalyticsState(),
  );
}

async function writeAnalyticsToStorage(state: ProductivityAnalyticsState) {
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [ANALYTICS_STORAGE_KEY]: state });
    return;
  }
  localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(state));
}

async function sendAnalyticsMessage(message: AnalyticsMessage) {
  if (!hasChromeRuntime()) return null;

  try {
    return (await chrome.runtime.sendMessage(
      message,
    )) as AnalyticsMessageResponse;
  } catch {
    return null;
  }
}

export async function setAnalyticsPlanStatus(
  isProUser: boolean,
  planName: PlanName,
) {
  // Cache only. Background code must re-check auth and resolve entitlement from
  // Supabase user_entitlements before treating this as Pro.
  const plan: AnalyticsPlanStatus = {
    isProUser,
    planName,
    updatedAt: new Date().toISOString(),
  };

  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [ANALYTICS_PLAN_STORAGE_KEY]: plan });
  } else {
    localStorage.setItem(ANALYTICS_PLAN_STORAGE_KEY, JSON.stringify(plan));
  }

  await sendAnalyticsMessage({ type: "ANALYTICS_SET_PLAN_STATUS", plan });
}

export function useProductivityAnalytics(range: AnalyticsRange = "today") {
  const user = useArcalistStore((state) => state.user);
  const planLimits = usePlanLimits();
  const [stats, setStats] = useState<ProductivityAnalyticsState>(() =>
    createDefaultAnalyticsState(),
  );
  const [loading, setLoading] = useState(true);

  const refreshStats = useCallback(async () => {
    setLoading(true);
    const response = await sendAnalyticsMessage({
      type: "ANALYTICS_GET_STATS",
    });
    const next = response?.stats ?? (await readAnalyticsFromStorage());
    setStats(next);
    setLoading(false);
    void syncProductivityAnalyticsToCloud(
      user?.id,
      next,
      planLimits.isProUser,
    );
    return next;
  }, [planLimits.isProUser, user?.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshStats();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshStats]);

  const setTrackingEnabled = useCallback(async (enabled: boolean) => {
    const response = await sendAnalyticsMessage({
      type: "ANALYTICS_SET_TRACKING_ENABLED",
      enabled,
    });

    if (response?.stats) {
      setStats(response.stats);
      return;
    }

    const current = await readAnalyticsFromStorage();
    const next = {
      ...current,
      trackingEnabled: enabled,
      lastUpdatedAt: new Date().toISOString(),
    };
    await writeAnalyticsToStorage(next);
    setStats(next);
  }, []);

  const clearToday = useCallback(async () => {
    const response = await sendAnalyticsMessage({
      type: "ANALYTICS_CLEAR_TODAY",
    });
    if (response?.stats) {
      setStats(response.stats);
      return;
    }

    const current = await readAnalyticsFromStorage();
    const next = {
      ...current,
      lastUpdatedAt: new Date().toISOString(),
      domainStats: {
        ...current.domainStats,
        [getTodayKey()]: {},
      },
    };
    await writeAnalyticsToStorage(next);
    setStats(next);
  }, []);

  const clearAll = useCallback(async () => {
    const response = await sendAnalyticsMessage({
      type: "ANALYTICS_CLEAR_ALL",
    });
    if (response?.stats) {
      setStats(response.stats);
      return;
    }

    const current = await readAnalyticsFromStorage();
    const next = {
      ...createDefaultAnalyticsState(),
      trackingEnabled: current.trackingEnabled,
    };
    await writeAnalyticsToStorage(next);
    setStats(next);
  }, []);

  const dateKeys = useMemo(() => getDateRangeKeys(range), [range]);
  const rangeStats = useMemo(
    () => aggregateStatsForDates(stats, dateKeys),
    [dateKeys, stats],
  );
  const todayStats = useMemo<DomainTimeStat[]>(
    () => aggregateStatsForDates(stats, [getTodayKey()]),
    [stats],
  );
  const topDomains = useMemo(() => rangeStats.slice(0, 10), [rangeStats]);
  const totalTrackedMs = useMemo(
    () => rangeStats.reduce((total, stat) => total + stat.totalMs, 0),
    [rangeStats],
  );

  return {
    stats,
    todayStats,
    rangeStats,
    topDomains,
    totalTrackedMs,
    trackingEnabled: stats.trackingEnabled,
    loading,
    setTrackingEnabled,
    clearToday,
    clearAll,
    refreshStats,
  };
}
