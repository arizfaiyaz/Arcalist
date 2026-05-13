import type { ArcalistState } from "../types";
import { browserApi } from "./browserApi";

const STORAGE_KEY = 'arcalist_state'

export async function saveState(state: ArcalistState): Promise<void> {
  try {
    await browserApi.storage.set({ [STORAGE_KEY]: state })
  } catch (err) {
    console.error('[Arcalist] Failed to save state:', err)
  }
}

export async function loadState(): Promise<ArcalistState | null> {
  try {
    const result = await browserApi.storage.get<Record<string, ArcalistState | undefined>>(STORAGE_KEY)
    return result[STORAGE_KEY] ?? null
  } catch (err) {
    console.error('[Arcalist] Failed to load state:', err)
    return null
  }
}
