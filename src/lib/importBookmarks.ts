// Runs once on extension install to pull all existing Chrome bookmarks
// into the Arcalist storage format so they're immediately visible.

const STORAGE_KEY = 'arcalist_state'

function generateId(): string {
  return Math.random().toString(36).slice(2, 9)
}

function makeFavicon(url: string): string {
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
  } catch {
    return ''
  }
}

// Recursively collect every bookmark URL inside a node (flattens sub-folders)
function collectBookmarks(
  node: chrome.bookmarks.BookmarkTreeNode,
): { id: string; title: string; url: string; favicon: string; createdAt: number }[] {
  const out: { id: string; title: string; url: string; favicon: string; createdAt: number }[] = []

  if (node.url) {
    out.push({
      id: generateId(),
      title: node.title || node.url,
      url: node.url,
      favicon: makeFavicon(node.url),
      createdAt: Date.now(),
    })
  }

  for (const child of node.children ?? []) {
    out.push(...collectBookmarks(child))
  }

  return out
}

export async function importChromeBookmarks(): Promise<void> {
  // Never overwrite an existing state — user may have already added bookmarks
  const existing = await chrome.storage.local.get(STORAGE_KEY)
  if (existing[STORAGE_KEY]) return

  const tree = await chrome.bookmarks.getTree()
  const root = tree[0]
  if (!root?.children) return

  // Chrome root always has two children:
  //   id "1" → Bookmarks bar
  //   id "2" → Other bookmarks
  // (Mobile bookmarks / "3" may also appear on some profiles)
  const pages: {
    id: string
    title: string
    order: number
    boards: {
      id: string
      title: string
      order: number
      bookmarks: { id: string; title: string; url: string; favicon: string; createdAt: number }[]
    }[]
  }[] = []

  for (const topFolder of root.children) {
    if (!topFolder.children || topFolder.children.length === 0) continue

    const boards: typeof pages[0]['boards'] = []
    const directBookmarks: typeof pages[0]['boards'][0]['bookmarks'] = []

    for (const child of topFolder.children) {
      if (child.url) {
        // Bookmark sitting directly in the bar / Other Bookmarks root
        directBookmarks.push({
          id: generateId(),
          title: child.title || child.url,
          url: child.url,
          favicon: makeFavicon(child.url),
          createdAt: Date.now(),
        })
      } else {
        // Sub-folder → Board (collect all bookmarks inside recursively)
        const bms = collectBookmarks(child)
        if (bms.length > 0) {
          boards.push({
            id: generateId(),
            title: child.title || 'Bookmarks',
            order: boards.length,
            bookmarks: bms,
          })
        }
      }
    }

    // Unsorted bookmarks at the top of the bar become their own board
    if (directBookmarks.length > 0) {
      boards.unshift({
        id: generateId(),
        title: 'Quick Access',
        order: 0,
        bookmarks: directBookmarks,
      })
      boards.forEach((b, i) => { b.order = i })
    }

    if (boards.length === 0) continue

    const pageName =
      topFolder.id === '1' ? 'Bookmarks Bar'
      : topFolder.id === '2' ? 'Other Bookmarks'
      : topFolder.title || 'Bookmarks'

    pages.push({
      id: generateId(),
      title: pageName,
      order: pages.length,
      boards,
    })
  }

  if (pages.length === 0) return

  const initialState = {
    pages,
    activePageId: pages[0].id,
    trash: [],
    privacyMode: false,
    updatedAt: Date.now(),
    settings: {
      openInNewTab: false,
      shortenTitles: true,
      compactMode: false,
      showDescriptions: false,
    },
    wallpaperTheme: {
      id: 'default-dark',
      name: 'Default',
      url: null,
      isDark: true,
      accentColor: '#00d285',
    },
  }

  await chrome.storage.local.set({ [STORAGE_KEY]: initialState })
  console.log(
    `[Arcalist] Imported ${pages.reduce((acc, p) => acc + p.boards.reduce((a, b) => a + b.bookmarks.length, 0), 0)} bookmarks across ${pages.length} page(s)`
  )
}
