import { create } from 'zustand'
import { generateId } from '../lib/id'
import { saveState, loadState } from '../lib/storage'
import { defaultState } from '../data/default'
import type { ArcalistState, Page, Board, Bookmark } from '../types'

// The full store tpye = state shape & all actions
type ArcalistStore = ArcalistState & {
  // Initialization
  initialize: () => Promise<void>

  // ------ Page actions ------
  setActivePage: (pageId: string) => void
  addPage: (title: string) => void
  deletePage: (pageId: string) => void
  renamePage: (pageId: string, title: string) => void

  // ------ *_Board actions_* ------
  addBoard: (pageId: string, title: string) => void
  deleteBoard: (pageId: string, boardId: string) => void
  renameBoard: (pageId: string, boardId: string, title: string) => void

  // Bookmark actions
  addBookmark: (boardId: string, bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void
  deleteBookmark: (boardId: string, bookmarkId: string) => void
  moveBookmark: (fromBoardId: string, toBoardId: string, bookmarkId: string) => void

  // Internal helper — saves to storage after every changes
  _persist: () => void
}

export const useArcalistStore = create<ArcalistStore>((set, get) => ({
  // --------- Initial State ------------------
  pages: [],
  activePageId: '',

  // --------- Initialization ---------------
  // Call this once when the app mounts.
  // Loads from storage or falsl back to defaultState.
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
  // Every action calls this at the end to save the new state.
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
    // Don't allow deleting the last page
    if (get().pages.length <= 1) return

    set((state) => {
      const filtered = state.pages.filter((p) => p.id !== pageId)
      // If we deleted the active page, switch to the first remaining one
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
    // Find the bookmark first
    let bookmark: Bookmark | undefined

    const pages = get().pages.map((p) => ({
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

    // Now add it to the target board
    const finalBookmark = bookmark
    const finalPages = pages.map((p) => ({
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
}))