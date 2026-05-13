import type { ArcalistState, Board, Bookmark, Page, TrashedBookmark } from "../../types";

function timestampValue(value: number | string | undefined | null): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function workspaceTimestamp(workspace: ArcalistState | null | undefined) {
  return timestampValue(workspace?.updatedAt);
}

export function resolveConflict(
  localWorkspace: ArcalistState,
  cloudWorkspace: ArcalistState,
): ArcalistState {
  const localTime = workspaceTimestamp(localWorkspace);
  const cloudTime = workspaceTimestamp(cloudWorkspace);
  const latest = cloudTime > localTime ? cloudWorkspace : localWorkspace;
  const other = latest === cloudWorkspace ? localWorkspace : cloudWorkspace;

  return mergeWorkspacePreservingData(latest, other);
}

export function willOverwriteLocal(
  localWorkspace: ArcalistState | null,
  resolvedWorkspace: ArcalistState,
) {
  if (!localWorkspace) return false;
  return (
    workspaceTimestamp(resolvedWorkspace) > workspaceTimestamp(localWorkspace) ||
    hasAdditionalWorkspaceData(localWorkspace, resolvedWorkspace)
  );
}

function byOrder<T extends { order?: number }>(items: T[]) {
  return items
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        (Number.isFinite(a.item.order) ? a.item.order ?? 0 : a.index) -
          (Number.isFinite(b.item.order) ? b.item.order ?? 0 : b.index) ||
        a.index - b.index,
    )
    .map(({ item }, order) => ({ ...item, order }));
}

function mergeBookmarks(
  latest: Bookmark[] = [],
  other: Bookmark[] = [],
): Bookmark[] {
  const merged = new Map<string, Bookmark>();
  for (const bookmark of other) {
    merged.set(bookmark.id, { ...bookmark });
  }
  for (const bookmark of latest) {
    merged.set(bookmark.id, {
      ...(merged.get(bookmark.id) ?? {}),
      ...bookmark,
    });
  }
  return Array.from(merged.values());
}

function mergeBoards(latest: Board[] = [], other: Board[] = []): Board[] {
  const merged = new Map<string, Board>();
  for (const board of other) {
    merged.set(board.id, {
      ...board,
      bookmarks: mergeBookmarks([], board.bookmarks ?? []),
    });
  }
  for (const board of latest) {
    const existing = merged.get(board.id);
    merged.set(board.id, {
      ...(existing ?? {}),
      ...board,
      bookmarks: mergeBookmarks(board.bookmarks ?? [], existing?.bookmarks ?? []),
    });
  }
  return byOrder(Array.from(merged.values()));
}

function mergePages(latest: Page[] = [], other: Page[] = []): Page[] {
  const merged = new Map<string, Page>();
  for (const page of other) {
    merged.set(page.id, {
      ...page,
      boards: mergeBoards([], page.boards ?? []),
    });
  }
  for (const page of latest) {
    const existing = merged.get(page.id);
    merged.set(page.id, {
      ...(existing ?? {}),
      ...page,
      boards: mergeBoards(page.boards ?? [], existing?.boards ?? []),
    });
  }
  return byOrder(Array.from(merged.values()));
}

function mergeTrash(
  latest: TrashedBookmark[] = [],
  other: TrashedBookmark[] = [],
): TrashedBookmark[] {
  const merged = new Map<string, TrashedBookmark>();
  for (const item of other) {
    merged.set(item.bookmark.id, { ...item, bookmark: { ...item.bookmark } });
  }
  for (const item of latest) {
    merged.set(item.bookmark.id, { ...item, bookmark: { ...item.bookmark } });
  }
  return Array.from(merged.values()).sort((a, b) => a.deletedAt - b.deletedAt);
}

export function mergeWorkspacePreservingData(
  latest: ArcalistState,
  other: ArcalistState,
): ArcalistState {
  const pages = mergePages(latest.pages ?? [], other.pages ?? []);
  const activePageId = pages.some((page) => page.id === latest.activePageId)
    ? latest.activePageId
    : pages.some((page) => page.id === other.activePageId)
      ? other.activePageId
      : pages[0]?.id ?? "";

  return {
    ...other,
    ...latest,
    pages,
    activePageId,
    trash: mergeTrash(latest.trash ?? [], other.trash ?? []),
    overflowBoards: [
      ...(other.overflowBoards ?? []),
      ...(latest.overflowBoards ?? []),
    ],
    settings: {
      ...other.settings,
      ...latest.settings,
      customWallpapers: [
        ...(other.settings?.customWallpapers ?? []),
        ...(latest.settings?.customWallpapers ?? []),
      ].filter(
        (wallpaper, index, all) =>
          all.findIndex((item) => item.id === wallpaper.id) === index,
      ),
    },
    updatedAt: Math.max(workspaceTimestamp(latest), workspaceTimestamp(other)),
  };
}

function workspaceIds(workspace: ArcalistState) {
  const pageIds = new Set<string>();
  const boardIds = new Set<string>();
  const bookmarkIds = new Set<string>();
  const trashIds = new Set<string>();
  const wallpaperIds = new Set<string>();

  for (const page of workspace.pages ?? []) {
    pageIds.add(page.id);
    for (const board of page.boards ?? []) {
      boardIds.add(board.id);
      for (const bookmark of board.bookmarks ?? []) {
        bookmarkIds.add(bookmark.id);
      }
    }
  }

  for (const item of workspace.trash ?? []) {
    trashIds.add(item.bookmark.id);
  }

  for (const wallpaper of workspace.settings?.customWallpapers ?? []) {
    wallpaperIds.add(wallpaper.id);
  }

  return { pageIds, boardIds, bookmarkIds, trashIds, wallpaperIds };
}

function hasExtraIds(source: Set<string>, target: Set<string>) {
  for (const id of target) {
    if (!source.has(id)) return true;
  }
  return false;
}

function hasAdditionalWorkspaceData(
  localWorkspace: ArcalistState,
  resolvedWorkspace: ArcalistState,
) {
  const local = workspaceIds(localWorkspace);
  const resolved = workspaceIds(resolvedWorkspace);
  return (
    hasExtraIds(local.pageIds, resolved.pageIds) ||
    hasExtraIds(local.boardIds, resolved.boardIds) ||
    hasExtraIds(local.bookmarkIds, resolved.bookmarkIds) ||
    hasExtraIds(local.trashIds, resolved.trashIds) ||
    hasExtraIds(local.wallpaperIds, resolved.wallpaperIds)
  );
}
