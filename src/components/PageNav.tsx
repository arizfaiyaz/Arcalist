import { useState } from "react";
import { Plus, LogIn, Loader2, Trash2 } from "lucide-react";
import { cn } from "../lib/utils";
import { useArcalistStore } from "../store/useArcalistStore";
import type { Page } from "../types";

type Props = {
  pages: Page[];
  activePageId: string;
  onPageChange: (id: string) => void;
  onAddPage: (title: string) => void;
  onDeletePage: (id: string) => void;
};

export function PageNav({
  pages,
  activePageId,
  onPageChange,
  onAddPage,
  onDeletePage,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const user = useArcalistStore((state) => state.user);
  const signInWithGoogle = useArcalistStore((state) => state.signInWithGoogle);
  const signingIn = useArcalistStore((state) => state.signingIn);

  const handleAdd = () => {
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
        "flex items-center gap-1.5 px-4 py-3",
        "border-b border-white/5",
        "bg-surface/50 backdrop-blur-sm",
        // Stick to top
        "sticky top-0 z-10",
      )}
    >
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
                  ? "bg-accent text-background font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-surface-2",
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
                  "text-slate-500 hover:text-red-400",
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
            "bg-surface-2 text-white border border-accent/50",
            "outline-none w-28",
            "placeholder:text-slate-500",
          )}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center",
            "text-slate-500 hover:text-white",
            "hover:bg-surface-2 transition-all duration-150",
            "border border-white/10 hover:border-white/20",
            "ml-1",
          )}
          title="Add new page"
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
              "bg-accent/15 text-accent border border-accent/30",
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
    </nav>
  );
}
