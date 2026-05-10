import { create } from "zustand";
import { generateId } from "../lib/id";
import { saveState, loadState } from "../lib/storage";
import { defaultState } from "../data/default";
import type {
  ArcalistState,
  Page,
  Board,
  Bookmark,
  TrashedBookmark,
} from "../types";

// The full store type = state shape & all actions
type ArcalistStore = ArcalistState & {
  // Initialization
  initialize: () => Promise<void>;

  // ------ Page actions ------
  setActivePage: (pageId: string) => void;
  addPage: (title: string) => void;
  deletePage: (pageId: string) => void;
  renamePage: (pageId: string, title: string) => void;

  // ------ Board actions ------
  addBoard: (pageId: string, title: string) => void;
  deleteBoard: (pageId: string, boardId: string) => void;
  renameBoard: (pageId: string, boardId: string, title: string) => void;

  // ------ Bookmark actions ------
  addBookmark: (
    boardId: string,
    bookmark: Omit<Bookmark, "id" | "createdAt">,
  ) => void;
  deleteBookmark: (boardId: string, bookmarkId: string) => void;
  moveBookmark: (
    fromBoardId: string,
    toBoardId: string,
    bookmarkId: string,
  ) => void;

  // ------ Reorder actions (Drag and Drop) ------
  reorderBoards: (pageId: string, oldIndex: number, newIndex: number) => void;
  reorderBookmarks: (
    sourceBoardId: string,
    destinationBoardId: string,
    sourceIndex: number,
    destinationIndex: number,
  ) => void;

  // Add to ArcalistStore type
  privacyMode: boolean;
  togglePrivacyMode: () => void;

  trashBookmark: (boardId: string, bookmarkId: string) => void;
  restoreBookmark: (bookmarkId: string) => void;
  permanentlyDelete: (bookmarkId: string) => void;
  clearTrash: () => void;

  // Internal helper
  _persist: () => void;
};

