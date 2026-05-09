import { create } from 'zustand'
import { generateId } from '../lib/id'
import { saveState, loadState } from '../lib/storage'
import { defaultState } from '../data/default'
import type { ArcalistState, Page, Board, Bookmark } from '../types'

// The full store type = state shape & all actions
type ArcalistStore = ArcalistState & {
  // Initialization
  initialize: () => Promise<void>

  // ------ Page actions ------
  setActivePage: (pageId: string) => void
  addPage: (title: string) => void
  deletePage: (pageId: string) => void
  renamePage: (pageId: string, title: string) => void

  // ------ Board actions ------
  addBoard: (pageId: string, title: string) => void
  deleteBoard: (pageId: string, boardId: string) => void
  renameBoard: (pageId: string, boardId: string, title: string) => void

  // ------ Bookmark actions ------
  addBookmark: (boardId: string, bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void
  deleteBookmark: (boardId: string, bookmarkId: string) => void
  moveBookmark: (fromBoardId: string, toBoardId: string, bookmarkId: string) => void

  // ------ Reorder actions (Drag and Drop) ------
  reorderBoards: (pageId: string, oldIndex: number, newIndex: number) => void
  reorderBookmarks: (
    sourceBoardId: string,
    destinationBoardId: string,
    sourceIndex: number,
    destinationIndex: number
  ) => void

  // Internal helper
  _persist: () => void
}

export const useArcalistStore = create<ArcalistStore>((set, get) => ({
  // --------- Initial State ------------------
  pages: [],
  activePageId: '',

  // --------- Initialization ---------------
  initialize: async () => {
    const saved = await loadState()
    if (saved) {
      set(saved)
    } else {
      set(defaultState)
      saveState(defaultState)
    }
  },

  // --------- Internal persist helper ----------
  _persist: () => {
    const { pages, activePageId } = get()
    saveState({ pages, activePageId })
  },

  // --------- Page Actions ------------
  setActivePage: (pageId) => {
    set({ activePageId: pageId })
    get()._persist()
  },

  addPage: (title) => {
    const newPage: Page = {
      id: generateId(),
      title,
      order: get().pages.length,
      boards: [],
    }
    set((state) => ({ pages: [...state.pages, newPage] }))
    get()._persist()
  },

  deletePage: (pageId) => {
    if (get().pages.length <= 1) return

    set((state) => {
      const filtered = state.pages.filter((p) => p.id !== pageId)
      const newActiveId =
        state.activePageId === pageId ? filtered[0].id : state.activePageId
      return { pages: filtered, activePageId: newActiveId }
    })
    get()._persist()
  },

  renamePage: (pageId, title) => {
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === pageId ? { ...p, title } : p
      ),
    }))
    get()._persist()
  },

  // --------- Board Actions ----------
  addBoard: (pageId, title) => {
    const page = get().pages.find((p) => p.id === pageId)
    const newBoard: Board = {
      id: generateId(),
      title,
      order: page ? page.boards.length : 0,
      bookmarks: [],
    }
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === pageId
          ? { ...p, boards: [...p.boards, newBoard] }
          : p
      ),
    }))
    get()._persist()
  },

  deleteBoard: (pageId, boardId) => {
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === pageId
          ? { ...p, boards: p.boards.filter((b) => b.id !== boardId) }
          : p
      ),
    }))
    get()._persist()
  },

  renameBoard: (pageId, boardId, title) => {
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === pageId
          ? {
              ...p,
              boards: p.boards.map((b) =>
                b.id === boardId ? { ...b, title } : b
              ),
            }
          : p
      ),
    }))
    get()._persist()
  },

  // --------- Bookmark Actions ----------
  addBookmark: (boardId, bookmark) => {
    const newBookmark: Bookmark = {
      id: generateId(),
      createdAt: Date.now(),
      ...bookmark,
    }
    set((state) => ({
      pages: state.pages.map((p) => ({
        ...p,
        boards: p.boards.map((b) =>
          b.id === boardId
            ? { ...b, bookmarks: [...b.bookmarks, newBookmark] }
            : b
        ),
      })),
    }))
    get()._persist()
  },

  deleteBookmark: (boardId, bookmarkId) => {
    set((state) => ({
      pages: state.pages.map((p) => ({
        ...p,
        boards: p.boards.map((b) =>
          b.id === boardId
            ? { ...b, bookmarks: b.bookmarks.filter((bm) => bm.id !== bookmarkId) }
            : b
        ),
      })),
    }))
    get()._persist()
  },

  moveBookmark: (fromBoardId, toBoardId, bookmarkId) => {
    let bookmark: Bookmark | undefined

    const pagesWithRemoved = get().pages.map((p) => ({
      ...p,
      boards: p.boards.map((b) => {
        if (b.id === fromBoardId) {
          bookmark = b.bookmarks.find((bm) => bm.id === bookmarkId)
          return {
            ...b,
            bookmarks: b.bookmarks.filter((bm) => bm.id !== bookmarkId),
          }
        }
        return b
      }),
    }))

    if (!bookmark) return

    const finalBookmark = bookmark
    const finalPages = pagesWithRemoved.map((p) => ({
      ...p,
      boards: p.boards.map((b) =>
        b.id === toBoardId
          ? { ...b, bookmarks: [...b.bookmarks, finalBookmark] }
          : b
      ),
    }))

    set({ pages: finalPages })
    get()._persist()
  },

  // --------- Reorder Actions ----------
  reorderBoards: (pageId, oldIndex, newIndex) => {
    set((state) => ({
      pages: state.pages.map((p) => {
        if (p.id !== pageId) return p

        const boards = [...p.boards]
        const [moved] = boards.splice(oldIndex, 1)
        boards.splice(newIndex, 0, moved)

        return { ...p, boards }
      }),
    }))
    get()._persist()
  },

  reorderBookmarks: (sourceBoardId, destinationBoardId, sourceIndex, destinationIndex) => {
    set((state) => {
      let bookmark: Bookmark | undefined

      // Step 1: Remove from source board
      const afterRemove = state.pages.map((p) => ({
        ...p,
        boards: p.boards.map((b) => {
          if (b.id !== sourceBoardId) return b
          const bookmarks = [...b.bookmarks]
          const [removed] = bookmarks.splice(sourceIndex, 1)
          bookmark = removed
          return { ...b, bookmarks }
        }),
      }))

      if (!bookmark) return state
      const finalBookmark = bookmark

      // Step 2: Insert into destination board
      const afterInsert = afterRemove.map((p) => ({
        ...p,
        boards: p.boards.map((b) => {
          if (b.id !== destinationBoardId) return b
          const bookmarks = [...b.bookmarks]
          bookmarks.splice(destinationIndex, 0, finalBookmark)
          return { ...b, bookmarks }
        }),
      }))

      return { pages: afterInsert }
    })
    get()._persist()
  },
}))