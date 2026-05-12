import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Lock,
  LogIn,
  Loader2,
  Pencil,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useArcalistStore } from "../store/useArcalistStore";
import type { Page } from "../types";

type Props = {
  pages: Page[];
  activePageId: string;
  onPageChange: (id: string) => void;
  onAddPage: (title: string) => boolean;
  onDeletePage: (id: string) => void;
  onRenamePage: (id: string, title: string) => void;
  onSharePage: (page: Page) => void;
  shareLocked?: boolean;
  lockedPageCount?: number;
  onPageLimitReached?: () => void;
};

export function PageNav({
  pages,
  activePageId,
  onPageChange,
  onAddPage,
  onDeletePage,
  onRenamePage,
  onSharePage,
  shareLocked = false,
  lockedPageCount = 0,
  onPageLimitReached,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [openMenuPageId, setOpenMenuPageId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!openMenuPageId) return;
    const handler = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setOpenMenuPageId(null);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [openMenuPageId]);

  const handleRename = (page: Page) => {
    const nextTitle = window.prompt("Rename page", page.title)?.trim();
    if (nextTitle && nextTitle !== page.title) {
      onRenamePage(page.id, nextTitle);
    }
    setOpenMenuPageId(null);
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
          const menuOpen = page.id === openMenuPageId;
          return (
            <div key={page.id} className="relative flex items-center group">
              <div
                className={cn(
                  "flex items-center rounded-full text-sm font-medium",
                  "transition-all duration-150",
                  isActive
                    ? "bg-[var(--arc-accent)] text-[var(--arc-accent-foreground)] font-semibold"
                    : "bg-[var(--arc-button-bg)] text-[var(--arc-text-secondary)] hover:text-[var(--arc-text-primary)]",
                )}
              >
                <button
                  onClick={() => onPageChange(page.id)}
                  className="min-w-0 max-w-44 truncate py-1.5 pl-4 pr-1 text-left"
                  title={page.title}
                >
                  {page.title}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuPageId((current) =>
                      current === page.id ? null : page.id,
                    );
                  }}
                  className={cn(
                    "mr-1 flex h-6 w-6 items-center justify-center rounded-full",
                    isActive
                      ? "hover:bg-black/10"
                      : "hover:bg-[var(--arc-glass-bg)]",
                  )}
                  title={`${page.title} actions`}
                >
                  <ChevronDown size={13} />
                </button>
              </div>

              {menuOpen && (
                <div
                  ref={menuRef}
                  className={cn(
                    "absolute left-0 top-9 z-30 w-44 overflow-hidden rounded-xl",
                    "border border-[var(--arc-glass-border)] bg-[var(--arc-modal-bg)]",
                    "p-1 shadow-xl shadow-black/40",
                  )}
                >
                  <PageMenuItem
                    icon={Pencil}
                    label="Rename page"
                    onClick={() => handleRename(page)}
                  />
                  <PageMenuItem
                    icon={Share2}
                    label="Share page"
                    badge={shareLocked ? "Pro" : undefined}
                    onClick={() => {
                      setOpenMenuPageId(null);
                      onSharePage(page);
                    }}
                  />
                  {pages.length > 1 && (
                    <PageMenuItem
                      icon={Trash2}
                      label="Delete page"
                      danger
                      onClick={() => {
                        setOpenMenuPageId(null);
                        onDeletePage(page.id);
                      }}
                    />
                  )}
                </div>
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

function PageMenuItem({
  icon: Icon,
  label,
  onClick,
  badge,
  danger = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  badge?: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm",
        danger
          ? "text-[var(--arc-text-secondary)] hover:bg-red-400/10 hover:text-red-400"
          : "text-[var(--arc-text-secondary)] hover:bg-[var(--arc-button-bg)] hover:text-[var(--arc-text-primary)]",
      )}
    >
      <Icon size={13} />
      <span className="min-w-0 flex-1 text-left">{label}</span>
      {badge && (
        <span className="rounded-full border border-amber-300/25 px-1.5 py-0.5 text-[9px] text-amber-100/80">
          {badge}
        </span>
      )}
    </button>
  );
}
