export type Bookmark = {
  id: string
  title: string
  url: string
  favicon: string
  incognito?: boolean
  createdAt: number  //timestamp
}

export type Board = {
  id: string
  title: string
  bookmarks: Bookmark[]
  order: number
}

export type Page = {
  id: string
  title: string
  boards: Board[]
  order: number
}

export type TrashedBookmark = {
  bookmark: Bookmark
  deletedAt: number  //timestamp
  fromBoardTitle: string
  fromPageTitle: string
  fromBoardId: string // used for restoring the bookmark to the correct board
}

export type ArcalistState = {
  pages: Page[]
  activePageId: string
  trash: TrashedBookmark[]; 
  privacyMode: boolean
  updatedAt: number
}
