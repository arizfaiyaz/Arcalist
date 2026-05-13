import { useState } from "react";
import {
  CheckCircle2,
  Cloud,
  CloudOff,
  Lock,
  RefreshCw,
  RotateCw,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useCrossBrowserSync } from "../../hooks/useCrossBrowserSync";
import { UpgradePromptModal } from "../UpgradePromptModal";
import type { SyncStatus } from "../../types/sync";

function statusLabel(status: SyncStatus | undefined) {
  if (status === "syncing") return "Syncing";
  if (status === "synced") return "Synced";
  if (status === "offline") return "Offline";
  if (status === "conflict") return "Conflict resolved";
  if (status === "error") return "Error";
  return "Idle";
}

function formatTime(value?: string) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function StatusIcon({ status }: { status?: SyncStatus }) {
  if (status === "syncing") {
    return <RefreshCw size={14} className="animate-spin text-[var(--arc-accent)]" />;
  }
  if (status === "offline") return <CloudOff size={14} className="text-amber-300" />;
  if (status === "error") return <CloudOff size={14} className="text-red-400" />;
  if (status === "synced" || status === "conflict") {
    return <CheckCircle2 size={14} className="text-[var(--arc-accent)]" />;
  }
  return <Cloud size={14} className="text-[var(--arc-text-secondary)]" />;
}

export function SyncSettings() {
  const { device, isProUser, manualSync, meta, setEnabled } =
    useCrossBrowserSync();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleToggle = async () => {
    if (!isProUser) {
      setShowUpgrade(true);
      return;
    }
    setBusy(true);
    await setEnabled(!(meta?.enabled ?? false));
    setBusy(false);
  };

  const handleManualSync = async () => {
    if (!isProUser) {
      setShowUpgrade(true);
      return;
    }
    setBusy(true);
    await manualSync();
    setBusy(false);
  };

  return (
    <>
      <div className="rounded-xl border border-[var(--arc-glass-border)] bg-[var(--arc-glass-bg)] overflow-hidden">
        <button
          onClick={handleToggle}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[var(--arc-button-bg)]"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Cloud size={15} className="text-[var(--arc-accent)]" />
              <p className="text-sm font-medium text-[var(--arc-text-primary)]">
                Cross-browser Sync
              </p>
              {!isProUser && (
                <span className="rounded-md border border-[var(--arc-accent)]/30 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--arc-accent)]">
                  Pro
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-[var(--arc-text-secondary)]">
              Keep your workspace updated across Chrome, Edge, and Brave
            </p>
          </div>

          {isProUser ? (
            <div
              className={cn(
                "h-6 w-10 shrink-0 rounded-full p-1 transition-colors",
                meta?.enabled ? "bg-[var(--arc-accent)]" : "bg-surface",
              )}
            >
              <div
                className={cn(
                  "h-4 w-4 rounded-full bg-white transition-transform",
                  meta?.enabled && "translate-x-4",
                )}
              />
            </div>
          ) : (
            <Lock size={15} className="text-[var(--arc-text-secondary)]" />
          )}
        </button>

        <div className="grid gap-3 border-t border-[var(--arc-glass-border)] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <StatusIcon status={meta?.status} />
              <span className="text-xs text-[var(--arc-text-primary)]">
                {statusLabel(meta?.status)}
              </span>
            </div>
            <button
              onClick={handleManualSync}
              disabled={busy || !meta?.enabled}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs",
                "border-[var(--arc-glass-border)] text-[var(--arc-text-secondary)]",
                "hover:border-[var(--arc-accent)]/40 hover:text-[var(--arc-text-primary)]",
                (busy || !meta?.enabled) && "cursor-not-allowed opacity-50",
              )}
            >
              <RotateCw size={12} className={busy ? "animate-spin" : ""} />
              Sync now
            </button>
          </div>

          <div className="grid gap-1 text-xs text-[var(--arc-text-secondary)]">
            <div className="flex justify-between gap-3">
              <span>Last synced</span>
              <span className="text-[var(--arc-text-primary)]">
                {formatTime(meta?.lastSyncedAt)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Current device</span>
              <span className="truncate text-[var(--arc-text-primary)]">
                {device?.name ?? "This browser"}
              </span>
            </div>
          </div>

          {meta?.error && (
            <p className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {meta.error}
            </p>
          )}
        </div>
      </div>

      {showUpgrade && (
        <UpgradePromptModal
          featureName="Arcalist Pro"
          title="Cross-browser sync"
          description="Cross-browser sync is available with Arcalist Pro."
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </>
  );
}
