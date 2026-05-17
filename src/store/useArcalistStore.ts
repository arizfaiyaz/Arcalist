import { create } from "zustand";
import { generateId } from "../lib/id";
import {
  clearWorkspaceCacheForUser,
  loadState,
  saveState,
  setStoredAuthState,
} from "../lib/storage";
import { markDirty, pullFromCloud, pushToCloud } from "../lib/sync";
import {
  getSyncMeta,
  setPlanStatus,
  updateSyncMeta,
} from "../lib/sync/syncStorage";
import { addMapping, getBookmarkMap, removeMapping } from "../lib/chromeBookmarkMap";
import {
  buildHomeWorkspaceFromChromeBookmarks,
  canonicalizeToHomeWorkspace,
  fetchChromeBookmarkTree,
  HOME_PAGE_ID,
} from "../lib/chromeBookmarks";
import { mergeCloudWorkspaceIntoChrome } from "../lib/bookmarkMerge";
import { resolveAuthenticatedPlanStatus } from "../lib/plan";
import { supabase } from "../lib/supabase";
import { defaultState } from "../data/default";
import { DEFAULT_WALLPAPER, toWallpaperTheme } from "../data/wallpapers";
import { applyTheme } from "../lib/theme";
import { getEffectiveTheme, getThemeById } from "../config/themes";
import { customWallpaperToTheme } from "../lib/customWallpapers";
import {
  getPlanLimits,
  getVisiblePagesForPlan,
  normalizeWorkspaceState,
  type PlanName,
} from "../lib/planLimits";
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

function normalizeBookmark(bookmark: Bookmark): Bookmark {
  return {
    ...bookmark,
    title: bookmark.title ?? "",
    url: bookmark.url ?? "",
    favicon: bookmark.favicon ?? bookmark.faviconUrl ?? buildFavicon(bookmark.url ?? ""),
    visitCount: bookmark.visitCount ?? 0,
    tags: bookmark.tags ?? undefined,
  };
}

