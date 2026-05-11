import "@testing-library/jest-dom";

import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "../mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const storage = new Map<string, string>();

Object.defineProperty(window, "localStorage", {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, String(value));
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => storage.clear(),
  },
});

const chromeStorage = new Map<string, unknown>();

globalThis.chrome = {
  storage: {
    local: {
      get: async (key: string | string[]) => {
        if (Array.isArray(key)) {
          const result: Record<string, unknown> = {};
          for (const k of key) result[k] = chromeStorage.get(k);
          return result;
        }
        return { [key]: chromeStorage.get(key) };
      },
      set: async (items: Record<string, unknown>) => {
        for (const [k, v] of Object.entries(items)) {
          chromeStorage.set(k, v);
        }
      },
      remove: async (key: string) => {
        chromeStorage.delete(key);
      },
    },
  },
  bookmarks: {
    getTree: async () => [{ id: "0", title: "root", children: [] }],
    getChildren: async () => [],
    getSubTree: async () => [],
    create: async (node: { parentId?: string; title: string; url?: string }) => ({
      id: `${Date.now()}`,
      parentId: node.parentId ?? "1",
      title: node.title,
      url: node.url,
    }),
    remove: async () => {},
    removeTree: async () => {},
  },
  runtime: {
    id: "test-extension",
    onMessage: {
      addListener: () => {},
      removeListener: () => {},
    },
    sendMessage: async () => {},
    lastError: undefined,
  },
  identity: {
    launchWebAuthFlow: (_: { url: string; interactive: boolean }, cb: (url?: string) => void) => cb(undefined),
  },
  windows: {
    create: () => {},
  },
  alarms: {
    create: () => {},
    onAlarm: { addListener: () => {} },
  },
} as unknown as typeof chrome;