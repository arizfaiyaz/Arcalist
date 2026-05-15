import { useState } from "react";
import { Lock, Plus } from "lucide-react";
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
  lockedBoardCount?: number;
  onBoardLimitReached?: () => void;
  canAddBoardOverride?: boolean;
  getBoardPageId?: (board: Board) => string;
  disableBoardReorder?: boolean;
};

//-------------------------

export function BoardGrid({
  page,
  multiSelectMode = false,
  selectedBookmarks = [],
  onBookmarkSelect,
  lockedBoardCount = 0,
  onBoardLimitReached,
  canAddBoardOverride,
  getBoardPageId,
  disableBoardReorder = false,
}: Props) {
  const addBoard = useArcalistStore((state) => state.addBoard);
  const reorderBoards = useArcalistStore((state) => state.reorderBoards);
  const reorderBookmarks = useArcalistStore((state) => state.reorderBookmarks);
  const compactMode = useArcalistStore((state) => state.settings.compactMode);
  const storeCanAddBoard = useArcalistStore((state) =>
    state.canCreateBoard(page.id),
  );
  const canAddBoard = canAddBoardOverride ?? storeCanAddBoard;

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
      onBoardLimitReached?.();
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
      if (disableBoardReorder) return;
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
      <div className="arc-empty-state flex-1 py-24">
        <p className="text-sm font-semibold text-[var(--arc-text-primary)]">No boards yet</p>
        <p className="max-w-xs text-sm text-[var(--arc-text-secondary)]">
          Create a board to start grouping bookmarks on this page.
        </p>
        <button
          type="button"
          onClick={() => {
            if (!canAddBoard) {
              onBoardLimitReached?.();
              return;
            }
            setAdding(true);
          }}
          className={cn(
            "arc-btn",
            canAddBoard
              ? "arc-btn-secondary"
              : "arc-btn-locked",
          )}
          title={
            canAddBoard
              ? "Add your first board"
              : "Free plan supports up to 10 boards per page."
          }
        >
          <Plus size={14} /> Add your first board
        </button>
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
        <div className="w-full text-center">
          <div className="inline-block text-left align-top max-w-full">
            {/* SortableContext for board-level sorting */}
            <SortableContext items={boardIds} strategy={rectSortingStrategy}>
              <div
                style={{
                  columnCount: "auto",
                  columnWidth: compactMode
                    ? "200px"
                    : "clamp(220px, 18vw, 300px)",
                  columnGap: compactMode
                    ? "12px"
                    : "clamp(12px, 1.8vw, 22px)",
                }}
              >
                {page.boards.map((board) => (
                  <div key={board.id} className="break-inside-avoid mb-4">
                    <BoardCard
                      board={board}
                      pageId={getBoardPageId?.(board) ?? page.id}
                      multiSelectMode={multiSelectMode}
                      selectedBookmarks={selectedBookmarks}
                      onBookmarkSelect={onBookmarkSelect}
                    />
                  </div>
                ))}

                {lockedBoardCount > 0 && (
                  <div className="break-inside-avoid mb-4">
                    <LockedBoardCard
                      count={lockedBoardCount}
                      onUpgrade={onBoardLimitReached}
                    />
                  </div>
                )}

                {adding && (
                  <div className="break-inside-avoid mb-4">
                    <div className="arc-glass-soft rounded-xl border-[var(--arc-accent)] p-4">
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
                        aria-label="New board name"
                        className="w-full bg-transparent px-1 text-sm text-[var(--arc-text-primary)] outline-none placeholder:text-[var(--arc-text-secondary)]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </SortableContext>

            {!adding && (
              <button
                type="button"
                onClick={() => {
                  if (!canAddBoard) {
                    onBoardLimitReached?.();
                    return;
                  }
                  setAdding(true);
                }}
                className={cn(
                  "arc-btn mt-2 min-h-9 px-3",
                  canAddBoard
                    ? "arc-btn-ghost"
                    : "arc-btn-locked",
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
          </div>
        </div>
      </div>

      {/* The floating ghost element while dragging */}
      <ArcalistDragOverlay
        activeBookmark={activeBookmark}
        activeBoard={activeBoard}
      />
    </DndContext>
  );
}

function LockedBoardCard({
  count,
  onUpgrade,
}: {
  count: number;
  onUpgrade?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onUpgrade}
      className={cn(
        "arc-btn-locked w-full rounded-xl p-4 text-left shadow-lg shadow-black/10",
        "flex flex-col items-start",
      )}
    >
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full border border-amber-300/25 bg-amber-300/10">
        <Lock size={15} />
      </div>
      <p className="text-sm font-semibold text-amber-100">
        {count} extra {count === 1 ? "board is" : "boards are"} saved but
        hidden on the Free plan.
      </p>
      <p className="mt-1 text-xs leading-5 text-amber-100/75">
        Upgrade to Pro to unlock unlimited boards.
      </p>
    </button>
  );
}