export const useArcalistStore = create<ArcalistStore>((set, get) => ({
  // --------- Initial State ------------------
  pages: [],
  activePageId: "",
  trash: [],

  // --------- Initialization ---------------
  initialize: async () => {
    const saved = await loadState();
    if (saved) {
      set({
        ...saved,
        trash: saved.trash ?? [],
        privacyMode: false,
      });
    } else {
      set({ ...defaultState, trash: [] });
      saveState({ ...defaultState, trash: [] });
    }
  },

  // --------- Internal persist helper ----------
  _persist: () => {
    const { pages, activePageId, trash } = get();
    saveState({ pages, activePageId, trash });
  },

  // --------- Page Actions ------------
  setActivePage: (pageId) => {
    set({ activePageId: pageId });
    get()._persist();
  },

  addPage: (title) => {
    const newPage: Page = {
      id: generateId(),
      title,
      order: get().pages.length,
      boards: [],
    };
    set((state) => ({ pages: [...state.pages, newPage] }));
    get()._persist();
  },

  deletePage: (pageId) => {
    if (get().pages.length <= 1) return;

    set((state) => {
      const filtered = state.pages.filter((p) => p.id !== pageId);
      const newActiveId =
        state.activePageId === pageId ? filtered[0].id : state.activePageId;
      return { pages: filtered, activePageId: newActiveId };
    });
    get()._persist();
  },

  renamePage: (pageId, title) => {
    set((state) => ({
      pages: state.pages.map((p) => (p.id === pageId ? { ...p, title } : p)),
    }));
    get()._persist();
  },

  // --------- Board Actions ----------
  addBoard: (pageId, title) => {
    const page = get().pages.find((p) => p.id === pageId);
    const newBoard: Board = {
      id: generateId(),
      title,
      order: page ? page.boards.length : 0,
      bookmarks: [],
    };
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === pageId ? { ...p, boards: [...p.boards, newBoard] } : p,
      ),
    }));
    get()._persist();
  },

  deleteBoard: (pageId, boardId) => {
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === pageId
          ? { ...p, boards: p.boards.filter((b) => b.id !== boardId) }
          : p,
      ),
    }));
    get()._persist();
  },

  renameBoard: (pageId, boardId, title) => {
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === pageId
          ? {
              ...p,
              boards: p.boards.map((b) =>
                b.id === boardId ? { ...b, title } : b,
              ),
            }
          : p,
      ),
    }));
    get()._persist();
  },

  // --------- Bookmark Actions ----------
  addBookmark: (boardId, bookmark) => {
    const newBookmark: Bookmark = {
      id: generateId(),
      createdAt: Date.now(),
      ...bookmark,
    };
    set((state) => ({
      pages: state.pages.map((p) => ({
        ...p,
        boards: p.boards.map((b) =>
          b.id === boardId
            ? { ...b, bookmarks: [...b.bookmarks, newBookmark] }
            : b,
        ),
      })),
    }));
    get()._persist();
  },

  deleteBookmark: (boardId, bookmarkId) => {
    set((state) => ({
      pages: state.pages.map((p) => ({
        ...p,
        boards: p.boards.map((b) =>
          b.id === boardId
            ? {
                ...b,
                bookmarks: b.bookmarks.filter((bm) => bm.id !== bookmarkId),
              }
            : b,
        ),
      })),
    }));
    get()._persist();
  },

  moveBookmark: (fromBoardId, toBoardId, bookmarkId) => {
    let bookmark: Bookmark | undefined;

    const pagesWithRemoved = get().pages.map((p) => ({
      ...p,
      boards: p.boards.map((b) => {
        if (b.id === fromBoardId) {
          bookmark = b.bookmarks.find((bm) => bm.id === bookmarkId);
          return {
            ...b,
            bookmarks: b.bookmarks.filter((bm) => bm.id !== bookmarkId),
          };
        }
        return b;
      }),
    }));

    if (!bookmark) return;

    const finalBookmark = bookmark;
    const finalPages = pagesWithRemoved.map((p) => ({
      ...p,
      boards: p.boards.map((b) =>
        b.id === toBoardId
          ? { ...b, bookmarks: [...b.bookmarks, finalBookmark] }
          : b,
      ),
    }));

    set({ pages: finalPages });
    get()._persist();
  },

  // --------- Reorder Actions ----------
  reorderBoards: (pageId, oldIndex, newIndex) => {
    set((state) => ({
      pages: state.pages.map((p) => {
        if (p.id !== pageId) return p;

        const boards = [...p.boards];
        const [moved] = boards.splice(oldIndex, 1);
        boards.splice(newIndex, 0, moved);

        return { ...p, boards };
      }),
    }));
    get()._persist();
  },

  reorderBookmarks: (
    sourceBoardId,
    destinationBoardId,
    sourceIndex,
    destinationIndex,
  ) => {
    set((state) => {
      let bookmark: Bookmark | undefined;

      // Step 1: Remove from source board
      const afterRemove = state.pages.map((p) => ({
        ...p,
        boards: p.boards.map((b) => {
          if (b.id !== sourceBoardId) return b;
          const bookmarks = [...b.bookmarks];
          const [removed] = bookmarks.splice(sourceIndex, 1);
          bookmark = removed;
          return { ...b, bookmarks };
        }),
      }));

      if (!bookmark) return state;
      const finalBookmark = bookmark;

      // Step 2: Insert into destination board
      const afterInsert = afterRemove.map((p) => ({
        ...p,
        boards: p.boards.map((b) => {
          if (b.id !== destinationBoardId) return b;
          const bookmarks = [...b.bookmarks];
          bookmarks.splice(destinationIndex, 0, finalBookmark);
          return { ...b, bookmarks };
        }),
      }));

      return { pages: afterInsert };
    });
    get()._persist();
  },

  // ─── Privacy Mode ────────────────────────────────────────
  // Not persisted — resets every session on purpose
  privacyMode: false,

  togglePrivacyMode: () => {
    set((state) => ({ privacyMode: !state.privacyMode }));
    // No _persist call — intentionally session-only
  },

  // ─── Trash Actions ───────────────────────────────────────
  trashBookmark: (boardId, bookmarkId) => {
    // Find context (which page + board the bookmark lives in)
    let fromBoardTitle = "";
    let fromPageTitle = "";
    let bookmark: Bookmark | undefined;

    const pages = get().pages;
    for (const page of pages) {
      for (const board of page.boards) {
        if (board.id === boardId) {
          fromBoardTitle = board.title;
          fromPageTitle = page.title;
          bookmark = board.bookmarks.find((bm) => bm.id === bookmarkId);
        }
      }
    }

    if (!bookmark) return;

    const trashedItem: TrashedBookmark = {
      bookmark,
      deletedAt: Date.now(),
      fromBoardTitle,
      fromPageTitle,
      fromBoardId: boardId,
    };

    // Remove from board and add to trash
    set((state) => ({
      trash: [...state.trash, trashedItem],
      pages: state.pages.map((p) => ({
        ...p,
        boards: p.boards.map((b) =>
          b.id === boardId
            ? {
                ...b,
                bookmarks: b.bookmarks.filter((bm) => bm.id !== bookmarkId),
              }
            : b,
        ),
      })),
    }));
    get()._persist();
  },

  restoreBookmark: (bookmarkId) => {
    const trashItem = get().trash.find((t) => t.bookmark.id === bookmarkId);
    if (!trashItem) return;

    // Put it back in its original board if it still exists
    // Otherwise put it in the first available board
    const targetBoardId = get()
      .pages.flatMap((p) => p.boards)
      .find((b) => b.id === trashItem.fromBoardId)
      ? trashItem.fromBoardId
      : get().pages[0]?.boards[0]?.id;

    if (!targetBoardId) return;

    set((state) => ({
      trash: state.trash.filter((t) => t.bookmark.id !== bookmarkId),
      pages: state.pages.map((p) => ({
        ...p,
        boards: p.boards.map((b) =>
          b.id === targetBoardId
            ? { ...b, bookmarks: [...b.bookmarks, trashItem.bookmark] }
            : b,
        ),
      })),
    }));
    get()._persist();
  },

  permanentlyDelete: (bookmarkId) => {
    set((state) => ({
      trash: state.trash.filter((t) => t.bookmark.id !== bookmarkId),
    }));
    get()._persist();
  },

  clearTrash: () => {
    set({ trash: [] });
    get()._persist();
  },
}));
