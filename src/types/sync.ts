export type BrowserName = "chrome" | "edge" | "brave" | "firefox" | "unknown";

export type ArcalistDevice = {
  id: string;
  browser: BrowserName;
  name: string;
  createdAt: string;
  lastSeenAt: string;
};

export type SyncStatus =
  | "idle"
  | "syncing"
  | "synced"
  | "offline"
  | "error"
  | "conflict";

export type SyncMeta = {
  enabled: boolean;
  dirty: boolean;
  lastSyncedAt?: string;
  lastPulledAt?: string;
  lastPushedAt?: string;
  cloudVersion?: number;
  localVersion: number;
  localUpdatedAt?: string;
  status: SyncStatus;
  error?: string;
};

export type SyncPlanStatus = {
  isProUser: boolean;
  planName: "free" | "pro";
  updatedAt: string;
};

export type CloudWorkspaceRow = {
  state?: unknown;
  workspace?: unknown;
  version?: number | null;
  updated_at?: string | null;
  updated_by_device_id?: string | null;
};
