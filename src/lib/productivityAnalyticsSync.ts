import { supabase } from "./supabase";
import { resolveAuthenticatedPlanStatus } from "./plan";
import { getFriendlySupabaseErrorMessage } from "./supabaseErrors";
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

  const { error } = await supabase.from("productivity_analytics").upsert(rows, {
    onConflict: "user_id,date,domain",
  });

  if (error) {
    console.warn(
      "[Arcalist] Productivity analytics sync skipped:",
      getFriendlySupabaseErrorMessage(
        error,
        "Productivity analytics sync is available with Arcalist Pro.",
      ),
    );
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
