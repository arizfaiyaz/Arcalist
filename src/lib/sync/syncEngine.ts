import { supabase } from "../supabase";
import { resolveAuthenticatedPlanStatus } from "../plan";
import { canonicalizeToHomeWorkspace } from "../chromeBookmarks";
import { getDeviceInfo, updateDeviceLastSeen } from "../device";
import type { ArcalistState } from "../../types";
import type { ArcalistDevice, CloudWorkspaceRow } from "../../types/sync";
import {
  createWorkspaceBackup,
  getSyncMeta,
  loadLocalWorkspace,
  saveLocalWorkspace,
  updateSyncMeta,
} from "./syncStorage";
import {
  resolveConflict as resolveWorkspaceConflict,
  willOverwriteLocal,
  workspaceTimestamp,
} from "./conflictResolution";

const WORKSPACE_TABLE = "arcalist_workspaces";
const DEVICE_TABLE = "sync_devices";

type CloudWorkspace = {
  workspace: ArcalistState;
  version: number;
  updatedAt?: string;
  updatedByDeviceId?: string;
};

function isMissingRow(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST116" ||
    /0 rows|no rows|multiple \(or no\) rows/i.test(error.message ?? "")
  );
}

function getRowWorkspace(row: CloudWorkspaceRow | null): ArcalistState | null {
  if (!row) return null;
  return (row.workspace ?? row.state ?? null) as ArcalistState | null;
}

async function registerDevice(userId: string, device: ArcalistDevice) {
  // TODO: Frontend gating is not enough. This must also be protected by RLS,
  // RPC, or Edge Function entitlement checks before production.
  const { error } = await supabase.from(DEVICE_TABLE).upsert(
    {
      user_id: userId,
      device_id: device.id,
      browser: device.browser,
      device_name: device.name,
      last_seen_at: device.lastSeenAt,
    },
    { onConflict: "user_id,device_id" },
  );

  if (error) {
    console.warn("[Arcalist] Device sync metadata skipped:", error.message);
  }
}

