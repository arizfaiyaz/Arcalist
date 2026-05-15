import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseState = vi.hoisted(() => ({
  user: null as { id: string } | null,
  row: null as { plan: string; status: string; source: string | null } | null,
  error: null as { message: string } | null,
}));

vi.mock("../../src/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: supabaseState.user },
        error: null,
      })),
      getSession: vi.fn(async () => ({
        data: {
          session: supabaseState.user ? { user: supabaseState.user } : null,
        },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: supabaseState.row,
            error: supabaseState.error,
          })),
        })),
      })),
    })),
  },
}));

describe("entitlements", () => {
  beforeEach(() => {
    supabaseState.user = null;
    supabaseState.row = null;
    supabaseState.error = null;
  });

  it("treats no logged-in user as free", async () => {
    const { getCurrentUserEntitlement, isProEntitlement } = await import(
      "../../src/lib/entitlements"
    );

    const entitlement = await getCurrentUserEntitlement();

    expect(entitlement).toBeNull();
    expect(isProEntitlement(entitlement)).toBe(false);
  });

  it("treats a logged-in user with no entitlement row as free", async () => {
    supabaseState.user = { id: "user-1" };
    const { getCurrentUserEntitlement, isProEntitlement } = await import(
      "../../src/lib/entitlements"
    );

    const entitlement = await getCurrentUserEntitlement();

    expect(entitlement).toBeNull();
    expect(isProEntitlement(entitlement)).toBe(false);
  });

  it("treats pro active entitlement as pro", async () => {
    supabaseState.user = { id: "user-1" };
    supabaseState.row = { plan: "pro", status: "active", source: "manual" };
    const { getCurrentUserEntitlement, isProEntitlement } = await import(
      "../../src/lib/entitlements"
    );

    const entitlement = await getCurrentUserEntitlement();

    expect(isProEntitlement(entitlement)).toBe(true);
  });

  it("treats inactive pro entitlement as free", async () => {
    supabaseState.row = { plan: "pro", status: "cancelled", source: "manual" };
    const { isProEntitlement } = await import("../../src/lib/entitlements");

    expect(isProEntitlement(supabaseState.row)).toBe(false);
  });

  it("treats entitlement fetch errors as free", async () => {
    supabaseState.user = { id: "user-1" };
    supabaseState.error = { message: "network unavailable" };
    const { getCurrentUserEntitlement, isProEntitlement } = await import(
      "../../src/lib/entitlements"
    );

    const entitlement = await getCurrentUserEntitlement();

    expect(entitlement).toBeNull();
    expect(isProEntitlement(entitlement)).toBe(false);
  });
});
