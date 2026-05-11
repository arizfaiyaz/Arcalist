import type { ArcalistState } from "../../src/types";

export function createBaseState(overrides?: Partial<ArcalistState>): ArcalistState {
  return {
    pages: [
      {
        id: "page-1",
        title: "Home",
        order: 0,
        boards: [
          {
            id: "board-1",
            title: "Inbox",
            order: 0,
            chromeFolderId: "chrome-folder-1",
            bookmarks: [
              {
                id: "bm-1",
                title: "Example",
                url: "https://example.com",
                favicon: "https://example.com/favicon.ico",
                chromeBookmarkId: "chrome-bm-1",
                createdAt: Date.now(),
              },
            ],
          },
        ],
      },
    ],
    activePageId: "page-1",
    trash: [],
    overflowBoards: [],
    privacyMode: false,
    updatedAt: Date.now(),
    settings: {
      compactMode: false,
      groupTools: false,
      smartTruncation: true,
      visibilityThreshold: 10,
      shortenTitles: true,
      openInNewTab: false,
      showDescriptions: false,
      autoCloseAfterSaveAllTabs: false,
      defaultCaptureBoardId: null,
    },
    wallpaperTheme: {
      id: "default-dark",
      name: "Default",
      url: null,
      isDark: true,
      accentColor: "#00d285",
      tone: "dark",
    },
    ...overrides,
  };
}