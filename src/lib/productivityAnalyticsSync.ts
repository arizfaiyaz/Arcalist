import { supabase } from "./supabase";
import { resolveAuthenticatedPlanStatus } from "./plan";
import type {
  DomainTimeStat,
  ProductivityAnalyticsState,
} from "./productivityAnalytics";

type AnalyticsRow = {
  user_id: string;
  date: string;
  domain: string;
  total_ms: number;
  favicon_url?: string;
  category?: string;
  updated_at: string;
};

export async function syncProductivityAnalyticsToCloud(
  userId: string | undefined,
  analytics: ProductivityAnalyticsState,
  isProUser = false,
) {
  if (!userId) return;
  if (!isProUser) return;
  if (!(await resolveAuthenticatedPlanStatus(userId)).isProUser) return;

  const rows: AnalyticsRow[] = [];
  for (const [date, statsByDomain] of Object.entries(analytics.domainStats)) {
    for (const stat of Object.values(statsByDomain)) {
      rows.push(toAnalyticsRow(userId, date, stat));
    }
  }

  if (rows.length === 0) return;

  // TODO: Frontend gating is not enough. This must also be protected by RLS,
  // RPC, or Edge Function entitlement checks before production.
  const { error } = await supabase.from("productivity_analytics").upsert(rows, {
    onConflict: "user_id,date,domain",
  });

  if (error) {
    console.warn("[Arcalist] Productivity analytics sync skipped:", error.message);
  }
}

function toAnalyticsRow(
  userId: string,
  date: string,
  stat: DomainTimeStat,
): AnalyticsRow {
  return {
    user_id: userId,
    date,
    domain: stat.domain,
    total_ms: Math.round(stat.totalMs),
    favicon_url: stat.faviconUrl,
    category: stat.category ?? "other",
    updated_at: stat.updatedAt,
  };
}
