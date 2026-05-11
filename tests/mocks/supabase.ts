import { vi } from "vitest";

export function createSupabaseMock() {
  return {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
      setSession: vi.fn(async () => ({ data: { user: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
      signOut: vi.fn(async () => ({})),
    },
    from: vi.fn(() => ({
      upsert: vi.fn(async () => ({ error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({ data: null, error: null })),
        })),
      })),
    })),
  };
}