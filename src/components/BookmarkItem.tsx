import { useState, useRef, useEffect } from "react";
import { GripVertical, Trash2, ExternalLink } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "../lib/utils";
import { useArcalistStore } from "../store/useArcalistStore";
import type { Bookmark } from "../types";

type Props = {
  bookmark: Bookmark;
  boardId: string;
};

export function BookmarkItem({ bookmark, boardId }: Props) {
  const trashBookmark = useArcalistStore((state) => state.trashBookmark);
  const privacyMode = useArcalistStore((state) => state.privacyMode);
  const [imgError, setImgError] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false)
  
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
        className="group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-surface-2 transition-colors duration-150"
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className={cn(
            "opacity-0 group-hover:opacity-100 transition-opacity shrink-0",
            "text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing touch-none",
          )}
        >
          <GripVertical size={12} />
        </button>

        {/* Clickable link */}
        <button
          onClick={() => window.open(bookmark.url, "_self")}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
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
                <span className="text-[8px] text-slate-400 font-bold uppercase">
                  {bookmark.title.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Title — blurred in privacy mode */}
          <span
            className={cn(
              "truncate text-sm text-slate-300 group-hover:text-white leading-none",
              "transition-all duration-200 select-none",
              privacyMode && !isHovered && "blur-sm",
            )}
          >
            {bookmark.title}
          </span>
        </button>

        {/* Trash button */}
        <button
          onClick={handleTrash}
          className={cn(
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "w-4 h-4 flex items-center justify-center shrink-0",
            "text-slate-600 hover:text-red-400",
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
            "bg-surface border border-white/10 rounded-xl",
            "shadow-xl shadow-black/40 py-1",
            "overflow-hidden",
          )}
        >
          <ContextMenuItem
            icon={ExternalLink}
            label="Open in new tab"
            onClick={() => {
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
          <div className="h-px bg-white/5 my-1" />
          <ContextMenuItem
            icon={Trash2}
            label="Move to trash"
            onClick={handleTrash}
            danger
          />
        </div>
      )}
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
        danger && "text-slate-400 hover:text-red-400 hover:bg-red-400/5",
        accent && "text-slate-400 hover:text-accent hover:bg-accent/5",
        !danger &&
          !accent &&
          "text-slate-400 hover:text-white hover:bg-surface-2",
      )}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}
