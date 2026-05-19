import { useEffect, useState } from "react";
import { Check, ExternalLink, Lock, RefreshCw, X } from "lucide-react";
import { BILLING_PLANS } from "../config/billing";
import { createDodoCheckout, openCheckoutUrl } from "../lib/billing";
import { cn } from "../lib/utils";
import { useEntitlementContext } from "../hooks/useEntitlement";
import type { PlanCode } from "../types/billing";

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
  const { isPro, loading, refreshEntitlement } = useEntitlementContext();
  const [selectedPlanCode, setSelectedPlanCode] =
    useState<PlanCode>("pro_yearly");
  const [openingCheckout, setOpeningCheckout] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refreshEntitlement();
  }, [refreshEntitlement]);

  const handleUpgrade = async () => {
    setOpeningCheckout(true);
    setError(null);
    setMessage("Opening checkout...");
    try {
      const checkout = await createDodoCheckout(selectedPlanCode);
      await openCheckoutUrl(checkout.checkout_url);
      setMessage(
        "After payment, Arcalist Pro will activate automatically once payment is confirmed.",
      );
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Unable to open checkout. Please try again.",
      );
      setMessage(null);
    } finally {
      setOpeningCheckout(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    await refreshEntitlement();
    setRefreshing(false);
    setMessage(
      "Payment may still be processing. Please wait a few seconds and refresh.",
    );
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[var(--arc-overlay)] backdrop-blur-sm" />
      <div
        className={cn(
          "arc-glass-strong relative w-full max-w-md rounded-2xl p-5",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--arc-accent)]/30 bg-[var(--arc-button-active-bg)] text-[var(--arc-accent)]">
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
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[var(--arc-text-secondary)] hover:bg-[var(--arc-button-bg)] hover:text-[var(--arc-text-primary)]"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mt-4 text-sm leading-6 text-[var(--arc-text-secondary)]">
          {isPro ? "Arcalist Pro is active on this account." : description}
        </p>

        {!isPro && (
          <div className="mt-4 grid gap-2">
            {BILLING_PLANS.map((plan) => {
              const selected = selectedPlanCode === plan.plan_code;
              return (
                <button
                  key={plan.plan_code}
                  type="button"
                  onClick={() => setSelectedPlanCode(plan.plan_code)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border p-3 text-left",
                    selected
                      ? "border-[var(--arc-accent)] bg-[var(--arc-button-active-bg)]"
                      : "border-[var(--arc-glass-border)] bg-[var(--arc-button-bg)] hover:border-[var(--arc-accent)]/50",
                  )}
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-semibold text-[var(--arc-text-primary)]">
                      {plan.displayName}
                      {plan.badge && (
                        <span className="rounded-md border border-[var(--arc-accent)]/30 px-1.5 py-0.5 text-[10px] text-[var(--arc-accent)]">
                          {plan.badge}
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-xs text-[var(--arc-text-secondary)]">
                      {plan.displayPrice}
                    </span>
                    {plan.annualPriceUsd && (
                      <span className="mt-0.5 block text-[11px] text-[var(--arc-text-secondary)]">
                        ${plan.annualPriceUsd.toFixed(2)}/year
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                      selected
                        ? "border-[var(--arc-accent)] bg-[var(--arc-accent)] text-[var(--arc-accent-foreground)]"
                        : "border-[var(--arc-glass-border)]",
                    )}
                  >
                    {selected && <Check size={12} />}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {(message || error) && (
          <p
            className={cn(
              "mt-4 rounded-lg border px-3 py-2 text-xs leading-5",
              error
                ? "border-red-400/30 bg-red-500/10 text-red-100"
                : "border-[var(--arc-glass-border)] bg-[var(--arc-button-bg)] text-[var(--arc-text-secondary)]",
            )}
          >
            {error ?? message}
          </p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="arc-btn arc-btn-ghost"
          >
            Not now
          </button>
          {!isPro && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="arc-btn arc-btn-ghost"
            >
              <RefreshCw
                size={14}
                className={refreshing || loading ? "animate-spin" : ""}
              />
              Refresh Pro status
            </button>
          )}
          {!isPro && (
            <button
              type="button"
              onClick={handleUpgrade}
              disabled={openingCheckout}
              className="arc-btn arc-btn-primary"
            >
              <ExternalLink size={14} />
              {openingCheckout ? "Opening checkout..." : "Upgrade"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