async function getUserId(userId?: string) {
  if (userId) return userId;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

async function canUseCloudSync(userId: string, isProUser: boolean) {
  if (!userId || !isProUser) return false;
  return (await resolveAuthenticatedPlanStatus(userId)).isProUser;
}

export async function pullFromCloud(
  userId: string,
): Promise<ArcalistState | null> {
  const { data, error } = await supabase
    .from(WORKSPACE_TABLE)
    .select("state, workspace, version, updated_at, updated_by_device_id")
    .eq("user_id", userId)
    .single();

  if (isMissingRow(error)) return null;
  if (error) throw error;

  const row = data as CloudWorkspaceRow | null;
  const workspace = getRowWorkspace(row);
  if (!workspace) return null;

  await updateSyncMeta({
    cloudVersion: row?.version ?? undefined,
    lastPulledAt: new Date().toISOString(),
  });

  return canonicalizeToHomeWorkspace(workspace);
}

async function pullCloudWorkspace(userId: string): Promise<CloudWorkspace | null> {
  const { data, error } = await supabase
    .from(WORKSPACE_TABLE)
    .select("state, workspace, version, updated_at, updated_by_device_id")
    .eq("user_id", userId)
    .single();

  if (isMissingRow(error)) return null;
  if (error) throw error;

  const row = data as CloudWorkspaceRow | null;
  const workspace = getRowWorkspace(row);
  if (!workspace) return null;

  return {
    workspace: canonicalizeToHomeWorkspace(workspace),
    version: row?.version ?? 1,
    updatedAt: row?.updated_at ?? undefined,
    updatedByDeviceId: row?.updated_by_device_id ?? undefined,
  };
}

export async function pushToCloud(
  userId: string,
  workspace: ArcalistState,
  isProUser = false,
): Promise<void> {
  if (!(await canUseCloudSync(userId, isProUser))) {
    await updateSyncMeta({
      enabled: false,
      status: "idle",
      error: undefined,
    });
    return;
  }

  const device = await updateDeviceLastSeen();
  await registerDevice(userId, device);

  const meta = await getSyncMeta();
  const nextVersion = Math.max(meta.cloudVersion ?? 0, meta.localVersion ?? 0) + 1;
  const updatedAt = new Date().toISOString();
  const canonicalWorkspace = canonicalizeToHomeWorkspace(workspace);

  // TODO: Frontend gating is not enough. This must also be protected by RLS,
  // RPC, or Edge Function entitlement checks before production.
  const { error } = await supabase.from(WORKSPACE_TABLE).upsert(
    {
      user_id: userId,
      state: canonicalWorkspace,
      version: nextVersion,
      updated_at: updatedAt,
      updated_by_device_id: device.id,
    },
    {
      onConflict: "user_id",
    },
  );

  if (error) {
    // TODO: Frontend gating is not enough. This must also be protected by RLS,
    // RPC, or Edge Function entitlement checks before production.
    const fallback = await supabase.from(WORKSPACE_TABLE).upsert(
      {
        user_id: userId,
        state: canonicalWorkspace,
        updated_at: updatedAt,
      },
      {
        onConflict: "user_id",
      },
    );
    if (fallback.error) throw fallback.error;
  }

  await updateSyncMeta({
    dirty: false,
    cloudVersion: nextVersion,
    lastPushedAt: updatedAt,
    lastSyncedAt: updatedAt,
    status: "synced",
    error: undefined,
  });
}

export function resolveConflict(
  localWorkspace: ArcalistState,
  cloudWorkspace: ArcalistState,
): ArcalistState {
  return canonicalizeToHomeWorkspace(
    resolveWorkspaceConflict(localWorkspace, cloudWorkspace),
  );
}

export async function syncNow(
  userIdArg?: string,
  currentWorkspace?: ArcalistState,
  isProUser = false,
): Promise<ArcalistState | null> {
  if (!isProUser) {
    await updateSyncMeta({
      enabled: false,
      status: "idle",
      error: undefined,
    });
    return currentWorkspace ?? (await loadLocalWorkspace());
  }

  if (!navigator.onLine) {
    await updateSyncMeta({ status: "offline" });
    return currentWorkspace ?? (await loadLocalWorkspace());
  }

  const userId = await getUserId(userIdArg);
  if (!userId) return currentWorkspace ?? (await loadLocalWorkspace());
  if (!(await canUseCloudSync(userId, isProUser))) {
    await updateSyncMeta({
      enabled: false,
      status: "idle",
      error: undefined,
    });
    return currentWorkspace ?? (await loadLocalWorkspace());
  }

  const meta = await getSyncMeta();
  if (!meta.enabled) {
    await updateSyncMeta({ status: "idle" });
    return currentWorkspace ?? (await loadLocalWorkspace());
  }

  const device = await getDeviceInfo();
  await updateSyncMeta({ status: "syncing", error: undefined });

  try {
    const localWorkspace = currentWorkspace
      ? canonicalizeToHomeWorkspace(currentWorkspace)
      : await loadLocalWorkspace();
    if (!localWorkspace) {
      await updateSyncMeta({ status: "idle" });
      return null;
    }

    const cloud = await pullCloudWorkspace(userId);
    if (!cloud) {
      await pushToCloud(userId, localWorkspace, true);
      return localWorkspace;
    }

    const cloudChangedElsewhere = cloud.updatedByDeviceId !== device.id;
    const localChanged =
      meta.dirty ||
      workspaceTimestamp(localWorkspace) > workspaceTimestamp(cloud.workspace);
    const resolved = canonicalizeToHomeWorkspace(
      resolveWorkspaceConflict(localWorkspace, cloud.workspace),
    );

    if (willOverwriteLocal(localWorkspace, resolved)) {
      await createWorkspaceBackup(localWorkspace);
      await saveLocalWorkspace(resolved);
      await pushToCloud(userId, resolved, true);
      await updateSyncMeta({
        dirty: false,
        lastPulledAt: new Date().toISOString(),
        lastSyncedAt: new Date().toISOString(),
        status: localChanged && cloudChangedElsewhere ? "conflict" : "synced",
        error: undefined,
      });
      return resolved;
    }

    if (meta.dirty || workspaceTimestamp(localWorkspace) >= workspaceTimestamp(cloud.workspace)) {
      await pushToCloud(userId, localWorkspace, true);
      return localWorkspace;
    }

    await updateSyncMeta({
      dirty: false,
      cloudVersion: cloud.version,
      lastSyncedAt: new Date().toISOString(),
      status: "synced",
      error: undefined,
    });
    return localWorkspace;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateSyncMeta({ status: "error", error: message });
    throw error;
  }
}

export async function markDirty() {
  const storage = await import("./syncStorage");
  return storage.markDirty();
}
