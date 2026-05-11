export type Bookmark = {
  id: string
  title: string
  url: string
  favicon: string
  incognito?: boolean
  description?: string
  isTrashed?: boolean
  chromeBookmarkId?: string
  createdAt: number  //timestamp
}

export type Board = {
  id: string
  title: string
  bookmarks: Bookmark[]
  order: number
  chromeFolderId?: string
}

export type Page = {
  id: string
  title: string
  boards: Board[]
  order: number
}

export type OverflowBoard = {
  board: Board
  fromPageId?: string
  fromPageTitle?: string
}

export type TrashedBookmark = {
  bookmark: Bookmark
  deletedAt: number  //timestamp
  fromBoardTitle: string
  fromPageTitle: string
  fromBoardId: string // used for restoring the bookmark to the correct board
  fromPageId?: string
}

export type AppSettings = {
  compactMode: boolean
  groupTools: boolean
  smartTruncation: boolean
  visibilityThreshold: number
  shortenTitles: boolean
  openInNewTab: boolean
  showDescriptions: boolean
  autoCloseAfterSaveAllTabs: boolean
  defaultCaptureBoardId: string | null
}

export type WallpaperTheme = {
  id: string
  name: string
  url: string | null
  isDark: boolean
  accentColor: string
  tone?: "light" | "dark" | "colorful"
}

export type ArcalistState = {
  pages: Page[]
  activePageId: string
  trash: TrashedBookmark[]; 
  privacyMode: boolean
  updatedAt: number
  settings: AppSettings
  wallpaperTheme: WallpaperTheme
  overflowBoards?: OverflowBoard[]
}
