import type { BrowserName } from "../types/sync";

type RuntimeLike = {
  sendMessage?: (message: unknown) => Promise<unknown>;
  lastError?: { message?: string };
};

type StorageAreaLike = {
  get?: (keys: string | string[] | null) => Promise<Record<string, unknown>>;
  set?: (items: Record<string, unknown>) => Promise<void>;
  remove?: (keys: string | string[]) => Promise<void>;
};

type BrowserLike = {
  storage?: {
    local?: StorageAreaLike;
  };
  runtime?: RuntimeLike;
  tabs?: typeof chrome.tabs;
};

function getExtensionApi(): BrowserLike | null {
  const maybeBrowser = (globalThis as { browser?: BrowserLike }).browser;
  if (maybeBrowser?.storage?.local) return maybeBrowser;
  if (typeof chrome !== "undefined" && chrome?.storage?.local) return chrome;
  return null;
}

function readLocalStorage(keys: string | string[] | null): Record<string, unknown> {
  if (typeof localStorage === "undefined") return {};
  if (keys === null) {
    const out: Record<string, unknown> = {};
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;
      const raw = localStorage.getItem(key);
      try {
        out[key] = raw ? JSON.parse(raw) : raw;
      } catch {
        out[key] = raw;
      }
    }
    return out;
  }

  const keyList = Array.isArray(keys) ? keys : [keys];
  return keyList.reduce<Record<string, unknown>>((out, key) => {
    const raw = localStorage.getItem(key);
    if (raw === null) return out;
    try {
      out[key] = JSON.parse(raw);
    } catch {
      out[key] = raw;
    }
    return out;
  }, {});
}

function writeLocalStorage(items: Record<string, unknown>) {
  if (typeof localStorage === "undefined") return;
  for (const [key, value] of Object.entries(items)) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

function removeLocalStorage(keys: string | string[]) {
  if (typeof localStorage === "undefined") return;
  for (const key of Array.isArray(keys) ? keys : [keys]) {
    localStorage.removeItem(key);
  }
}

export const browserApi = {
  storage: {
    get: async <T = Record<string, unknown>>(
      keys: string | string[] | null,
    ): Promise<T> => {
      const api = getExtensionApi();
      if (api?.storage?.local?.get) {
        return (await api.storage.local.get(keys)) as T;
      }
      return readLocalStorage(keys) as T;
    },
    set: async (items: Record<string, unknown>) => {
      const api = getExtensionApi();
      if (api?.storage?.local?.set) {
        await api.storage.local.set(items);
        return;
      }
      writeLocalStorage(items);
    },
    remove: async (keys: string | string[]) => {
      const api = getExtensionApi();
      if (api?.storage?.local?.remove) {
        await api.storage.local.remove(keys);
        return;
      }
      removeLocalStorage(keys);
    },
  },
  runtime: {
    sendMessage: async <T = unknown>(message: unknown): Promise<T> => {
      const api = getExtensionApi();
      if (!api?.runtime?.sendMessage) return undefined as T;
      const response = await api.runtime.sendMessage(message);
      return response as T;
    },
  },
  tabs: () => getExtensionApi()?.tabs ?? null,
  getBrowserName: (): BrowserName => {
    const nav = navigator as Navigator & {
      userAgentData?: { brands?: Array<{ brand: string }> };
      brave?: unknown;
    };
    const brands = nav.userAgentData?.brands?.map((brand) => brand.brand).join(" ");
    const ua = `${brands ?? ""} ${navigator.userAgent}`;

    if (/Firefox/i.test(ua)) return "firefox";
    if (/Edg\//i.test(ua)) return "edge";
    if (/Brave/i.test(ua) || nav.brave) return "brave";
    if (/Chrome|Chromium/i.test(ua)) return "chrome";
    return "unknown";
  },
  isExtension: () => Boolean(getExtensionApi()?.runtime),
};
