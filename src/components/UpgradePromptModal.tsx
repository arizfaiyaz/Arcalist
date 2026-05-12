import { useState } from "react";
import { Lock, X } from "lucide-react";
import { cn } from "../lib/utils";

type Props = {
  title: string;
  description: string;
  featureName: string;
  onClose: () => void;
};

export function UpgradePromptModal({
  title,
  description,
  featureName,
  onClose,
}: Props) {
  const [checkoutComingSoon, setCheckoutComingSoon] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[var(--arc-overlay)] backdrop-blur-sm" />
      <div
        className={cn(
          "relative w-full max-w-sm rounded-2xl border border-white/10",
          "bg-[var(--arc-modal-bg)] p-5 shadow-2xl shadow-black/60",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent">
              <Lock size={16} />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--arc-accent)] opacity-80">
                {featureName}
              </p>
              <h2 className="text-base font-semibold text-[var(--arc-text-primary)]">{title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-[var(--arc-text-secondary)] hover:bg-[var(--arc-button-bg)] hover:text-[var(--arc-text-primary)]"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mt-4 text-sm leading-6 text-[var(--arc-text-secondary)]">
          {checkoutComingSoon ? "Pro checkout coming soon." : description}
        </p>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-[var(--arc-text-secondary)] hover:bg-[var(--arc-button-bg)] hover:text-[var(--arc-text-primary)]"
          >
            Not now
          </button>
          <button
            onClick={() => setCheckoutComingSoon(true)}
            className="rounded-lg bg-[var(--arc-accent)] px-3 py-2 text-sm font-semibold text-[var(--arc-accent-foreground)] hover:bg-accent-hover"
          >
            Upgrade to Pro
          </button>
        </div>
      </div>
    </div>
  );
}
