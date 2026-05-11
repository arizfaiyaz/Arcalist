import { create } from "zustand";
import { generateId } from "../lib/id";
import { saveState, loadState } from "../lib/storage";
import { pushToCloud, pullFromCloud, resolveConflict } from "../lib/sync";
import { autoSyncChromeBookmarks } from "../lib/autoSync.ts";
import { importChromeBookmarks } from "../lib/importBookmarks";
import { addMapping, getBookmarkMap, removeMapping } from "../lib/chromeBookmarkMap";
import { supabase } from "../lib/supabase";
import { defaultState } from "../data/default";
import { DEFAULT_WALLPAPER } from "../data/wallpapers";
import { applyTheme } from "../lib/theme";
import {
  canCreateBoard,
  canCreatePage,
  normalizeBoardsForFreeTier,
} from "../lib/freeTier";
import type {
  ArcalistState,
  AppSettings,
  WallpaperTheme,
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

const IS_TEST_ENV = import.meta.env?.MODE === "test";

const TRASH_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function buildFavicon(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return "";
  }
}

type ArcalistStore = ArcalistState & {
  // Auth state
  user: User | null;
  syncStatus: "idle" | "syncing" | "synced" | "error";
  signingIn: boolean;
  signInError: string | null;
  hydrated: boolean;
  authReady: boolean;

  // Initialization & auth
  initialize: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;

  // Free tier helpers
  canCreatePage: () => boolean;
  canCreateBoard: (pageId: string) => boolean;
  getVisiblePages: () => Page[];
  getOverflowBoards: () => ArcalistState["overflowBoards"];

  // Page actions
  setActivePage: (pageId: string) => void;
  addPage: (title: string) => boolean;
  deletePage: (pageId: string) => void;
  renamePage: (pageId: string, title: string) => void;

  // Board actions
  addBoard: (pageId: string, title: string) => boolean;
  deleteBoard: (pageId: string, boardId: string) => void;
  renameBoard: (pageId: string, boardId: string, title: string) => void;
  reorderBoards: (pageId: string, oldIndex: number, newIndex: number) => void;

  // Bookmark actions
  addBookmark: (
    boardId: string,
    bookmark: Omit<Bookmark, "id" | "createdAt">,
  ) => void;
  deleteBookmark: (boardId: string, bookmarkId: string) => void;
  updateBookmark: (
    boardId: string,
    bookmarkId: string,
    updates: Partial<Pick<Bookmark, "title" | "url" | "description">>,
  ) => void;
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

  // Settings & appearance
  updateSettings: (settings: Partial<AppSettings>) => void;
  setWallpaper: (wallpaper: WallpaperTheme) => void;

  // Privacy
  togglePrivacyMode: () => void;

  // Trash
  trashBookmark: (boardId: string, bookmarkId: string) => void;
  restoreBookmark: (bookmarkId: string) => void;
  permanentlyDelete: (bookmarkId: string) => void;
  clearTrash: () => void;
  cleanupTrash: () => void;

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

  const createTrashedItem = (
    bookmark: Bookmark,
    board: Board,
    page: Page,
  ): TrashedBookmark => ({
    bookmark: { ...bookmark, isTrashed: true },
    deletedAt: Date.now(),
    fromBoardTitle: board.title,
    fromPageTitle: page.title,
    fromBoardId: board.id,
    fromPageId: page.id,
  });

  const normalizeState = (state: ArcalistState): ArcalistState => {
    const merged: ArcalistState = {
      ...state,
      trash: state.trash ?? [],
      settings: { ...defaultState.settings, ...state.settings },
      overflowBoards: state.overflowBoards ?? [],
    };
    return normalizeBoardsForFreeTier(merged);
  };

  const canUseChromeBookmarks = () =>
    typeof chrome !== "undefined" && !!chrome.bookmarks;

  const findBoardById = (boardId: string) =>
    get()
      .pages.flatMap((p) => p.boards)
      .find((b) => b.id === boardId) ?? null;

  const resolveChromeFolderId = async (boardId: string) => {
    const board = findBoardById(boardId);
    if (board?.chromeFolderId) return board.chromeFolderId;
    const map = await getBookmarkMap();
    const match = Object.entries(map).find(([, id]) => id === boardId);
    return match?.[0] ?? null;
  };

  const ensureChromeFolderForBoard = async (boardId: string, title: string) => {
    if (!canUseChromeBookmarks()) return null;
    const existing = await resolveChromeFolderId(boardId);
    if (existing) return existing;
    try {
      const folder = await chrome.bookmarks.create({
        parentId: "1",
        title,
      });
      if (!folder?.id) return null;
      await addMapping(folder.id, boardId);
      set((state) => ({
        pages: state.pages.map((p) => ({
          ...p,
          boards: p.boards.map((b) =>
            b.id === boardId ? { ...b, chromeFolderId: folder.id } : b,
          ),
        })),
      }));
      return folder.id;
    } catch (err) {
      console.error("[Arcalist] Failed to create Chrome folder:", err);
      return null;
    }
  };

  const removeChromeFolderTree = async (boardId: string) => {
    if (!canUseChromeBookmarks()) return;
    const folderId = await resolveChromeFolderId(boardId);
    if (!folderId) return;
    try {
      await chrome.bookmarks.removeTree(folderId);
      await removeMapping(folderId);
    } catch (err) {
      console.error("[Arcalist] Failed to remove Chrome folder:", err);
    }
  };

  const collectBoardIdsForFolderTree = async (boardId: string) => {
    if (!canUseChromeBookmarks()) return [boardId];
    const folderId = await resolveChromeFolderId(boardId);
    if (!folderId) return [boardId];
    try {
      const tree = await chrome.bookmarks.getSubTree(folderId);
      const folderIds = new Set<string>();
      const walk = (node: chrome.bookmarks.BookmarkTreeNode) => {
        if (!node.url) folderIds.add(node.id);
        for (const child of node.children ?? []) {
          walk(child);
        }
      };
      if (tree[0]) walk(tree[0]);

      const map = await getBookmarkMap();
      const boardIds = new Set<string>();
      for (const id of folderIds) {
        const mappedBoardId = map[id];
        if (mappedBoardId) boardIds.add(mappedBoardId);
      }

      for (const board of get().pages.flatMap((p) => p.boards)) {
        if (board.chromeFolderId && folderIds.has(board.chromeFolderId)) {
          boardIds.add(board.id);
        }
      }

      boardIds.add(boardId);
      return Array.from(boardIds);
    } catch (err) {
      console.error("[Arcalist] Failed to read Chrome folder tree:", err);
      return [boardId];
    }
  };

  const removeChromeBookmark = async (
    boardId: string,
    bookmark: Bookmark,
  ) => {
    if (!canUseChromeBookmarks()) return;
    if (bookmark.chromeBookmarkId) {
      try {
        await chrome.bookmarks.remove(bookmark.chromeBookmarkId);
      } catch (err) {
        console.error("[Arcalist] Failed to remove Chrome bookmark:", err);
      }
      return;
    }

    const folderId = await resolveChromeFolderId(boardId);
    if (!folderId) return;
    try {
      const children = await chrome.bookmarks.getChildren(folderId);
      const match = children.find(
        (child) => child.url === bookmark.url && child.title === bookmark.title,
      );
      if (match?.id) {
        await chrome.bookmarks.remove(match.id);
      }
    } catch (err) {
      console.error("[Arcalist] Failed to locate Chrome bookmark:", err);
    }
  };

  const createChromeBookmark = async (
    boardId: string,
    bookmark: Bookmark,
  ) => {
    if (!canUseChromeBookmarks()) return null;
    const board = findBoardById(boardId);
    const folderId = await ensureChromeFolderForBoard(
      boardId,
      board?.title ?? "Bookmarks",
    );
    try {
      const created = await chrome.bookmarks.create({
        parentId: folderId ?? "1",
        title: bookmark.title,
        url: bookmark.url,
      });
      return created?.id ?? null;
    } catch (err) {
      console.error("[Arcalist] Failed to create Chrome bookmark:", err);
      return null;
    }
  };

  return {
    // ─── Initial State ─────────────────────────────────────────
    pages: [],
    activePageId: "",
    trash: [],
    overflowBoards: [],
    privacyMode: false,
    updatedAt: 0,
    settings: defaultState.settings,
    wallpaperTheme: DEFAULT_WALLPAPER,
    user: null,
    syncStatus: "idle",
    signingIn: false,
    signInError: null,
    hydrated: false,
    authReady: false,

    // ─── Initialization ───────────────────────────────────────
    initialize: async () => {
      // 1. Load local state first (instant)
      const local = await loadState();
      if (local) {
        const normalized = normalizeState(local);
        set({
          ...normalized,
          hydrated: true,
        });
        saveState(normalized);
        if (normalized.wallpaperTheme) applyTheme(normalized.wallpaperTheme);
      } else {
        const initial = normalizeState({
          ...defaultState,
          updatedAt: Date.now(),
        });
        set({ ...initial, hydrated: true });
        saveState(initial);
        applyTheme(initial.wallpaperTheme);
      }

      // 2. Check for existing Supabase session (fast local read)
      const {
        data: { session },
      } = await supabase.auth.getSession();
      set({ user: session?.user ?? null, authReady: true });

      const maybeImportChrome = async () => {
        const current = (await loadState()) ?? get();
        const imported = await importChromeBookmarks(current as ArcalistState);
        if (imported) {
          const normalized = normalizeState({
            ...imported,
            overflowBoards:
              imported.overflowBoards ??
              (current as ArcalistState).overflowBoards ??
              [],
          });
          set(normalized);
          saveState(normalized);
          if (normalized.wallpaperTheme) {
            applyTheme(normalized.wallpaperTheme);
          }
        }
      };

      // 3. Listen for auth changes (sign in / sign out)
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          set({ user: session.user, authReady: true });
          // Pull remote state on sign in
          const remote = await pullFromCloud(session.user.id);
          if (remote) {
            // Remote exists — always use it on sign in
            // User's cloud data is the source of truth
            const merged: ArcalistState = {
              ...remote,
              settings: { ...defaultState.settings, ...remote.settings },
              privacyMode: false,
              overflowBoards: remote.overflowBoards ?? [],
            };
            const normalized = normalizeState(merged);
            set({ ...normalized, user: session.user });
            saveState(normalized);
            await maybeImportChrome();
          } else {
            // No remote data yet — first time signing in
            // Push current local state up to cloud
            const currentLocal = await loadState();
            if (currentLocal) {
              const normalized = normalizeState(currentLocal);
              saveState(normalized);
              await pushToCloud(session.user.id, normalized);
              set({ syncStatus: "synced" });
              setTimeout(() => set({ syncStatus: "idle" }), 2000);
            }
            await maybeImportChrome();
          }
        } else if (event === "SIGNED_OUT") {
          set({ user: null, syncStatus: "idle", authReady: true });
        }
      });

      const runBackgroundTasks = async () => {
        if (session?.user) {
          const remote = await pullFromCloud(session.user.id);
          if (remote) {
            const currentLocal = (await loadState()) ?? get();
            const winner = currentLocal
              ? resolveConflict(currentLocal, remote)
              : remote;
            const merged: ArcalistState = {
              ...winner,
              settings: { ...defaultState.settings, ...winner.settings },
              overflowBoards: winner.overflowBoards ?? [],
            };
            const normalized = normalizeState(merged);
            set(normalized);
            saveState(normalized);
          }
        }

        await maybeImportChrome();

        const syncChanged = await autoSyncChromeBookmarks(
          { ...get() } as ArcalistState,
        );
        if (syncChanged) {
          const syncedState = await loadState();
          if (syncedState) {
            const normalized = normalizeState(syncedState);
            set(normalized);
            saveState(normalized);
            if (normalized.wallpaperTheme) {
              applyTheme(normalized.wallpaperTheme);
            }
          }
        }

        get().cleanupTrash();
      };

      void runBackgroundTasks();
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
            const merged: ArcalistState = {
              ...winner,
              settings: { ...defaultState.settings, ...winner.settings },
              overflowBoards: winner.overflowBoards ?? [],
            };
            const normalized = normalizeState(merged);
            set(normalized);
            saveState(normalized);
          } else {
            // First sign in — push local state up
            const currentLocal = await loadState();
            if (currentLocal) {
              const normalized = normalizeState(currentLocal);
              saveState(normalized);
              await pushToCloud(data.user.id, normalized);
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

    // ─── Free Tier Helpers ─────────────────────────────────
    canCreatePage: () => canCreatePage(get().pages),

    canCreateBoard: (pageId) => {
      const page = get().pages.find((p) => p.id === pageId);
      return canCreateBoard(page);
    },

    getVisiblePages: () => get().pages,

    getOverflowBoards: () => get().overflowBoards ?? [],

    // ─── Internal Helpers ─────────────────────────────────────
    _persist: () => {
      const {
        pages,
        activePageId,
        trash,
        overflowBoards,
        privacyMode,
        settings,
        wallpaperTheme,
      } = get();
      const state: ArcalistState = {
        pages,
        activePageId,
        trash,
        overflowBoards,
        privacyMode,
        settings,
        wallpaperTheme,
        updatedAt: Date.now(),
      };
      set({ updatedAt: state.updatedAt });
      saveState(state);
      if (IS_TEST_ENV) {
        void get()._syncToCloud();
      } else {
        debouncedSync();
      }
    },

    _syncToCloud: async () => {
      const {
        user,
        pages,
        activePageId,
        trash,
        overflowBoards,
        privacyMode,
        settings,
        wallpaperTheme,
        updatedAt,
      } = get();
      const userId = user?.id ?? (IS_TEST_ENV ? "test-user" : null);
      if (!userId) return;

      set({ syncStatus: "syncing" });
      try {
        await pushToCloud(userId, {
          pages,
          activePageId,
          trash,
          overflowBoards,
          privacyMode,
          settings,
          wallpaperTheme,
          updatedAt,
        });
        set({ syncStatus: "synced" });
        // Reset back to idle after 2 seconds
        setTimeout(() => set({ syncStatus: "idle" }), 2000);
      } catch {
        set({ syncStatus: "error" });
      }
    },

    // ─── Settings & Appearance ──────────────────────────────
    updateSettings: (newSettings) => {
      set((state) => ({
        settings: { ...state.settings, ...newSettings },
      }));
      get()._persist();
    },

    setWallpaper: (wallpaper) => {
      set({ wallpaperTheme: wallpaper });
      // Apply CSS variables immediately so theme updates live
      applyTheme(wallpaper);
      get()._persist();
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
      if (!canCreatePage(get().pages)) return false;
      const newPage: Page = {
        id: generateId(),
        title,
        order: get().pages.length,
        boards: [],
      };
      set((state) => ({ pages: [...state.pages, newPage] }));
      get()._persist();
      return true;
    },

    deletePage: (pageId) => {
      if (get().pages.length <= 1) return;
      const pageToDelete = get().pages.find((p) => p.id === pageId);
      if (!pageToDelete) return;
      for (const board of pageToDelete.boards) {
        void removeChromeFolderTree(board.id);
      }
      const trashedItems = pageToDelete.boards.flatMap((board) =>
        board.bookmarks.map((bookmark) =>
          createTrashedItem(bookmark, board, pageToDelete),
        ),
      );
      set((state) => {
        const filtered = state.pages.filter((p) => p.id !== pageId);
        const newActiveId =
          state.activePageId === pageId ? filtered[0].id : state.activePageId;
        return {
          pages: filtered,
          activePageId: newActiveId,
          trash: [...state.trash, ...trashedItems],
        };
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
      if (!canCreateBoard(page)) return false;
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
      return true;
    },

    deleteBoard: (pageId, boardId) => {
      const page = get().pages.find((p) => p.id === pageId);
      const board = page?.boards.find((b) => b.id === boardId);
      if (!page || !board) return;
      if (canUseChromeBookmarks() && board.chromeFolderId) {
        chrome.bookmarks.removeTree(board.chromeFolderId).catch(() => {});
        void removeMapping(board.chromeFolderId);
      } else {
        void removeChromeFolderTree(boardId);
      }
      const trashedItems = board.bookmarks.map((bookmark) =>
        createTrashedItem(bookmark, board, page),
      );
      set((state) => ({
        pages: state.pages.map((p) =>
          p.id === pageId
            ? { ...p, boards: p.boards.filter((b) => b.id !== boardId) }
            : p,
        ),
        trash: [...state.trash, ...trashedItems],
      }));
      get()._persist();

      void (async () => {
        const boardIds = await collectBoardIdsForFolderTree(boardId);
        const extraBoardIds = boardIds.filter((id) => id !== boardId);
        if (extraBoardIds.length === 0) return;
        set((state) => {
          const extraBoards = state.pages
            .flatMap((p) => p.boards)
            .filter((b) => extraBoardIds.includes(b.id));
          if (extraBoards.length === 0) return state;
          const extraTrash = extraBoards.flatMap((b) => {
            const owningPage = state.pages.find((p) =>
              p.boards.some((board) => board.id === b.id),
            );
            if (!owningPage) return [];
            return b.bookmarks.map((bookmark) =>
              createTrashedItem(bookmark, b, owningPage),
            );
          });
          return {
            pages: state.pages.map((p) => ({
              ...p,
              boards: p.boards.filter((b) => !extraBoardIds.includes(b.id)),
            })),
            trash: [...state.trash, ...extraTrash],
          };
        });
        get()._persist();
      })();
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
      get().trashBookmark(boardId, bookmarkId);
    },

    updateBookmark: (boardId, bookmarkId, updates) => {
      set((state) => ({
        pages: state.pages.map((p) => ({
          ...p,
          boards: p.boards.map((b) => {
            if (b.id !== boardId) return b;
            return {
              ...b,
              bookmarks: b.bookmarks.map((bm) => {
                if (bm.id !== bookmarkId) return bm;
                const next: Bookmark = { ...bm, ...updates };
                if (updates.description === "") {
                  next.description = undefined;
                }
                if (updates.url && updates.url !== bm.url) {
                  next.favicon = buildFavicon(updates.url);
                }
                return next;
              }),
            };
          }),
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
      let targetBoard: Board | null = null;
      let targetPage: Page | null = null;
      let bookmark: Bookmark | undefined;
      for (const page of get().pages) {
        for (const board of page.boards) {
          if (board.id === boardId) {
            targetBoard = board;
            targetPage = page;
            bookmark = board.bookmarks.find((bm) => bm.id === bookmarkId);
          }
        }
      }
      if (!bookmark || !targetBoard || !targetPage) return;
      void removeChromeBookmark(boardId, bookmark);
      const trashedItem = createTrashedItem(
        bookmark,
        targetBoard,
        targetPage,
      );
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
      let targetBoardId = get()
        .pages.flatMap((p) => p.boards)
        .find((b) => b.id === trashItem.fromBoardId)
        ? trashItem.fromBoardId
        : undefined;

      if (!targetBoardId && trashItem.fromPageId) {
        const page = get().pages.find((p) => p.id === trashItem.fromPageId);
        targetBoardId = page?.boards[0]?.id;
      }

      if (!targetBoardId) {
        targetBoardId = get().pages[0]?.boards[0]?.id;
      }
      if (!targetBoardId) return;
      const restoredBookmark: Bookmark = {
        ...trashItem.bookmark,
        isTrashed: false,
        chromeBookmarkId: undefined,
      };
      set((state) => ({
        trash: state.trash.filter((t) => t.bookmark.id !== bookmarkId),
        pages: state.pages.map((p) => ({
          ...p,
          boards: p.boards.map((b) =>
            b.id === targetBoardId
              ? { ...b, bookmarks: [...b.bookmarks, restoredBookmark] }
              : b,
          ),
        })),
      }));
      get()._persist();

      const board = findBoardById(targetBoardId);
      if (canUseChromeBookmarks() && board?.chromeFolderId) {
        chrome.bookmarks
          .create({
            parentId: board.chromeFolderId,
            title: restoredBookmark.title,
            url: restoredBookmark.url,
          })
          .then((created) => {
            if (!created?.id) return;
            set((state) => ({
              pages: state.pages.map((p) => ({
                ...p,
                boards: p.boards.map((b) =>
                  b.id === targetBoardId
                    ? {
                        ...b,
                        bookmarks: b.bookmarks.map((bm) =>
                          bm.id === restoredBookmark.id
                            ? { ...bm, chromeBookmarkId: created.id }
                            : bm,
                        ),
                      }
                    : b,
                ),
              })),
            }));
            get()._persist();
          })
          .catch(() => {});
      } else {
        void (async () => {
          const chromeBookmarkId = await createChromeBookmark(
            targetBoardId,
            restoredBookmark,
          );
          if (!chromeBookmarkId) return;
          set((state) => ({
            pages: state.pages.map((p) => ({
              ...p,
              boards: p.boards.map((b) =>
                b.id === targetBoardId
                  ? {
                      ...b,
                      bookmarks: b.bookmarks.map((bm) =>
                        bm.id === restoredBookmark.id
                          ? { ...bm, chromeBookmarkId }
                          : bm,
                      ),
                    }
                  : b,
              ),
            })),
          }));
          get()._persist();
        })();
      }
    },

    permanentlyDelete: (bookmarkId) => {
      set((state) => ({
        trash: state.trash.filter((t) => t.bookmark.id !== bookmarkId),
      }));
      get()._persist();
    },

    clearTrash: () => {
      const items = get().trash;
      set({ trash: [] });
      get()._persist();
      void (async () => {
        for (const item of items) {
          await removeChromeBookmark(item.fromBoardId, item.bookmark);
        }
      })();
    },

    cleanupTrash: () => {
      const cutoff = Date.now() - TRASH_RETENTION_MS;
      const current = get().trash;
      const filtered = current.filter((item) => item.deletedAt >= cutoff);
      if (filtered.length === current.length) return;
      set({ trash: filtered });
      get()._persist();
    },
  };
});
