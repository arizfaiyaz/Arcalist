import type { DomainTimeStat } from "../../lib/productivityAnalytics";
import { formatDuration } from "../../lib/productivityAnalytics";

type Props = {
  stats: DomainTimeStat[];
  totalMs: number;
};

export function AnalyticsDomainTable({ stats, totalMs }: Props) {
  if (stats.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--arc-glass-border)] px-4 py-8 text-center text-sm text-[var(--arc-text-secondary)]">
        Visit trackable websites while tracking is enabled to fill this table.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--arc-glass-border)]">
      <div className="grid grid-cols-[minmax(0,1.5fr)_120px_100px_90px] gap-3 border-b border-[var(--arc-glass-border)] bg-[var(--arc-button-bg)] px-3 py-2 text-xs font-semibold text-[var(--arc-text-secondary)]">
        <span>Domain</span>
        <span>Category</span>
        <span>Time</span>
        <span>Share</span>
      </div>
      <div className="max-h-72 overflow-y-auto divide-y divide-[var(--arc-glass-border)]">
        {stats.map((stat) => {
          const percentage =
            totalMs > 0 ? Math.round((stat.totalMs / totalMs) * 100) : 0;
          return (
            <div
              key={stat.domain}
              className="grid grid-cols-[minmax(0,1.5fr)_120px_100px_90px] items-center gap-3 px-3 py-2.5 text-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                {stat.faviconUrl ? (
                  <img
                    src={stat.faviconUrl}
                    alt=""
                    className="h-4 w-4 shrink-0 rounded-sm"
                  />
                ) : (
                  <div className="h-4 w-4 shrink-0 rounded-sm bg-[var(--arc-button-bg)]" />
                )}
                <span className="truncate text-[var(--arc-text-primary)]">
                  {stat.domain}
                </span>
              </div>
              <span className="capitalize text-[var(--arc-text-secondary)]">
                {stat.category ?? "other"}
              </span>
              <span className="text-[var(--arc-text-primary)]">
                {formatDuration(stat.totalMs)}
              </span>
              <span className="text-[var(--arc-text-secondary)]">
                {percentage}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
