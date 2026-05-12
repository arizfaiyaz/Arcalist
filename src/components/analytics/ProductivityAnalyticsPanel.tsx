import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Download,
  Pause,
  Play,
  RefreshCw,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useProductivityAnalytics } from "../../hooks/useProductivityAnalytics";
import {
  formatDuration,
  type DomainTimeStat,
} from "../../lib/productivityAnalytics";
import { AnalyticsBarChart } from "./AnalyticsBarChart";
import { AnalyticsDomainTable } from "./AnalyticsDomainTable";

type AnalyticsRange = "today" | "7d" | "30d";

type Props = {
  open: boolean;
  onClose: () => void;
};

const RANGE_OPTIONS: { id: AnalyticsRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
];

export function ProductivityAnalyticsPanel({ open, onClose }: Props) {
  const [range, setRange] = useState<AnalyticsRange>("today");
  const {
    stats,
    rangeStats,
    topDomains,
    totalTrackedMs,
    trackingEnabled,
    loading,
    setTrackingEnabled,
    clearToday,
    clearAll,
    refreshStats,
  } = useProductivityAnalytics(range);

  useEffect(() => {
    if (!open) return;
    void refreshStats();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, refreshStats]);

  const topWebsite = rangeStats[0];
  const activeDomainCount = rangeStats.length;
  const topCategory = useMemo(() => getTopCategory(rangeStats), [rangeStats]);

  if (!open) return null;

  const handleClearToday = async () => {
    if (!window.confirm("Clear today's productivity analytics?")) return;
    await clearToday();
  };

  const handleClearAll = async () => {
    if (!window.confirm("Clear all productivity analytics data?")) return;
    await clearAll();
  };

  const exportJson = () => {
    downloadTextFile(
      `arcalist-productivity-analytics-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(stats, null, 2),
      "application/json",
    );
  };

  const exportCsv = () => {
    const rows = [
      "date,domain,category,total_ms,time",
      ...Object.entries(stats.domainStats).flatMap(([date, byDomain]) =>
        Object.values(byDomain).map(
          (stat) =>
            `${date},${stat.domain},${stat.category ?? "other"},${Math.round(stat.totalMs)},${formatDuration(stat.totalMs)}`,
        ),
      ),
    ];
    downloadTextFile(
      `arcalist-productivity-analytics-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.join("\n"),
      "text/csv",
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[var(--arc-overlay)] backdrop-blur-sm" />

      <div
        className={cn(
          "relative flex h-[min(820px,calc(100vh-4rem))] w-full max-w-6xl flex-col overflow-hidden rounded-2xl",
          "border border-[var(--arc-glass-border)] bg-[var(--arc-modal-bg)]",
          "shadow-2xl shadow-black/60",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--arc-glass-border)] px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--arc-glass-border)] bg-[var(--arc-button-bg)] text-[var(--arc-accent)]">
              <BarChart3 size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--arc-text-primary)]">
                Productivity Analytics
              </h2>
              <p className="mt-1 text-sm text-[var(--arc-text-secondary)]">
                See where your browser time goes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTrackingEnabled(!trackingEnabled)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                trackingEnabled
                  ? "border-[var(--arc-glass-border)] text-[var(--arc-text-secondary)] hover:text-[var(--arc-text-primary)]"
                  : "border-amber-300/30 bg-amber-500/10 text-amber-100",
              )}
            >
              {trackingEnabled ? <Pause size={14} /> : <Play size={14} />}
              {trackingEnabled ? "Pause" : "Resume"}
            </button>
            <button
              onClick={onClose}
              title="Close analytics"
              className="rounded-full p-1.5 text-[var(--arc-text-secondary)] hover:bg-[var(--arc-button-bg)] hover:text-[var(--arc-text-primary)]"
            >
              <X size={17} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-[var(--arc-glass-border)] bg-[var(--arc-button-bg)] p-1">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setRange(option.id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors",
                    range === option.id
                      ? "bg-[var(--arc-accent)] text-[var(--arc-accent-foreground)]"
                      : "text-[var(--arc-text-secondary)] hover:text-[var(--arc-text-primary)]",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => refreshStats()}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--arc-glass-border)] px-3 py-2 text-sm text-[var(--arc-text-secondary)] hover:bg-[var(--arc-button-bg)] hover:text-[var(--arc-text-primary)]"
              >
                <RefreshCw size={14} />
                {loading ? "Refreshing" : "Refresh"}
              </button>
              <button
                onClick={exportCsv}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--arc-glass-border)] px-3 py-2 text-sm text-[var(--arc-text-secondary)] hover:bg-[var(--arc-button-bg)] hover:text-[var(--arc-text-primary)]"
              >
                <Download size={14} />
                CSV
              </button>
              <button
                onClick={exportJson}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--arc-glass-border)] px-3 py-2 text-sm text-[var(--arc-text-secondary)] hover:bg-[var(--arc-button-bg)] hover:text-[var(--arc-text-primary)]"
              >
                <Download size={14} />
                JSON
              </button>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <MetricCard label="Total tracked" value={formatDuration(totalTrackedMs)} />
            <MetricCard label="Top website" value={topWebsite?.domain ?? "None"} />
            <MetricCard label="Active domains" value={String(activeDomainCount)} />
            <MetricCard label="Top category" value={topCategory} capitalize />
          </div>

          <div className="mb-4 rounded-lg border border-[var(--arc-glass-border)] bg-[var(--arc-button-bg)] px-3 py-2 text-sm text-[var(--arc-text-secondary)]">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-[var(--arc-accent)]" />
              <span>Arcalist tracks only domain-level time, not full URLs.</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--arc-text-primary)]">
                  Top domains
                </h3>
                <span className="text-xs text-[var(--arc-text-secondary)]">
                  Top 10
                </span>
              </div>
              <AnalyticsBarChart stats={topDomains} />
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--arc-text-primary)]">
                  Domain breakdown
                </h3>
              </div>
              <AnalyticsDomainTable stats={rangeStats} totalMs={totalTrackedMs} />
            </section>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--arc-glass-border)] pt-4">
            <button
              onClick={handleClearToday}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-300/25 px-3 py-2 text-sm text-amber-100/80 hover:bg-amber-500/10 hover:text-amber-100"
            >
              <Trash2 size={14} />
              Clear today
            </button>
            <button
              onClick={handleClearAll}
              className="inline-flex items-center gap-2 rounded-lg border border-red-400/25 px-3 py-2 text-sm text-red-300 hover:bg-red-400/10 hover:text-red-200"
            >
              <Trash2 size={14} />
              Clear all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[var(--arc-glass-border)] bg-[var(--arc-button-bg)] p-3">
      <p className="text-xs text-[var(--arc-text-secondary)]">{label}</p>
      <p
        className={cn(
          "mt-1 truncate text-lg font-semibold text-[var(--arc-text-primary)]",
          capitalize && "capitalize",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function getTopCategory(stats: DomainTimeStat[]) {
  const totals = new Map<string, number>();
  for (const stat of stats) {
    const category = stat.category ?? "other";
    totals.set(category, (totals.get(category) ?? 0) + stat.totalMs);
  }

  let winner = "other";
  let winnerMs = 0;
  for (const [category, totalMs] of totals) {
    if (totalMs > winnerMs) {
      winner = category;
      winnerMs = totalMs;
    }
  }

  return winner;
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
