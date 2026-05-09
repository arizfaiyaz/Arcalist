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

export type ArcalistState = {
  pages: Page[]
  activePageId: string
}
