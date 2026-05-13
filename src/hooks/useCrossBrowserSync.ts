import { useCallback, useEffect, useState } from "react";
import { useArcalistStore } from "../store/useArcalistStore";
import { getDeviceInfo } from "../lib/device";
import { syncNow } from "../lib/sync";
import {
  getSyncMeta,
  setPlanStatus,
  updateSyncMeta,
} from "../lib/sync/syncStorage";
import { usePlanLimits } from "./usePlanLimits";
import type { ArcalistDevice, SyncMeta } from "../types/sync";

export function useCrossBrowserSync() {
  const user = useArcalistStore((state) => state.user);
  const { isProUser, planName } = usePlanLimits(user);
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
      if (!isProUser) return false;
      await updateSyncMeta({
        enabled,
        status: enabled ? "syncing" : "idle",
        error: undefined,
      });
      if (enabled && user) {
        const synced = await syncNow(user.id, getCurrentWorkspace());
        if (synced) {
          useArcalistStore.setState({ ...synced, syncStatus: "synced" });
        }
      }
      await refresh();
      return true;
    },
    [isProUser, refresh, user],
  );

  const manualSync = useCallback(async () => {
    if (!user || !isProUser) return null;
    const synced = await syncNow(user.id, getCurrentWorkspace());
    if (synced) {
      const nextMeta = await getSyncMeta();
      useArcalistStore.setState({
        ...synced,
        syncStatus: nextMeta.status === "conflict" ? "conflict" : "synced",
      });
    }
    await refresh();
    return synced;
  }, [isProUser, refresh, user]);

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
