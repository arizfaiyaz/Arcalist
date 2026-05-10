import { create } from "zustand";
import { generateId } from "../lib/id";
import { saveState, loadState } from "../lib/storage";
import { pushToCloud, pullFromCloud, resolveConflict } from "../lib/sync";
import { supabase } from "../lib/supabase";
import { defaultState } from "../data/default";
import type {
  ArcalistState,
  Page,
  Board,
  Bookmark,
  TrashedBookmark,
} from "../types";
import type { User } from "@supabase/supabase-js";

// Debounce helper — waits ms after last call before firing
function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

type ArcalistStore = ArcalistState & {
  // Auth state
  user: User | null;
  syncStatus: "idle" | "syncing" | "synced" | "error";
  signingIn: boolean;
  signInError: string | null;

  // Initialization & auth
  initialize: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;

  // Page actions
  setActivePage: (pageId: string) => void;
  addPage: (title: string) => void;
  deletePage: (pageId: string) => void;
  renamePage: (pageId: string, title: string) => void;

  // Board actions
  addBoard: (pageId: string, title: string) => void;
  deleteBoard: (pageId: string, boardId: string) => void;
  renameBoard: (pageId: string, boardId: string, title: string) => void;
  reorderBoards: (pageId: string, oldIndex: number, newIndex: number) => void;

  // Bookmark actions
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
  reorderBookmarks: (
    sourceBoardId: string,
    destinationBoardId: string,
    sourceIndex: number,
    destinationIndex: number,
  ) => void;

  // Privacy
  togglePrivacyMode: () => void;

  // Trash
  trashBookmark: (boardId: string, bookmarkId: string) => void;
  restoreBookmark: (bookmarkId: string) => void;
  permanentlyDelete: (bookmarkId: string) => void;
  clearTrash: () => void;

  // Internal
  _persist: () => void;
  _syncToCloud: () => void;
};

