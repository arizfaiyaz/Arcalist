import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Copy,
  ExternalLink,
  Link,
  Loader2,
  RefreshCw,
  RotateCw,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";
import {
  buildSharedPageSnapshot,
  buildShareUrl,
  createPageShare,
  getShareForPage,
  regeneratePageShare,
  revokePageShare,
  updatePageShareSnapshot,
} from "../../lib/sharing";
import type { Page } from "../../types";
import type { SharedPageRecord } from "../../types/sharing";

type Props = {
  open: boolean;
  page: Page | null;
  userId: string | null;
  isProUser: boolean;
  onClose: () => void;
};

type BusyState = "loading" | "creating" | "copying" | "updating" | "revoking" | "regenerating" | null;

export function SharePageModal({
  open,
  page,
  userId,
  isProUser,
  onClose,
}: Props) {
  const [share, setShare] = useState<SharedPageRecord | null>(null);
  const [busy, setBusy] = useState<BusyState>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const shareUrl = useMemo(
    () => (share ? buildShareUrl(share.share_token) : ""),
    [share],
  );

  useEffect(() => {
    if (!open || !page || !userId) return;

    const loadShare = async () => {
      setBusy("loading");
      setError("");
      setSuccess("");
      try {
        setShare(await getShareForPage({ userId, pageId: page.id }));
      } catch (err) {
        console.warn("[Arcalist] Failed to load share status:", err);
        setError(getErrorMessage(err));
      } finally {
        setBusy(null);
      }
    };

    void loadShare();
  }, [open, page, userId]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !page || !userId) return null;

  const run = async (nextBusy: BusyState, action: () => Promise<void>) => {
    setBusy(nextBusy);
    setError("");
    setSuccess("");
    try {
      await action();
    } catch (err) {
      console.warn("[Arcalist] Share page action failed:", err);
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const handleCreate = () =>
    run("creating", async () => {
      const created = await createPageShare({ userId, page, isProUser });
      setShare(created.share);
      setSuccess("Share link created.");
      await copyText(created.shareUrl);
      setSuccess("Share link created and copied.");
    });

  const handleCopy = () =>
    run("copying", async () => {
      await copyText(shareUrl);
      setSuccess("Share link copied.");
    });

  const handleUpdate = () =>
    run("updating", async () => {
      if (!share) return;
      const snapshot = buildSharedPageSnapshot(page);
      setShare(
        await updatePageShareSnapshot({
          userId,
          pageId: page.id,
          shareId: share.id,
          snapshot,
          isProUser,
        }),
      );
      setSuccess("Shared page snapshot updated.");
    });

  const handleRevoke = () => {
    if (!share) return;
    const confirmed = window.confirm(
      "Anyone with this link will lose access. Revoke share link?",
    );
    if (!confirmed) return;
    void run("revoking", async () => {
      await revokePageShare({ userId, shareId: share.id });
      setShare(null);
      setSuccess("Share link revoked.");
    });
  };

  const handleRegenerate = () => {
    if (!share) return;
    const confirmed = window.confirm(
      "The old link will stop working. Generate a new link?",
    );
    if (!confirmed) return;
    void run("regenerating", async () => {
      const regenerated = await regeneratePageShare({
        userId,
        page,
        isProUser,
        oldShareId: share.id,
      });
      setShare(regenerated.share);
      await copyText(regenerated.shareUrl);
      setSuccess("New share link generated and copied.");
    });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[var(--arc-overlay)] backdrop-blur-sm" />
      <div
        className={cn(
          "relative w-full max-w-lg overflow-hidden rounded-2xl",
          "arc-glass-strong",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--arc-glass-border)] px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--arc-glass-border)] bg-[var(--arc-button-bg)] text-[var(--arc-accent)]">
              <Link size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--arc-text-primary)]">
                Share Page
              </h2>
              <p className="mt-1 text-sm text-[var(--arc-text-secondary)]">
                Create a read-only snapshot of "{page.title}".
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="rounded-full p-1.5 text-[var(--arc-text-secondary)] hover:bg-[var(--arc-button-bg)] hover:text-[var(--arc-text-primary)]"
          >
            <X size={17} />
          </button>
        </header>

        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-[var(--arc-text-primary)]">
            <div className="flex gap-2">
              <AlertTriangle
                size={15}
                className="mt-0.5 shrink-0 text-amber-500"
              />
              <p>
                Anyone with this link can view this page. Only this page is
                shared; other pages, settings, analytics, and account details stay
                private.
              </p>
            </div>
          </div>

          {busy === "loading" ? (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-[var(--arc-glass-border)] py-8 text-sm text-[var(--arc-text-secondary)]">
              <Loader2 size={15} className="animate-spin" />
              Loading share status...
            </div>
          ) : share ? (
            <div className="space-y-3">
              <label className="block text-xs text-[var(--arc-text-secondary)]">
                Public share link
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="min-w-0 flex-1 rounded-lg border border-[var(--arc-glass-border)] bg-[var(--arc-button-bg)] px-3 py-2 text-sm text-[var(--arc-text-primary)] outline-none"
                />
                <IconButton
                  icon={Copy}
                  label="Copy link"
                  onClick={handleCopy}
                  busy={busy === "copying"}
                />
                <IconButton
                  icon={ExternalLink}
                  label="Open link"
                  onClick={() =>
                    window.open(shareUrl, "_blank", "noopener,noreferrer")
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-[var(--arc-text-secondary)]">
                <InfoPill label="Views" value={String(share.view_count ?? 0)} />
                <InfoPill
                  label="Updated"
                  value={new Date(share.updated_at).toLocaleString()}
                />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <ActionButton
                  icon={RefreshCw}
                  label="Update snapshot"
                  onClick={handleUpdate}
                  busy={busy === "updating"}
                />
                <ActionButton
                  icon={RotateCw}
                  label="Regenerate"
                  onClick={handleRegenerate}
                  busy={busy === "regenerating"}
                />
                <ActionButton
                  icon={Trash2}
                  label="Revoke"
                  onClick={handleRevoke}
                  busy={busy === "revoking"}
                  danger
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={busy === "creating"}
              className="arc-btn arc-btn-primary w-full disabled:opacity-60"
            >
              {busy === "creating" && <Loader2 size={15} className="animate-spin" />}
              Create share link
            </button>
          )}

          {(error || success) && (
            <p
              className={cn(
                "text-sm",
                error ? "text-red-300" : "text-[var(--arc-accent)]",
              )}
            >
              {error || success}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  busy = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      disabled={busy}
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--arc-glass-border)] text-[var(--arc-text-secondary)] hover:bg-[var(--arc-button-bg)] hover:text-[var(--arc-text-primary)] disabled:opacity-60"
    >
      {busy ? <Loader2 size={15} className="animate-spin" /> : <Icon size={15} />}
    </button>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  busy = false,
  danger = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-60",
        danger
          ? "border-red-400/25 text-red-300 hover:bg-red-400/10"
          : "border-[var(--arc-glass-border)] text-[var(--arc-text-secondary)] hover:bg-[var(--arc-button-bg)] hover:text-[var(--arc-text-primary)]",
      )}
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
      {label}
    </button>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--arc-glass-border)] bg-[var(--arc-button-bg)] px-3 py-2">
      <p>{label}</p>
      <p className="mt-1 truncate text-[var(--arc-text-primary)]">{value}</p>
    </div>
  );
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const input = document.createElement("textarea");
  input.value = text;
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

function getErrorMessage(error: unknown) {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  return "Something went wrong. Please try again.";
}
