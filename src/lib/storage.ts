import type { ArcalistState } from "../types";
import { browserApi } from "./browserApi";

export const LEGACY_WORKSPACE_STORAGE_KEY = "arcalist_state";
export const ACTIVE_USER_STORAGE_KEY = "arcalist_active_user";
export const AUTH_STATE_STORAGE_KEY = "arcalist_auth_state";

export type StoredAuthState = {
  isAuthenticated: boolean;
  userId?: string;
  updatedAt: string;
};

export function getWorkspaceStorageKey(userId: string): string {
  return `arcalist:workspace:${userId}`;
}

export async function saveState(
  state: ArcalistState,
  userId: string,
): Promise<void> {
  try {
    await browserApi.storage.set({
      [getWorkspaceStorageKey(userId)]: state,
      [ACTIVE_USER_STORAGE_KEY]: userId,
    })
  } catch (err) {
    console.error('[Arcalist] Failed to save state:', err)
  }
}

export async function loadState(userId: string): Promise<ArcalistState | null> {
  try {
    const key = getWorkspaceStorageKey(userId);
    const result = await browserApi.storage.get<Record<string, ArcalistState | undefined>>(key)
    return result[key] ?? null
  } catch (err) {
    console.error('[Arcalist] Failed to load state:', err)
    return null
  }
}

export async function setStoredAuthState(userId: string | null): Promise<void> {
  await browserApi.storage.set({
    [AUTH_STATE_STORAGE_KEY]: userId
      ? {
          isAuthenticated: true,
          userId,
          updatedAt: new Date().toISOString(),
        }
      : {
          isAuthenticated: false,
          updatedAt: new Date().toISOString(),
        },
  });
  if (!userId) {
    await browserApi.storage.remove(ACTIVE_USER_STORAGE_KEY);
  }
}

export async function getStoredAuthState(): Promise<StoredAuthState> {
  const result = await browserApi.storage.get<Record<string, StoredAuthState | undefined>>(
    AUTH_STATE_STORAGE_KEY,
  );
  return (
    result[AUTH_STATE_STORAGE_KEY] ?? {
      isAuthenticated: false,
      updatedAt: new Date().toISOString(),
    }
  );
}

export async function clearWorkspaceCacheForUser(
  userId: string | null,
): Promise<void> {
  const keys = [
    LEGACY_WORKSPACE_STORAGE_KEY,
    ACTIVE_USER_STORAGE_KEY,
    "workspace",
    "pages",
    "boards",
    "bookmarks",
    "sync",
    "plan",
    "arcalist_sync",
    "arcalist_plan",
    "arcalist_last_sync",
    "arcalist_chrome_imported",
    "arcalist_chrome_map",
  ];

  if (userId) {
    keys.push(getWorkspaceStorageKey(userId));
    keys.push(`arcalist:settings:${userId}`);
    keys.push(`arcalist:sync:${userId}`);
    keys.push(`arcalist:plan:${userId}`);
  }

  await browserApi.storage.remove(keys);
}
