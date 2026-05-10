import type { ArcalistState } from "../types";

const STORAGE_KEY = 'arcalist_state'

export async function saveState(state: ArcalistState): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ [STORAGE_KEY]: state })
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }
  } catch (err) {
    console.error('[Arcalist] Failed to save state:', err)
  }
}

export async function loadState(): Promise<ArcalistState | null> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(STORAGE_KEY)
      return (result[STORAGE_KEY] as ArcalistState) ?? null
    } else {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    }
  } catch (err) {
    console.error('[Arcalist] Failed to load state:', err)
    return null
  }
}