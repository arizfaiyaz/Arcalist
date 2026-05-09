// LumiList Service Worker
// This runs in the background, separate from the new tab page.
// It has no access to the DOM — only Chrome APIs.

import type { ArcalistState } from "../types"

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Arcalist] Installed')
})

// Quick Save command listener — wired up in Module 5
chrome.commands.onCommand.addListener(async(command) => {
  if (command === 'quick-save') return

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab.url?.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    return
  }

  // Extract domain for favicon
    let domain: string
    try {
      domain = new URL(tab.url).hostname
    } catch {
      return
    }
  
    const newBookmark = {
      id: Math.random().toString(36).slice(2, 8),
      title: tab.title ?? 'Untitled',
      url: tab.url ?? '',
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
      createdAt: Date.now(),
    }
  
    // Read current state from storage
    const result = await chrome.storage.local.get('arcalist_state')
  const state = result['arcalist_state'] as ArcalistState;
    if (!state) return
  
    // Find the "Inbox" board on the first page
    // If it doesn't exist, add the bookmark to the first board of the first page
    const firstPage = state.pages[0]
    if (!firstPage) return
  
    let targetBoard = firstPage.boards.find(
      (b: { title: string }) => b.title.toLowerCase() === 'inbox'
    )
  
    // No inbox board — use the first board available
    if (!targetBoard) {
      targetBoard = firstPage.boards[0]
    }
  
    if (!targetBoard) return
  
    // Push the new bookmark into the target board
    targetBoard.bookmarks.unshift(newBookmark) // unshift = add to top
  
    // Save updated state back to storage
    await chrome.storage.local.set({ arcalist_state: state })
  
    // Notify the new tab page to refresh its state
    chrome.runtime.sendMessage({ type: 'QUICK_SAVE_DONE' }).catch(() => {
      // New tab might not be open — that's fine, storage is already updated
    })
})