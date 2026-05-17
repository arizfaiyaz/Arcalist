import {
  buildHomeWorkspaceFromChromeBookmarks,
  fetchChromeBookmarkTree,
  normalizeUrlForComparison,
} from "./chromeBookmarks";
import type { ArcalistState, Board, Bookmark } from "../types";

type MergeResult = {
  changedChrome: boolean;
  workspace: ArcalistState;
};

function activeBookmarks(board: Board): Bookmark[] {
  return (board.bookmarks ?? []).filter(
    (bookmark) => !bookmark.deletedAt && !bookmark.isTrashed && bookmark.url,
  );
}

function cloudBoardsWithBookmarks(workspace: ArcalistState): Board[] {
  return (workspace.pages ?? [])
    .flatMap((page) => page.boards ?? [])
    .filter((board) => !board.deletedAt && activeBookmarks(board).length > 0);
}

function findChromeBoardForCloudBoard(
  cloudBoard: Board,
  chromeWorkspace: ArcalistState,
) {
  const boards = chromeWorkspace.pages.flatMap((page) => page.boards ?? []);
  if (cloudBoard.chromeFolderId) {
    const byChromeId = boards.find(
      (board) => board.chromeFolderId === cloudBoard.chromeFolderId,
    );
    if (byChromeId) return byChromeId;
  }

  return boards.find(
    (board) => board.title.trim().toLowerCase() === cloudBoard.title.trim().toLowerCase(),
  );
}

async function createChromeFolder(title: string) {
  try {
    return await chrome.bookmarks.create({ parentId: "1", title });
  } catch {
    return chrome.bookmarks.create({ title });
  }
}

async function ensureChromeFolder(
  cloudBoard: Board,
  chromeWorkspace: ArcalistState,
) {
  const existing = findChromeBoardForCloudBoard(cloudBoard, chromeWorkspace);
  if (existing?.chromeFolderId) return existing.chromeFolderId;

  const folder = await createChromeFolder(cloudBoard.title || "Bookmarks");
  return folder.id;
}

function existingUrlKeys(board: Board | null | undefined) {
  return new Set(
    (board?.bookmarks ?? [])
      .map((bookmark) => normalizeUrlForComparison(bookmark.url))
      .filter(Boolean),
  );
}

export async function mergeCloudWorkspaceIntoChrome(
  cloudWorkspace: ArcalistState | null,
  chromeWorkspace: ArcalistState,
): Promise<MergeResult> {
  if (!cloudWorkspace?.pages?.length) {
    return { changedChrome: false, workspace: chromeWorkspace };
  }

  let changedChrome = false;

  for (const cloudBoard of cloudBoardsWithBookmarks(cloudWorkspace)) {
    let currentChromeWorkspace = chromeWorkspace;
    if (changedChrome) {
      currentChromeWorkspace = buildHomeWorkspaceFromChromeBookmarks(
        await fetchChromeBookmarkTree(),
        chromeWorkspace,
      );
    }

    const matchingBoard = findChromeBoardForCloudBoard(
      cloudBoard,
      currentChromeWorkspace,
    );
    const folderId = await ensureChromeFolder(cloudBoard, currentChromeWorkspace);
    const urlKeys = existingUrlKeys(matchingBoard);

    for (const bookmark of activeBookmarks(cloudBoard)) {
      const normalizedUrl = normalizeUrlForComparison(bookmark.url);
      if (!normalizedUrl || urlKeys.has(normalizedUrl)) continue;

      await chrome.bookmarks.create({
        parentId: folderId,
        title: bookmark.title || bookmark.url,
        url: bookmark.url,
      });
      urlKeys.add(normalizedUrl);
      changedChrome = true;
    }
  }

  if (!changedChrome) {
    return { changedChrome, workspace: chromeWorkspace };
  }

  const workspace = buildHomeWorkspaceFromChromeBookmarks(
    await fetchChromeBookmarkTree(),
    chromeWorkspace,
  );
  return { changedChrome, workspace };
}