export const useArcalistStore = create<ArcalistStore>((set, get) => {
  // Debounced cloud sync — fires 2 seconds after last change
  // Defined outside the store object so it's created once
  const debouncedSync = debounce(() => {
    get()._syncToCloud();
  }, 2000);

  return {
    // ─── Initial State ─────────────────────────────────────────
    pages: [],
    activePageId: "",
    trash: [],
    privacyMode: false,
    updatedAt: 0,
    user: null,
    syncStatus: "idle",
    signingIn: false,
    signInError: null,

    // ─── Initialization ───────────────────────────────────────
    initialize: async () => {
      // 1. Load local state first (instant)
      const local = await loadState();
      if (local) {
        set({
          ...local,
          privacyMode: local.privacyMode ?? false,
          trash: local.trash ?? [],
          updatedAt: local.updatedAt ?? 0,
        });
      } else {
        const initial = { ...defaultState, updatedAt: Date.now() };
        set(initial);
        saveState(initial);
      }

      // 2. Check for existing Supabase session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        set({ user: session.user });

        // 3. Pull from cloud and resolve conflict
        const remote = await pullFromCloud(session.user.id);
        if (remote) {
          const currentLocal = await loadState();
          const winner = currentLocal
            ? resolveConflict(currentLocal, remote)
            : remote;
          set(winner);
          saveState(winner);
        }
      }

      // 4. Listen for auth changes (sign in / sign out)
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          set({ user: session.user });
          // Pull remote state on sign in
          const remote = await pullFromCloud(session.user.id);
          if (remote) {
            const currentLocal = await loadState();
            const winner = currentLocal
              ? resolveConflict(currentLocal, remote)
              : remote;
            set(winner);
            saveState(winner);
          } else {
            // First time signing in — push local state to cloud
            const currentState = await loadState();
            if (currentState && session.user) {
              await pushToCloud(session.user.id, currentState);
            }
          }
        } else if (event === "SIGNED_OUT") {
          set({ user: null, syncStatus: "idle" });
        }
      });
    },

    // ─── Auth ─────────────────────────────────────────────────
    signInWithGoogle: async () => {
      set({ signingIn: true, signInError: null });

      // Guard: identity API requires the extension to be reloaded after
      // the "identity" permission is added to manifest.json
      if (!chrome?.identity?.launchWebAuthFlow) {
        set({
          signingIn: false,
          signInError:
            "chrome.identity is unavailable — reload the extension at chrome://extensions and try again.",
        });
        return;
      }

      const extensionId = chrome.runtime.id;

      // Build the Supabase OAuth URL manually
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const redirectUrl = `https://${extensionId}.chromiumapp.org/`;

      const oauthUrl =
        `${supabaseUrl}/auth/v1/authorize` +
        `?provider=google` +
        `&redirect_to=${encodeURIComponent(redirectUrl)}`;

      try {
        // chrome.identity.launchWebAuthFlow opens a popup, handles redirect,
        // and returns the final URL with the token — all without leaving the extension
        const responseUrl = await new Promise<string>((resolve, reject) => {
          chrome.identity.launchWebAuthFlow(
            { url: oauthUrl, interactive: true },
            (callbackUrl) => {
              if (chrome.runtime.lastError || !callbackUrl) {
                reject(chrome.runtime.lastError?.message ?? "Auth failed");
              } else {
                resolve(callbackUrl);
              }
            },
          );
        });

        // Extract the tokens from the callback URL hash
        const url = new URL(responseUrl);
        const params = new URLSearchParams(url.hash.slice(1)); // remove the #
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (!accessToken || !refreshToken) {
          set({
            signingIn: false,
            signInError:
              "Sign-in failed: no tokens returned. Check your Supabase redirect URL settings.",
          });
          return;
        }

        // Give the tokens to Supabase so it creates a proper session
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          set({ signingIn: false, signInError: error.message });
          return;
        }

        if (data.user) {
          set({ user: data.user, signingIn: false, signInError: null });

          // Now push/pull from cloud
          const remote = await pullFromCloud(data.user.id);
          if (remote) {
            const currentLocal = await loadState();
            const winner = currentLocal
              ? resolveConflict(currentLocal, remote)
              : remote;
            set(winner);
            saveState(winner);
          } else {
            // First sign in — push local state up
            const currentLocal = await loadState();
            if (currentLocal) {
              await pushToCloud(data.user.id, currentLocal);
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[Arcalist] OAuth flow failed:", msg);
        set({ signingIn: false, signInError: msg });
      }
    },

    signOut: async () => {
      await supabase.auth.signOut();
      set({ user: null, syncStatus: "idle" });
    },

    // ─── Internal Helpers ─────────────────────────────────────
    _persist: () => {
      const { pages, activePageId, trash, privacyMode } = get();
      const state: ArcalistState = {
        pages,
        activePageId,
        trash,
        privacyMode,
        updatedAt: Date.now(),
      };
      set({ updatedAt: state.updatedAt });
      saveState(state);
      debouncedSync();
    },

    _syncToCloud: async () => {
      const { user, pages, activePageId, trash, privacyMode, updatedAt } =
        get();
      if (!user) return;

      set({ syncStatus: "syncing" });
      try {
        await pushToCloud(user.id, {
          pages,
          activePageId,
          trash,
          privacyMode,
          updatedAt,
        });
        set({ syncStatus: "synced" });
        // Reset back to idle after 2 seconds
        setTimeout(() => set({ syncStatus: "idle" }), 2000);
      } catch {
        set({ syncStatus: "error" });
      }
    },

    // ─── Privacy ──────────────────────────────────────────────
    // Now calls _persist so it saves to storage
    togglePrivacyMode: () => {
      set((state) => ({ privacyMode: !state.privacyMode }));
      get()._persist();
    },

    // ─── Page Actions ─────────────────────────────────────────
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

    // ─── Board Actions ────────────────────────────────────────
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

    // ─── Bookmark Actions ─────────────────────────────────────
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
      const pages = get().pages.map((p) => ({
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
      const finalPages = pages.map((p) => ({
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

    reorderBookmarks: (
      sourceBoardId,
      destinationBoardId,
      sourceIndex,
      destinationIndex,
    ) => {
      set((state) => {
        let bookmark: Bookmark | undefined;
        const afterRemove = state.pages.map((p) => ({
          ...p,
          boards: p.boards.map((b) => {
            if (b.id !== sourceBoardId) return b;
            const bookmarks = [...b.bookmarks];
            [bookmark] = bookmarks.splice(sourceIndex, 1);
            return { ...b, bookmarks };
          }),
        }));
        if (!bookmark) return state;
        const finalBookmark = bookmark;
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

    // ─── Trash ────────────────────────────────────────────────
    trashBookmark: (boardId, bookmarkId) => {
      let fromBoardTitle = "";
      let fromPageTitle = "";
      let bookmark: Bookmark | undefined;
      for (const page of get().pages) {
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
  };
});