type ArcalistStore = ArcalistState & {
  // Auth state
  user: User | null;
  syncStatus: "idle" | "syncing" | "synced" | "offline" | "error" | "conflict";
  signingIn: boolean;
  signInError: string | null;
  hydrated: boolean;
  authReady: boolean;
  isProUser: boolean;
  planName: PlanName;
  entitlementReady: boolean;

  // Initialization & auth
  initialize: () => Promise<void>;
  hydrateWorkspaceForUser: (user: User) => Promise<void>;
  setAuthenticatedUser: (user: User | null) => Promise<void>;
  setVerifiedPlanStatus: (
    isProUser: boolean,
    planName: PlanName,
    entitlementReady?: boolean,
  ) => void;
  clearWorkspaceStore: () => void;
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
    updates: Partial<
      Pick<
        Bookmark,
        | "title"
        | "url"
        | "description"
        | "updatedAt"
        | "lastVisitedAt"
        | "visitCount"
        | "tags"
      >
    >,
  ) => void;
  recordBookmarkVisit: (boardId: string, bookmarkId: string) => void;
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
    const selectedThemeId =
      state.settings?.selectedThemeId ?? state.wallpaperTheme?.id ?? "default-dark";
    const customWallpapers = state.settings?.customWallpapers ?? [];
    const customThemes = customWallpapers.map(customWallpaperToTheme);
    const merged: ArcalistState = {
      ...state,
      pages: (state.pages ?? []).map((page) => ({
        ...page,
        boards: (page.boards ?? []).map((board) => ({
          ...board,
          bookmarks: (board.bookmarks ?? []).map(normalizeBookmark),
        })),
      })),
      trash: (state.trash ?? []).map((item) => ({
        ...item,
        bookmark: normalizeBookmark(item.bookmark),
      })),
      settings: {
        ...defaultState.settings,
        ...state.settings,
        selectedThemeId,
        customWallpapers,
      },
      wallpaperTheme: toWallpaperTheme(
        getThemeById(selectedThemeId, customThemes)?.id ?? "default-dark",
      ),
      overflowBoards: state.overflowBoards ?? [],
    };
    return normalizeWorkspaceState(merged);
  };

  const emptyWorkspaceState = (): ArcalistState => ({
    pages: [],
    activePageId: "",
    trash: [],
    overflowBoards: [],
    privacyMode: false,
    updatedAt: 0,
    settings: defaultState.settings,
    wallpaperTheme: DEFAULT_WALLPAPER,
  });

  const clearWorkspaceFromMemory = () => {
    set({
      ...emptyWorkspaceState(),
      syncStatus: "idle",
      hydrated: false,
    });
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

  const buildChromeFirstWorkspace = async (
    userId: string,
  ): Promise<ArcalistState> => {
    const local = await loadState(userId);
    const base: ArcalistState = {
      ...defaultState,
      ...(local ?? {}),
      pages: [],
      activePageId: HOME_PAGE_ID,
      overflowBoards: [],
      updatedAt: Date.now(),
      settings: {
        ...defaultState.settings,
        ...(local?.settings ?? {}),
      },
      wallpaperTheme: local?.wallpaperTheme ?? DEFAULT_WALLPAPER,
      trash: local?.trash ?? [],
      privacyMode: local?.privacyMode ?? false,
    };

    if (!canUseChromeBookmarks()) {
      if (local) return normalizeState(local);
      return normalizeState(base);
    }

    const chromeWorkspace = buildHomeWorkspaceFromChromeBookmarks(
      await fetchChromeBookmarkTree(),
      base,
    );
    return normalizeState({
      ...chromeWorkspace,
      settings: base.settings,
      wallpaperTheme: base.wallpaperTheme,
      trash: base.trash,
      privacyMode: base.privacyMode,
    });
  };

  const applyWorkspace = async (
    workspace: ArcalistState,
    user: User,
    isProUser = get().isProUser,
  ) => {
    const normalized = normalizeState(canonicalizeToHomeWorkspace(workspace));
    if (get().user?.id !== user.id) return normalized;
    set({ ...normalized, user, hydrated: true });
    await saveState(normalized, user.id);
    applyTheme(
      getEffectiveTheme(
        normalized.settings.selectedThemeId,
        isProUser,
        normalized.settings.customWallpapers.map(customWallpaperToTheme),
      ),
    );
    return normalized;
  };

  const syncMissingCloudItemsIntoChrome = async (
    user: User,
    chromeWorkspace: ArcalistState,
  ) => {
    if (!canUseChromeBookmarks()) return chromeWorkspace;

    set({ syncStatus: "syncing" });
    try {
      const meta = await getSyncMeta();
      const cloudWorkspace = await pullFromCloud(user.id);
      if (get().user?.id !== user.id) return chromeWorkspace;

      const merged = await mergeCloudWorkspaceIntoChrome(
        cloudWorkspace,
        chromeWorkspace,
      );
      const nextWorkspace = normalizeState({
        ...merged.workspace,
        settings: chromeWorkspace.settings,
        wallpaperTheme: chromeWorkspace.wallpaperTheme,
        trash: chromeWorkspace.trash,
        privacyMode: chromeWorkspace.privacyMode,
      });

      await applyWorkspace(nextWorkspace, user, true);
      if (meta.enabled || IS_TEST_ENV) {
        await pushToCloud(user.id, nextWorkspace, true);
      }
      set({ syncStatus: "synced" });
      setTimeout(() => set({ syncStatus: "idle" }), 2000);
      return nextWorkspace;
    } catch (error) {
      console.error("[Arcalist] Pro Chrome-first cloud merge failed:", error);
      set({ syncStatus: "error" });
      return chromeWorkspace;
    }
  };

  const refreshChromeWorkspaceForUser = async (user: User) => {
    const chromeWorkspace = await buildChromeFirstWorkspace(user.id);
    if (get().user?.id !== user.id) return;

    const appliedChromeWorkspace = await applyWorkspace(
      chromeWorkspace,
      user,
      get().isProUser,
    );

    const plan = await resolveAuthenticatedPlanStatus(user.id);
    if (get().user?.id !== user.id) return;
    set({
      isProUser: plan.isProUser,
      planName: plan.planName,
      entitlementReady: true,
    });
    await setPlanStatus(plan.isProUser, plan.planName);

    if (!plan.isProUser) {
      get().cleanupTrash();
      return;
    }

    void syncMissingCloudItemsIntoChrome(user, appliedChromeWorkspace).then(
      () => {
        if (get().user?.id === user.id) get().cleanupTrash();
      },
    );
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
    isProUser: false,
    planName: "free",
    entitlementReady: false,

    // ─── Initialization ───────────────────────────────────────
    initialize: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        clearWorkspaceFromMemory();
        set({
          user: null,
          authReady: true,
          isProUser: false,
          planName: "free",
          entitlementReady: true,
        });
        await setStoredAuthState(null);
        await setPlanStatus(false, "free");
        return;
      }

      await get().hydrateWorkspaceForUser(session.user);
    },

    hydrateWorkspaceForUser: async (user) => {
      const keepVisibleWorkspace =
        get().hydrated && get().user?.id === user.id && get().pages.length > 0;
      set({
        user,
        authReady: true,
        hydrated: keepVisibleWorkspace,
        signingIn: false,
        isProUser: false,
        planName: "free",
        entitlementReady: false,
      });
      await setStoredAuthState(user.id);
      await setPlanStatus(false, "free");

      const cachedWorkspace = await loadState(user.id);
      if (get().user?.id !== user.id) return;

      if (cachedWorkspace) {
        await applyWorkspace(
          cachedWorkspace,
          user,
          get().isProUser,
        );
        void refreshChromeWorkspaceForUser(user);
        return;
      }

      await refreshChromeWorkspaceForUser(user);
    },

    setAuthenticatedUser: async (user) => {
      if (!user) {
        clearWorkspaceFromMemory();
        set({
          user: null,
          authReady: true,
          signingIn: false,
          signInError: null,
          isProUser: false,
          planName: "free",
          entitlementReady: true,
        });
        await setStoredAuthState(null);
        await setPlanStatus(false, "free");
        return;
      }

      set({
        user,
        authReady: true,
        signingIn: false,
        signInError: null,
        isProUser: false,
        planName: "free",
        entitlementReady: false,
      });
      await setStoredAuthState(user.id);
      await setPlanStatus(false, "free");
    },

    setVerifiedPlanStatus: (isProUser, planName, entitlementReady = true) => {
      set({ isProUser, planName, entitlementReady });
    },

    clearWorkspaceStore: () => {
      clearWorkspaceFromMemory();
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
          await get().setAuthenticatedUser(data.user);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[Arcalist] OAuth flow failed:", msg);
        set({ signingIn: false, signInError: msg });
      }
    },

    signOut: async () => {
      const userId = get().user?.id ?? null;
      clearWorkspaceFromMemory();
      set({
        user: null,
        authReady: true,
        signingIn: false,
        signInError: null,
        isProUser: false,
        planName: "free",
        entitlementReady: true,
      });
      await setStoredAuthState(null);
      await setPlanStatus(false, "free");
      await clearWorkspaceCacheForUser(userId);
      await supabase.auth.signOut();
    },

    // ─── Free Tier Helpers ─────────────────────────────────
    canCreatePage: () => {
      const limits = getPlanLimits(get().isProUser);
      return limits.canCreatePage(get().pages.length);
    },

    canCreateBoard: (pageId) => {
      const page = get().pages.find((p) => p.id === pageId);
      const limits = getPlanLimits(get().isProUser);
      return limits.canCreateBoard(page?.boards?.length ?? 0);
    },

    getVisiblePages: () => {
      const limits = getPlanLimits(get().isProUser);
      return getVisiblePagesForPlan(get().pages, limits);
    },

    getOverflowBoards: () => get().overflowBoards ?? [],

    // ─── Internal Helpers ─────────────────────────────────────
    _persist: () => {
      const {
        user,
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
      if (!user?.id) return;
      set({ updatedAt: state.updatedAt });
      saveState(state, user.id);
      void markDirty();
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
      const userId = user?.id ?? null;
      if (!userId) return;
      const limits = getPlanLimits(get().isProUser);
      if (!IS_TEST_ENV) {
        const meta = await getSyncMeta();
        if (!limits.isProUser || !meta.enabled) {
          await updateSyncMeta({
            status: limits.isProUser ? "idle" : "idle",
          });
          return;
        }
        if (!navigator.onLine) {
          set({ syncStatus: "offline" });
          await updateSyncMeta({ status: "offline" });
          return;
        }
      }

      set({ syncStatus: "syncing" });
      try {
        const canonicalWorkspace = canonicalizeToHomeWorkspace({
          pages,
          activePageId,
          trash,
          overflowBoards,
          privacyMode,
          settings,
          wallpaperTheme,
          updatedAt,
        });
        await pushToCloud(
          userId,
          canonicalWorkspace,
          limits.isProUser,
        );
        set({ syncStatus: "synced" });
        // Reset back to idle after 2 seconds
        setTimeout(() => set({ syncStatus: "idle" }), 2000);
      } catch {
        set({ syncStatus: "error" });
      }
    },

    // ─── Settings & Appearance ──────────────────────────────
    updateSettings: (newSettings) => {
      set((state) => {
        const selectedThemeId =
          newSettings.selectedThemeId ?? state.settings.selectedThemeId;
        const customWallpapers =
          newSettings.customWallpapers ?? state.settings.customWallpapers;
        const customThemes = customWallpapers.map(customWallpaperToTheme);
        return {
          settings: { ...state.settings, ...newSettings },
          wallpaperTheme:
            newSettings.selectedThemeId !== undefined
              ? toWallpaperTheme(
                  getThemeById(selectedThemeId, customThemes)?.id ??
                    "default-dark",
                )
              : state.wallpaperTheme,
        };
      });
      get()._persist();
    },

    setWallpaper: (wallpaper) => {
      const customThemes = get().settings.customWallpapers.map(
        customWallpaperToTheme,
      );
      const selectedThemeId =
        getThemeById(wallpaper.id, customThemes)?.id ?? "default-dark";
      const theme = getEffectiveTheme(
        selectedThemeId,
        get().isProUser,
        customThemes,
      );
      set((state) => ({
        wallpaperTheme: toWallpaperTheme(theme.id),
        settings: { ...state.settings, selectedThemeId },
      }));
      applyTheme(theme);
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
      const limits = getPlanLimits(get().isProUser);
      if (!limits.canCreatePage(get().pages.length)) return false;
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
      const limits = getPlanLimits(get().isProUser);
      if (!limits.canCreateBoard(page?.boards?.length ?? 0)) return false;
      const boardId = generateId();
      const newBoard: Board = {
        id: boardId,
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
      void ensureChromeFolderForBoard(boardId, title).then(() => {
        get()._persist();
      });
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
      const board = get().pages
        .find((p) => p.id === pageId)
        ?.boards.find((b) => b.id === boardId);
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
      const folderId = board?.chromeFolderId;
      if (canUseChromeBookmarks() && folderId) {
        chrome.bookmarks.update(folderId, { title }).catch((error) => {
          console.error("[Arcalist] Failed to rename Chrome folder:", error);
        });
      } else {
        void ensureChromeFolderForBoard(boardId, title);
      }
    },

    reorderBoards: (pageId, oldIndex, newIndex) => {
      const page = get().pages.find((p) => p.id === pageId);
      const movedBoard = page?.boards[oldIndex];
      const targetBoard = page?.boards[newIndex];
      if (!page || !movedBoard || !targetBoard) return;
      const chromeFolderId = movedBoard.chromeFolderId;
      const chromeParentId = movedBoard.chromeParentId;
      set((state) => ({
        pages: state.pages.map((p) => {
          if (p.id !== pageId) return p;
          const boards = [...p.boards];
          const [moved] = boards.splice(oldIndex, 1);
          if (!moved) return p;
          boards.splice(newIndex, 0, moved);
          return {
            ...p,
            boards: boards.map((board, order) => ({ ...board, order })),
          };
        }),
      }));
      get()._persist();
      if (
        canUseChromeBookmarks() &&
        chromeFolderId &&
        chromeParentId &&
        targetBoard.chromeParentId === chromeParentId
      ) {
        const siblingIndex = get()
          .pages.find((p) => p.id === pageId)
          ?.boards.filter((board) => board.chromeParentId === chromeParentId)
          .findIndex((board) => board.id === movedBoard.id);
        const chromeIndex = Math.max(0, siblingIndex ?? newIndex);
        chrome.bookmarks
          .move(chromeFolderId, {
            parentId: chromeParentId,
            index: chromeIndex,
          })
          .catch((error) => {
            console.error("[Arcalist] Failed to reorder Chrome folder:", error);
          });
      }
    },

    // ─── Bookmark Actions ─────────────────────────────────────
    addBookmark: (boardId, bookmark) => {
      const now = new Date().toISOString();
      const bookmarkId = generateId();
      const newBookmark: Bookmark = {
        id: bookmarkId,
        ...bookmark,
        createdAt: now,
        updatedAt: now,
        visitCount: bookmark.visitCount ?? 0,
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
      void createChromeBookmark(boardId, newBookmark).then((chromeBookmarkId) => {
        if (!chromeBookmarkId) return;
        set((state) => ({
          pages: state.pages.map((p) => ({
            ...p,
            boards: p.boards.map((b) =>
              b.id === boardId
                ? {
                    ...b,
                    bookmarks: b.bookmarks.map((bm) =>
                      bm.id === bookmarkId
                        ? {
                            ...bm,
                            id: `chrome-bookmark-${chromeBookmarkId}`,
                            chromeBookmarkId,
                          }
                        : bm,
                    ),
                  }
                : b,
            ),
          })),
        }));
        get()._persist();
      });
    },

    deleteBookmark: (boardId, bookmarkId) => {
      get().trashBookmark(boardId, bookmarkId);
    },

    updateBookmark: (boardId, bookmarkId, updates) => {
      const previousBookmark = findBoardById(boardId)?.bookmarks.find(
        (bm) => bm.id === bookmarkId,
      );
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
                next.updatedAt = updates.updatedAt ?? new Date().toISOString();
                return next;
              }),
            };
          }),
        })),
      }));
      get()._persist();
      if (canUseChromeBookmarks() && previousBookmark?.chromeBookmarkId) {
        const chromeUpdates: chrome.bookmarks.UpdateChanges = {};
        if (updates.title !== undefined) chromeUpdates.title = updates.title;
        if (updates.url !== undefined) chromeUpdates.url = updates.url;
        if (chromeUpdates.title || chromeUpdates.url) {
          chrome.bookmarks
            .update(previousBookmark.chromeBookmarkId, chromeUpdates)
            .catch((error) => {
              console.error("[Arcalist] Failed to update Chrome bookmark:", error);
            });
        }
      }
    },

    recordBookmarkVisit: (boardId, bookmarkId) => {
      const now = new Date().toISOString();
      set((state) => ({
        pages: state.pages.map((p) => ({
          ...p,
          boards: p.boards.map((b) => {
            if (b.id !== boardId) return b;
            return {
              ...b,
              bookmarks: b.bookmarks.map((bm) =>
                bm.id === bookmarkId
                  ? {
                      ...bm,
                      visitCount: (bm.visitCount ?? 0) + 1,
                      lastVisitedAt: now,
                      updatedAt: now,
                    }
                  : bm,
              ),
            };
          }),
        })),
      }));
      get()._persist();
    },

    moveBookmark: (fromBoardId, toBoardId, bookmarkId) => {
      let bookmark: Bookmark | undefined;
      const targetFolderId =
        findBoardById(toBoardId)?.chromeFolderId ?? undefined;
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
      if (canUseChromeBookmarks() && bookmark.chromeBookmarkId && targetFolderId) {
        chrome.bookmarks
          .move(bookmark.chromeBookmarkId, { parentId: targetFolderId })
          .catch((error) => {
            console.error("[Arcalist] Failed to move Chrome bookmark:", error);
          });
      }
    },

    reorderBookmarks: (
      sourceBoardId,
      destinationBoardId,
      sourceIndex,
      destinationIndex,
    ) => {
      const sourceBoard = findBoardById(sourceBoardId);
      const destinationBoard = findBoardById(destinationBoardId);
      const movedBookmark = sourceBoard?.bookmarks[sourceIndex];
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
      if (
        canUseChromeBookmarks() &&
        movedBookmark?.chromeBookmarkId &&
        destinationBoard?.chromeFolderId
      ) {
        chrome.bookmarks
          .move(movedBookmark.chromeBookmarkId, {
            parentId: destinationBoard.chromeFolderId,
            index: destinationIndex,
          })
          .catch((error) => {
            console.error("[Arcalist] Failed to reorder Chrome bookmark:", error);
          });
      }
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
