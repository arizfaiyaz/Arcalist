import { useCallback, useEffect, useState } from "react";
import { useArcalistStore } from "../store/useArcalistStore";
import { getDeviceInfo } from "../lib/device";
import { syncNow } from "../lib/sync";
import { canonicalizeToHomeWorkspace } from "../lib/chromeBookmarks";
import {
  getSyncMeta,
  setPlanStatus,
  updateSyncMeta,
} from "../lib/sync/syncStorage";
import { usePlanLimits } from "./usePlanLimits";
import { canUseCloudSync } from "../lib/planLimits";
import type { ArcalistDevice, SyncMeta } from "../types/sync";

export function useCrossBrowserSync() {
  const user = useArcalistStore((state) => state.user);
  const { isProUser, planName } = usePlanLimits();
  const cloudSyncAllowed = canUseCloudSync(isProUser);
  const [meta, setMeta] = useState<SyncMeta | null>(null);
  const [device, setDevice] = useState<ArcalistDevice | null>(null);

  const refresh = useCallback(async () => {
    try {
      const nextMeta = await getSyncMeta();
      setMeta(nextMeta);
      try {
        setDevice(await getDeviceInfo());
      } catch {
        setDevice(null);
      }
    } catch {
      setMeta({
        enabled: false,
        dirty: false,
        localVersion: 0,
        status: "error",
        error: "Sync settings could not be loaded.",
      });
      setDevice(null);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    void setPlanStatus(isProUser, planName).catch(() => {});
  }, [isProUser, planName]);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      if (!cloudSyncAllowed) return false;
      await updateSyncMeta({
        enabled,
        status: enabled ? "syncing" : "idle",
        error: undefined,
      });
      if (enabled && user) {
        const synced = await syncNow(user.id, getCurrentWorkspace(), cloudSyncAllowed);
        if (synced) {
          useArcalistStore.setState({
            ...canonicalizeToHomeWorkspace(synced),
            syncStatus: "synced",
          });
        }
      }
      await refresh();
      return true;
    },
    [cloudSyncAllowed, refresh, user],
  );

  const manualSync = useCallback(async () => {
    if (!user || !cloudSyncAllowed) return null;
    const synced = await syncNow(user.id, getCurrentWorkspace(), cloudSyncAllowed);
    if (synced) {
      const nextMeta = await getSyncMeta();
      useArcalistStore.setState({
        ...canonicalizeToHomeWorkspace(synced),
        syncStatus: nextMeta.status === "conflict" ? "conflict" : "synced",
      });
    }
    await refresh();
    return synced;
  }, [cloudSyncAllowed, refresh, user]);

  return {
    device,
    isProUser,
    meta,
    planName,
    refresh,
    setEnabled,
    manualSync,
  };
}

function getCurrentWorkspace() {
  const state = useArcalistStore.getState();
  return {
    pages: state.pages,
    activePageId: state.activePageId,
    trash: state.trash,
    overflowBoards: state.overflowBoards,
    privacyMode: state.privacyMode,
    settings: state.settings,
    wallpaperTheme: state.wallpaperTheme,
    updatedAt: state.updatedAt,
  };
}
