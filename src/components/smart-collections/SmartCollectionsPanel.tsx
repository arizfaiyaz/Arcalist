import { useEffect, useMemo, useState } from "react";
import { Lock, Sparkles, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { buildSmartCollections } from "../../lib/smartCollections";
import type { SmartCollectionId } from "../../config/smartCollections";
import { useArcalistStore } from "../../store/useArcalistStore";
import { usePlanLimits } from "../../hooks/usePlanLimits";
import { getVisiblePagesForPlan } from "../../lib/planLimits";
import { SmartCollectionCard } from "./SmartCollectionCard";
import { SmartCollectionResults } from "./SmartCollectionResults";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SmartCollectionsPanel({ open, onClose }: Props) {
  const allPages = useArcalistStore((state) => state.pages);
  const planLimits = usePlanLimits();
  const pages = useMemo(
    () =>
      planLimits.isProUser
        ? allPages
        : getVisiblePagesForPlan(allPages, planLimits),
    [allPages, planLimits],
  );
  const collections = useMemo(() => buildSmartCollections(pages), [pages]);
  const [selectedId, setSelectedId] =
    useState<SmartCollectionId>("recently-added");

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const selectedCollection =
    collections.find((collection) => collection.id === selectedId) ??
    collections[0];

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[var(--arc-overlay)] backdrop-blur-sm" />

      <div
        className={cn(
          "relative flex h-[min(760px,calc(100vh-4rem))] w-full max-w-6xl flex-col overflow-hidden rounded-2xl",
          "arc-glass-strong",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--arc-glass-border)] px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--arc-glass-border)] bg-[var(--arc-button-bg)] text-[var(--arc-accent)]">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-[var(--arc-text-primary)]">
                  Smart Collections
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--arc-accent)]/30 px-2 py-0.5 text-[10px] font-semibold text-[var(--arc-accent)]">
                  <Lock size={10} />
                  Pro
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--arc-text-secondary)]">
                Automatically organized views of your bookmarks.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close Smart Collections"
            className="rounded-full p-1.5 text-[var(--arc-text-secondary)] hover:bg-[var(--arc-button-bg)] hover:text-[var(--arc-text-primary)]"
          >
            <X size={17} />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-y-auto border-b border-[var(--arc-glass-border)] p-3 md:border-b-0 md:border-r">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-1">
              {collections.map((collection) => (
                <SmartCollectionCard
                  key={collection.id}
                  collection={collection}
                  selected={collection.id === selectedCollection.id}
                  onClick={() => setSelectedId(collection.id)}
                />
              ))}
            </div>
          </aside>

          <section className="min-h-0 p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-[var(--arc-text-primary)]">
                  {selectedCollection.name}
                </h3>
                <p className="mt-1 text-sm text-[var(--arc-text-secondary)]">
                  {selectedCollection.description}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[var(--arc-button-bg)] px-2.5 py-1 text-xs text-[var(--arc-text-secondary)]">
                {selectedCollection.count}{" "}
                {selectedCollection.id === "by-domain" ? "groups" : "bookmarks"}
              </span>
            </div>
            <SmartCollectionResults collection={selectedCollection} />
          </section>
        </div>
      </div>
    </div>
  );
}
