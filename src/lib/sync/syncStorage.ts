import { browserApi } from "../browserApi";
import {
  ACTIVE_USER_STORAGE_KEY,
  getWorkspaceStorageKey,
} from "../storage";
import { canonicalizeToHomeWorkspace } from "../chromeBookmarks";
import type { ArcalistState } from "../../types";
import type { SyncMeta, SyncPlanStatus } from "../../types/sync";

export const WORKSPACE_STORAGE_KEY = "arcalist_state";
export const SYNC_META_STORAGE_KEY = "arcalist_sync";
export const PLAN_STORAGE_KEY = "arcalist_plan";

const defaultSyncMeta = (): SyncMeta => ({
  enabled: false,
  dirty: false,
  localVersion: 0,
  status: "idle",
});

const defaultPlanStatus = (): SyncPlanStatus => ({
  isProUser: false,
  planName: "free",
  updatedAt: new Date().toISOString(),
});

export async function getSyncMeta(): Promise<SyncMeta> {
  const result = await browserApi.storage.get<Record<string, Partial<SyncMeta> | undefined>>(
    SYNC_META_STORAGE_KEY,
  );
  return {
    ...defaultSyncMeta(),
    ...result[SYNC_META_STORAGE_KEY],
  };
}

export async function setSyncMeta(meta: SyncMeta): Promise<void> {
  await browserApi.storage.set({ [SYNC_META_STORAGE_KEY]: meta });
}

export async function updateSyncMeta(
  updates: Partial<SyncMeta>,
): Promise<SyncMeta> {
  const next = {
    ...(await getSyncMeta()),
    ...updates,
  };
  await setSyncMeta(next);
  return next;
}

export async function markDirty(): Promise<SyncMeta> {
  const current = await getSyncMeta();
  return updateSyncMeta({
    dirty: true,
    localVersion: (current.localVersion ?? 0) + 1,
    localUpdatedAt: new Date().toISOString(),
    status: navigator.onLine ? "idle" : "offline",
    error: undefined,
  });
}

async function getActiveUserId(): Promise<string | null> {
  const result = await browserApi.storage.get<Record<string, string | undefined>>(
    ACTIVE_USER_STORAGE_KEY,
  );
  return result[ACTIVE_USER_STORAGE_KEY] ?? null;
}

export async function loadLocalWorkspace(): Promise<ArcalistState | null> {
  const userId = await getActiveUserId();
  if (!userId) return null;
  const key = getWorkspaceStorageKey(userId);
  const result = await browserApi.storage.get<Record<string, ArcalistState | undefined>>(key);
  return result[key] ? canonicalizeToHomeWorkspace(result[key]) : null;
}

export async function saveLocalWorkspace(state: ArcalistState): Promise<void> {
  const userId = await getActiveUserId();
  if (!userId) return;
  await browserApi.storage.set({
    [getWorkspaceStorageKey(userId)]: canonicalizeToHomeWorkspace(state),
  });
}

export async function createWorkspaceBackup(
  workspace: ArcalistState,
): Promise<string> {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T]/g, "_")
    .replace(/\.\d+Z$/, "");
  const key = `arcalist_backup_before_sync_${timestamp}`;
  await browserApi.storage.set({
    [key]: {
      workspace,
      createdAt: new Date().toISOString(),
      reason: "before_cross_browser_sync_overwrite",
    },
  });
  return key;
}

export async function getPlanStatus(): Promise<SyncPlanStatus> {
  const result = await browserApi.storage.get<Record<string, Partial<SyncPlanStatus> | undefined>>(
    PLAN_STORAGE_KEY,
  );
  const stored = result[PLAN_STORAGE_KEY];

  // This is a user-editable cache for background convenience only. It is not an
  // entitlement source; callers that write server resources must resolve plan
  // status from authenticated Supabase user_entitlements. It never promotes a
  // user to Pro.
  return {
    ...defaultPlanStatus(),
    updatedAt: stored?.updatedAt ?? new Date().toISOString(),
  };
}

export async function setPlanStatus(
  isProUser: boolean,
  planName: SyncPlanStatus["planName"],
): Promise<void> {
  // Cache only. Do not use this value as proof of Pro entitlement.
  await browserApi.storage.set({
    [PLAN_STORAGE_KEY]: {
      isProUser,
      planName,
      updatedAt: new Date().toISOString(),
    } satisfies SyncPlanStatus,
  });
}
