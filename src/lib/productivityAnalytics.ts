import type { PlanName } from "./planLimits";
import {
  categorizeDomain,
  type DomainCategory,
} from "../config/domainCategories";
import { getFaviconForDomain } from "./domain";

export const ANALYTICS_STORAGE_KEY = "arcalist_productivity_analytics";
export const ANALYTICS_PLAN_STORAGE_KEY = "arcalist_plan_status";

export type DomainTimeStat = {
  domain: string;
  totalMs: number;
  date: string;
  faviconUrl?: string;
  category?: DomainCategory;
  updatedAt: string;
};

export type ProductivityAnalyticsState = {
  trackingEnabled: boolean;
  lastUpdatedAt: string;
  domainStats: Record<string, Record<string, DomainTimeStat>>;
  excludedDomains: string[];
};

export type AnalyticsPlanStatus = {
  isProUser: boolean;
  planName: PlanName;
  updatedAt: string;
};

export type AnalyticsMessage =
  | { type: "ANALYTICS_FLUSH_ACTIVE_SESSION" }
  | { type: "ANALYTICS_GET_STATS" }
  | { type: "ANALYTICS_SET_TRACKING_ENABLED"; enabled: boolean }
  | { type: "ANALYTICS_CLEAR_TODAY" }
  | { type: "ANALYTICS_CLEAR_ALL" }
  | { type: "ANALYTICS_SET_PLAN_STATUS"; plan: AnalyticsPlanStatus };

export const createDefaultAnalyticsState = (): ProductivityAnalyticsState => ({
  trackingEnabled: true,
  lastUpdatedAt: new Date().toISOString(),
  domainStats: {},
  excludedDomains: [],
});

export function getTodayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function normalizeAnalyticsState(
  state?: Partial<ProductivityAnalyticsState> | null,
): ProductivityAnalyticsState {
  const fallback = createDefaultAnalyticsState();
  return {
    trackingEnabled: state?.trackingEnabled ?? fallback.trackingEnabled,
    lastUpdatedAt: state?.lastUpdatedAt ?? fallback.lastUpdatedAt,
    domainStats: state?.domainStats ?? {},
    excludedDomains: state?.excludedDomains ?? [],
  };
}

export function createDomainStat(
  domain: string,
  date: string,
  faviconUrl?: string,
): DomainTimeStat {
  const now = new Date().toISOString();
  return {
    domain,
    totalMs: 0,
    date,
    faviconUrl: faviconUrl || getFaviconForDomain(domain),
    category: categorizeDomain(domain),
    updatedAt: now,
  };
}

export function addDomainTime(
  state: ProductivityAnalyticsState,
  domain: string,
  elapsedMs: number,
  faviconUrl?: string,
  date = getTodayKey(),
): ProductivityAnalyticsState {
  if (elapsedMs <= 0) return state;

  const now = new Date().toISOString();
  const dayStats = { ...(state.domainStats[date] ?? {}) };
  const current = dayStats[domain] ?? createDomainStat(domain, date, faviconUrl);

  dayStats[domain] = {
    ...current,
    totalMs: current.totalMs + elapsedMs,
    faviconUrl: current.faviconUrl || faviconUrl || getFaviconForDomain(domain),
    category: current.category ?? categorizeDomain(domain),
    updatedAt: now,
  };

  return {
    ...state,
    lastUpdatedAt: now,
    domainStats: {
      ...state.domainStats,
      [date]: dayStats,
    },
  };
}

export function getDateRangeKeys(range: "today" | "7d" | "30d"): string[] {
  const days = range === "today" ? 1 : range === "7d" ? 7 : 30;
  const keys: string[] = [];
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    keys.push(getTodayKey(date));
  }
  return keys;
}

export function aggregateStatsForDates(
  state: ProductivityAnalyticsState,
  dates: string[],
): DomainTimeStat[] {
  const byDomain = new Map<string, DomainTimeStat>();

  for (const date of dates) {
    for (const stat of Object.values(state.domainStats[date] ?? {})) {
      const existing = byDomain.get(stat.domain);
      if (!existing) {
        byDomain.set(stat.domain, { ...stat });
        continue;
      }
      byDomain.set(stat.domain, {
        ...existing,
        totalMs: existing.totalMs + stat.totalMs,
        updatedAt:
          Date.parse(stat.updatedAt) > Date.parse(existing.updatedAt)
            ? stat.updatedAt
            : existing.updatedAt,
      });
    }
  }

  return Array.from(byDomain.values()).sort(
    (a, b) => b.totalMs - a.totalMs || a.domain.localeCompare(b.domain),
  );
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const totalMinutes = Math.round(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}
