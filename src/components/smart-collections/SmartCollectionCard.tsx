import {
  Archive,
  BookOpen,
  Clock,
  Code,
  Copy,
  Flame,
  Globe,
  Lock,
  Share2,
} from "lucide-react";
import { cn } from "../../lib/utils";
import type { SmartCollection } from "../../lib/smartCollections";

const ICONS = {
  Archive,
  BookOpen,
  Clock,
  Code,
  Copy,
  Flame,
  Globe,
  Share2,
};

type Props = {
  collection: SmartCollection;
  selected: boolean;
  locked?: boolean;
  onClick: () => void;
};

export function SmartCollectionCard({
  collection,
  selected,
  locked = false,
  onClick,
}: Props) {
  const Icon =
    ICONS[collection.icon as keyof typeof ICONS] ?? BookOpen;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border p-3 text-left transition-colors",
        "bg-[var(--arc-button-bg)]",
        selected
          ? "border-[var(--arc-accent)]"
          : "border-[var(--arc-glass-border)] hover:border-[var(--arc-accent)]",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            "border border-[var(--arc-glass-border)] bg-[var(--arc-glass-bg)]",
            selected
              ? "text-[var(--arc-accent)]"
              : "text-[var(--arc-text-secondary)]",
          )}
        >
          <Icon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-[var(--arc-text-primary)]">
              {collection.name}
            </p>
            {locked && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/25 px-1.5 py-0.5 text-[9px] font-semibold text-amber-100/80">
                <Lock size={9} />
                Pro
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--arc-text-secondary)]">
            {collection.description}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--arc-glass-bg)] px-2 py-0.5 text-xs text-[var(--arc-text-secondary)]">
          {collection.count}
        </span>
      </div>
    </button>
  );
}
