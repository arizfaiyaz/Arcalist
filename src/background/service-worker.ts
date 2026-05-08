// LumiList Service Worker
// This runs in the background, separate from the new tab page.
// It has no access to the DOM — only Chrome APIs.

chrome.runtime.onInstalled.addListener(() => {
  console.log('LumiList installed successfully')
})

// Quick Save command listener — wired up in Module 5
chrome.commands.onCommand.addListener((command) => {
  if (command === 'quick-save') {
    console.log('Quick Save triggered — coming in Module 5')
  }
})