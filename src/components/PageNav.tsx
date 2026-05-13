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
        "arc-glass-strong rounded-2xl",
        // Stick to top
        "sticky top-0 z-10",
      )}
    >
      <div className="w-full flex items-center gap-2 overflow-x-auto">
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
                  type="button"
                  onClick={() => onPageChange(page.id)}
                  className="min-w-0 max-w-44 truncate py-1.5 pl-4 pr-1 text-left"
                  title={page.title}
                >
                  {page.title}
                </button>
                <button
                  type="button"
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
                  aria-label={`${page.title} actions`}
                >
                  <ChevronDown size={13} />
                </button>
              </div>

              {menuOpen && (
                <div
                  ref={menuRef}
                  className={cn(
                    "absolute left-0 top-9 z-30 w-44 overflow-hidden rounded-xl",
                    "arc-menu p-1.5",
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
            type="button"
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
            aria-label="New page name"
            className={cn(
              "arc-input w-32 rounded-full px-3 py-1.5 text-sm",
              "border-[var(--arc-accent)]",
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
              "arc-icon-btn arc-icon-btn-sm",
              "ml-1",
              !canAddPage && "text-amber-100/70 hover:text-amber-100 hover:border-amber-300/30",
            )}
            title={
              canAddPage
                ? "Add new page"
                : "Free plan supports up to 3 pages."
            }
            aria-label={
              canAddPage ? "Add new page" : "Free plan supports up to 3 pages."
            }
          >
            <Plus size={14} />
          </button>
        )}

        {/* Sign-in button — only visible when logged out */}
        <div className="ml-auto">
          {!user && (
            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={signingIn}
              className={cn(
                "arc-btn arc-btn-primary min-h-8 rounded-full px-3 text-xs",
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
      type="button"
      onClick={onClick}
      className={cn(
        "arc-menu-item",
        danger
          ? "hover:bg-red-400/10 hover:text-red-400"
          : "",
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
