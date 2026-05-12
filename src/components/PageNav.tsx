import { useState } from "react";
import { Plus, LogIn, Loader2, Trash2, Lock } from "lucide-react";
import { cn } from "../lib/utils";
import { useArcalistStore } from "../store/useArcalistStore";
import type { Page } from "../types";

type Props = {
  pages: Page[];
  activePageId: string;
  onPageChange: (id: string) => void;
  onAddPage: (title: string) => boolean;
  onDeletePage: (id: string) => void;
  lockedPageCount?: number;
  onPageLimitReached?: () => void;
};

export function PageNav({
  pages,
  activePageId,
  onPageChange,
  onAddPage,
  onDeletePage,
  lockedPageCount = 0,
  onPageLimitReached,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const user = useArcalistStore((state) => state.user);
  const signInWithGoogle = useArcalistStore((state) => state.signInWithGoogle);
  const signingIn = useArcalistStore((state) => state.signingIn);
  const canAddPage = useArcalistStore((state) => state.canCreatePage());

  const handleAdd = () => {
    if (!canAddPage) {
      setNewTitle("");
      setAdding(false);
      onPageLimitReached?.();
      return;
    }
    const trimmed = newTitle.trim();
    if (trimmed) {
      onAddPage(trimmed);
    }
    setNewTitle("");
    setAdding(false);
  };

  return (
    <nav
      className={cn(
        "py-2.5 px-3",
        "bg-[var(--arc-nav-bg)] border border-[var(--arc-glass-border)]",
        "rounded-2xl shadow-lg shadow-black/20",
        "backdrop-blur-lg",
        // Stick to top
        "sticky top-0 z-10",
      )}
    >
      <div className="w-full flex items-center gap-1.5">
        {/* Page Tabs */}
        {pages.map((page) => {
          const isActive = page.id === activePageId;
          return (
            <div key={page.id} className="flex items-center group">
              <button
                onClick={() => onPageChange(page.id)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium",
                  "transition-all duration-150",
                  isActive
                    ? "bg-[var(--arc-accent)] text-[var(--arc-accent-foreground)] font-semibold"
                    : "bg-[var(--arc-button-bg)] text-[var(--arc-text-secondary)] hover:text-[var(--arc-text-primary)]",
                )}
              >
                {page.title}
              </button>
              {pages.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePage(page.id);
                  }}
                  className={cn(
                    "ml-1 w-5 h-5 rounded-md",
                    "flex items-center justify-center",
                    "text-[var(--arc-text-secondary)] hover:text-red-400",
                    "opacity-0 group-hover:opacity-100 transition-opacity",
                  )}
                  title="Delete page"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          );
        })}

        {lockedPageCount > 0 && (
          <button
            onClick={onPageLimitReached}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm",
              "border border-amber-300/25 bg-amber-500/10 text-amber-100/80",
              "hover:bg-amber-500/15 hover:text-amber-100",
            )}
            title={`${lockedPageCount} extra pages saved`}
          >
            <Lock size={12} />
            {lockedPageCount} locked
          </button>
        )}

        {/* Add New Page Button */}

        {adding ? (
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key == "Enter") handleAdd();
              if (e.key == "Escape") setAdding(false);
            }}
            onBlur={handleAdd}
            placeholder="Page name.."
            className={cn(
              "px-3 py-1 rounded-full text-sm",
              "bg-[var(--arc-button-bg)] text-[var(--arc-text-primary)] border border-[var(--arc-accent)]",
              "outline-none w-28",
              "placeholder:text-[var(--arc-text-secondary)]",
            )}
          />
        ) : (
          <button
            onClick={() => {
              if (!canAddPage) {
                onPageLimitReached?.();
                return;
              }
              setAdding(true);
            }}
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center",
              "text-[var(--arc-text-secondary)] hover:text-[var(--arc-text-primary)]",
              "hover:bg-[var(--arc-button-bg)] transition-all duration-150",
              "border border-[var(--arc-glass-border)] hover:border-[var(--arc-glass-border)]",
              "ml-1",
              !canAddPage && "text-amber-100/70 hover:text-amber-100 hover:border-amber-300/30",
            )}
            title={
              canAddPage
                ? "Add new page"
                : "Free plan supports up to 3 pages."
            }
          >
            <Plus size={14} />
          </button>
        )}

        {/* Sign-in button — only visible when logged out */}
        <div className="ml-auto">
          {!user && (
            <button
              onClick={signInWithGoogle}
              disabled={signingIn}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs",
                "bg-accent/15 text-[var(--arc-accent)] border border-[var(--arc-accent)]",
                "hover:bg-accent/25 transition-all duration-150",
                signingIn && "opacity-60 cursor-not-allowed",
              )}
            >
              {signingIn ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <LogIn size={11} />
              )}
              {signingIn ? "Signing in..." : "Sign in"}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
