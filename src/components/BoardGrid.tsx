import { useState } from "react";
import { Plus } from "lucide-react";
import {
  DndContext,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";

import { BoardCard } from "./BoardCard";
import { ArcalistDragOverlay } from "./dnd/DragOverlay";
import { useArcalistStore } from "../store/useArcalistStore";
import type { Page, Bookmark, Board } from "../types";
import { cn } from "../lib/utils";

//--------------------------

type Props = {
  page: Page;
  multiSelectMode?: boolean;
  selectedBookmarks?: string[];
  onBookmarkSelect?: (bookmarkId: string, boardId: string) => void;
};

//-------------------------

export function BoardGrid({
  page,
  multiSelectMode = false,
  selectedBookmarks = [],
  onBookmarkSelect,
}: Props) {
  const addBoard = useArcalistStore((state) => state.addBoard);
  const reorderBoards = useArcalistStore((state) => state.reorderBoards);
  const reorderBookmarks = useArcalistStore((state) => state.reorderBookmarks);
  const compactMode = useArcalistStore((state) => state.settings.compactMode);
  const canAddBoard = useArcalistStore((state) =>
    state.canCreateBoard(page.id),
  );

  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  // Track what's currently being dragged for the overlay
  const [activeBookmark, setActiveBookmark] = useState<Bookmark | null>(null);
  const [activeBoard, setActiveBoard] = useState<Board | null>(null);

  // Sensors define how drag is initiated
  // PointerSensor requires moving 8px before drag starts (prevents accidental drags)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleAdd = () => {
    if (!canAddBoard) {
      setNewTitle("");
      setAdding(false);
      return;
    }
    const trimmed = newTitle.trim();
    if (trimmed) addBoard(page.id, trimmed);
    setNewTitle("");
    setAdding(false);
  };

  // ─── Drag Handlers ───────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;

    if (data?.type === "bookmark") {
      setActiveBookmark(data.bookmark);
    } else if (data?.type === "board") {
      setActiveBoard(data.board);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Only handle bookmark-over-board cross-board moves here
    if (activeData?.type !== "bookmark") return;

    const sourceBoardId = activeData.boardId;
    const destinationBoardId =
      overData?.type === "board"
        ? overData.boardId // dropped on board header
        : overData?.type === "bookmark"
          ? overData.boardId // dropped on another bookmark
          : null;

    if (!destinationBoardId || sourceBoardId === destinationBoardId) return;

    // Find indices for the cross-board move
    const sourceBoard = page.boards.find((b) => b.id === sourceBoardId);
    const destBoard = page.boards.find((b) => b.id === destinationBoardId);
    if (!sourceBoard || !destBoard) return;

    const sourceIndex = sourceBoard.bookmarks.findIndex(
      (bm) => bm.id === active.id,
    );
    const destinationIndex = destBoard.bookmarks.length; // append to end

    if (sourceIndex === -1) return;

    reorderBookmarks(
      sourceBoardId,
      destinationBoardId,
      sourceIndex,
      destinationIndex,
    );

    // Update the active item's boardId data so subsequent dragOver events work correctly
    active.data.current = {
      ...activeData,
      boardId: destinationBoardId,
    };
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveBookmark(null);
    setActiveBoard(null);

    if (!over || active.id === over.id) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // ── Board reorder ──
    if (activeData?.type === "board" && overData?.type === "board") {
      const oldIndex = page.boards.findIndex((b) => b.id === active.id);
      const newIndex = page.boards.findIndex((b) => b.id === over.id);
      if (oldIndex !== newIndex) {
        reorderBoards(page.id, oldIndex, newIndex);
      }
      return;
    }

    // ── Bookmark reorder within same board ──
    if (activeData?.type === "bookmark" && overData?.type === "bookmark") {
      const boardId = activeData.boardId;
      if (boardId !== overData.boardId) return; // cross-board already handled in dragOver

      const board = page.boards.find((b) => b.id === boardId);
      if (!board) return;

      const oldIndex = board.bookmarks.findIndex((bm) => bm.id === active.id);
      const newIndex = board.bookmarks.findIndex((bm) => bm.id === over.id);

      if (oldIndex !== newIndex) {
        reorderBookmarks(boardId, boardId, oldIndex, newIndex);
      }
    }
  };

  const boardIds = page.boards.map((b) => b.id);

  if (page.boards.length === 0 && !adding) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-slate-500 text-sm">No boards yet</p>
        <button
          onClick={() => {
            if (!canAddBoard) return;
            setAdding(true);
          }}
          disabled={!canAddBoard}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg",
            "bg-surface-2 text-slate-400 border border-white/10",
            "transition-all duration-150 text-sm",
            canAddBoard
              ? "hover:text-white hover:border-accent/30"
              : "opacity-50 cursor-not-allowed",
          )}
          title={
            canAddBoard
              ? "Add your first board"
              : "Free plan supports up to 10 boards per page."
          }
        >
          <Plus size={14} /> Add your first board
        </button>
        {!canAddBoard && (
          <p className="text-xs text-amber-200/80">
            Free plan supports up to 10 boards per page.
          </p>
        )}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        className={cn(
          "flex-1 w-full",
          compactMode ? "py-3" : "py-6",
          "pb-24",
        )}
      >
        {/* SortableContext for board-level sorting */}
        <SortableContext items={boardIds} strategy={rectSortingStrategy}>
          <div
            style={{
              columnCount: "auto",
              columnWidth: compactMode
                ? "200px"
                : "clamp(220px, 18vw, 300px)",
              columnGap: compactMode ? "12px" : "clamp(12px, 1.8vw, 22px)",
            }}
          >
            {page.boards.map((board) => (
              <div key={board.id} className="break-inside-avoid mb-4">
                <BoardCard
                  board={board}
                  pageId={page.id}
                  multiSelectMode={multiSelectMode}
                  selectedBookmarks={selectedBookmarks}
                  onBookmarkSelect={onBookmarkSelect}
                />
              </div>
            ))}

            {adding && (
              <div className="break-inside-avoid mb-4">
                <div className="bg-surface rounded-xl p-3 border border-accent/30">
                  <input
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAdd();
                      if (e.key === "Escape") setAdding(false);
                    }}
                    onBlur={handleAdd}
                    placeholder="Board name..."
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500 px-1"
                  />
                </div>
              </div>
            )}
          </div>
        </SortableContext>

        {!adding && (
          <button
            onClick={() => {
              if (!canAddBoard) return;
              setAdding(true);
            }}
            disabled={!canAddBoard}
            className={cn(
              "flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg text-sm",
              canAddBoard
                ? "text-slate-500 hover:text-white hover:bg-surface-2 transition-all duration-150"
                : "text-slate-500 opacity-50 cursor-not-allowed",
            )}
            title={
              canAddBoard
                ? "Add board"
                : "Free plan supports up to 10 boards per page."
            }
          >
            <Plus size={14} /> Add board
          </button>
        )}
        {!canAddBoard && (
          <p className="mt-2 text-xs text-amber-200/80">
            Free plan supports up to 10 boards per page.
          </p>
        )}
      </div>

      {/* The floating ghost element while dragging */}
      <ArcalistDragOverlay
        activeBookmark={activeBookmark}
        activeBoard={activeBoard}
      />
    </DndContext>
  );
}
