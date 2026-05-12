import { useState, useRef, useEffect } from "react";
import { GripVertical, Trash2, ExternalLink, Pencil } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "../lib/utils";
import { useArcalistStore } from "../store/useArcalistStore";
import { BookmarkEditModal } from "./BookmarkEditModal";
import type { Bookmark } from "../types";

type Props = {
  bookmark: Bookmark;
  boardId: string;
  multiSelectMode?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
};

export function BookmarkItem({
  bookmark,
  boardId,
  multiSelectMode = false,
  isSelected = false,
  onSelect,
}: Props) {
  const trashBookmark = useArcalistStore((state) => state.trashBookmark);
  const recordBookmarkVisit = useArcalistStore(
    (state) => state.recordBookmarkVisit,
  );
  const privacyMode = useArcalistStore((state) => state.privacyMode);
  const { openInNewTab, shortenTitles, showDescriptions } = useArcalistStore(
    (state) => state.settings,
  );
  const [imgError, setImgError] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: bookmark.id,
    data: { type: "bookmark", boardId, bookmark },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) {
      window.addEventListener("mousedown", handler);
    }
    return () => window.removeEventListener("mousedown", handler);
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const openIncognito = () => {
    recordBookmarkVisit(boardId, bookmark.id);
    // chrome.windows.create only works in extension context
    if (typeof chrome !== "undefined" && chrome.windows) {
      chrome.windows.create({ url: bookmark.url, incognito: true });
    } else {
      window.open(bookmark.url, "_blank");
    }
    setContextMenu(null);
  };

  const handleTrash = () => {
    trashBookmark(boardId, bookmark.id);
    setContextMenu(null);
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg",
          "hover:bg-[var(--arc-button-bg)] transition-colors duration-150",
          isSelected && "bg-accent/10 border border-accent/20",
        )}
      >
        {/* Checkbox in multi-select mode, grip handle otherwise */}
        {multiSelectMode ? (
          <button
            onClick={() => onSelect?.(bookmark.id)}
            className={cn(
              "w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-all",
              isSelected
                ? "bg-accent border-accent"
                : "border-[var(--arc-text-secondary)] hover:border-[var(--arc-accent)]",
            )}
          >
            {isSelected && (
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path
                  d="M1 4L3 6L7 2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="text-background"
                />
              </svg>
            )}
          </button>
        ) : (
          <button
            {...attributes}
            {...listeners}
            className={cn(
              "opacity-0 group-hover:opacity-100 transition-opacity shrink-0",
              "text-[var(--arc-text-secondary)] opacity-60 hover:opacity-100 cursor-grab active:cursor-grabbing touch-none",
            )}
          >
            <GripVertical size={12} />
          </button>
        )}

        {/* Clickable link */}
        <div className="flex-1 min-w-0">
          <button
            onClick={() => {
              recordBookmarkVisit(boardId, bookmark.id);
              window.open(bookmark.url, openInNewTab ? "_blank" : "_self");
            }}
            className="flex items-center gap-2 w-full text-left"
          >
            {/* Favicon — blurred in privacy mode */}
            <div
              className={cn(
                "shrink-0 transition-all duration-200",
                privacyMode && !isHovered && "blur-sm",
              )}
            >
              {!imgError ? (
                <img
                  src={bookmark.favicon}
                  alt=""
                  className="w-4 h-4 rounded-sm"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-4 h-4 rounded-sm bg-surface-2 flex items-center justify-center">
                  <span className="text-[8px] text-[var(--arc-text-secondary)] font-bold uppercase">
                    {bookmark.title.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Title — blurred in privacy mode */}
            <span
              className={cn(
                "text-sm leading-none",
                shortenTitles ? "truncate" : "whitespace-normal break-words",
                "transition-all duration-200 select-none",
                "text-[var(--arc-text-primary)] opacity-85 group-hover:opacity-100",
                privacyMode && !isHovered && "blur-sm",
              )}
            >
              {bookmark.title}
            </span>
          </button>

          {showDescriptions && bookmark.description && (
            <p className="text-[11px] text-[var(--arc-text-secondary)] pl-6 pr-2 mt-0.5">
              {bookmark.description}
            </p>
          )}
        </div>

        {/* Trash button */}
        <button
          onClick={() => setEditOpen(true)}
          className={cn(
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "w-4 h-4 flex items-center justify-center shrink-0",
            "text-[var(--arc-text-secondary)] opacity-60 hover:text-[var(--arc-accent)] hover:opacity-100",
          )}
          title="Edit bookmark"
        >
          <Pencil size={10} />
        </button>
        <button
          onClick={handleTrash}
          className={cn(
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "w-4 h-4 flex items-center justify-center shrink-0",
            "text-[var(--arc-text-secondary)] opacity-60 hover:text-red-400 hover:opacity-100",
          )}
        >
          <Trash2 size={10} />
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className={cn(
            "fixed z-50 min-w-44",
            "bg-[var(--arc-modal-bg)] border border-[var(--arc-glass-border)] rounded-xl",
            "shadow-xl shadow-black/40 py-1",
            "overflow-hidden",
          )}
        >
          <ContextMenuItem
            icon={ExternalLink}
            label="Open in new tab"
            onClick={() => {
              recordBookmarkVisit(boardId, bookmark.id);
              window.open(bookmark.url, "_blank");
              setContextMenu(null);
            }}
          />
          <ContextMenuItem
            icon={ExternalLink}
            label="Open in incognito"
            onClick={openIncognito}
            accent
          />
          <div className="h-px bg-[var(--arc-glass-border)] my-1" />
          <ContextMenuItem
            icon={Trash2}
            label="Move to trash"
            onClick={handleTrash}
            danger
          />
        </div>
      )}

      <BookmarkEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        bookmark={bookmark}
        boardId={boardId}
      />
    </>
  );
}

// Reusable context menu item
function ContextMenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 text-sm",
        "transition-colors duration-100",
        danger && "text-[var(--arc-text-secondary)] hover:text-red-400 hover:bg-red-400/5",
        accent && "text-[var(--arc-text-secondary)] hover:text-[var(--arc-accent)] hover:bg-accent/5",
        !danger &&
          !accent &&
          "text-[var(--arc-text-secondary)] hover:text-[var(--arc-text-primary)] hover:bg-[var(--arc-button-bg)]",
      )}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}
