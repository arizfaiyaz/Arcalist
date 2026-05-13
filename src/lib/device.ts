import { browserApi } from "./browserApi";
import type { ArcalistDevice } from "../types/sync";

const DEVICE_STORAGE_KEY = "arcalist_device";

function getPlatformName() {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? navigator.platform ?? "";
  if (/win/i.test(platform)) return "Windows";
  if (/mac/i.test(platform)) return "macOS";
  if (/linux/i.test(platform)) return "Linux";
  if (/android/i.test(platform)) return "Android";
  if (/iphone|ipad|ios/i.test(platform)) return "iOS";
  return "this device";
}

function formatBrowserName(browser: ArcalistDevice["browser"]) {
  if (browser === "edge") return "Edge";
  if (browser === "brave") return "Brave";
  if (browser === "firefox") return "Firefox";
  if (browser === "chrome") return "Chrome";
  return "Browser";
}

function createDevice(): ArcalistDevice {
  const browser = browserApi.getBrowserName();
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    browser,
    name: `${formatBrowserName(browser)} on ${getPlatformName()}`,
    createdAt: now,
    lastSeenAt: now,
  };
}

export async function getDeviceInfo(): Promise<ArcalistDevice> {
  const result = await browserApi.storage.get<Record<string, ArcalistDevice | undefined>>(
    DEVICE_STORAGE_KEY,
  );
  const stored = result[DEVICE_STORAGE_KEY];
  if (stored?.id) return stored;

  const device = createDevice();
  await browserApi.storage.set({ [DEVICE_STORAGE_KEY]: device });
  return device;
}

export async function getOrCreateDeviceId(): Promise<string> {
  return (await getDeviceInfo()).id;
}

export async function updateDeviceLastSeen(): Promise<ArcalistDevice> {
  const current = await getDeviceInfo();
  const next: ArcalistDevice = {
    ...current,
    browser: current.browser ?? browserApi.getBrowserName(),
    lastSeenAt: new Date().toISOString(),
  };
  await browserApi.storage.set({ [DEVICE_STORAGE_KEY]: next });
  return next;
}
