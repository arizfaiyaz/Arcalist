import type { DomainTimeStat } from "../../lib/productivityAnalytics";
import { formatDuration } from "../../lib/productivityAnalytics";

type Props = {
  stats: DomainTimeStat[];
};

export function AnalyticsBarChart({ stats }: Props) {
  const maxMs = Math.max(...stats.map((stat) => stat.totalMs), 1);

  if (stats.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-[var(--arc-glass-border)] text-sm text-[var(--arc-text-secondary)]">
        No tracked website time for this range yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--arc-glass-border)] bg-[var(--arc-button-bg)] p-4">
      <div className="flex h-64 items-end gap-3 overflow-x-auto pb-2">
        {stats.map((stat) => {
          const height = Math.max(8, Math.round((stat.totalMs / maxMs) * 210));
          return (
            <div
              key={stat.domain}
              className="flex h-full min-w-16 flex-1 flex-col items-center justify-end gap-2"
            >
              <span className="text-[10px] text-[var(--arc-text-secondary)]">
                {formatDuration(stat.totalMs)}
              </span>
              <div
                className="w-full max-w-16 rounded-t-md bg-[var(--arc-accent)]/80 transition-all"
                style={{ height }}
                title={`${stat.domain}: ${formatDuration(stat.totalMs)}`}
              />
              <span className="max-w-20 truncate text-[10px] text-[var(--arc-text-secondary)]">
                {stat.domain}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
