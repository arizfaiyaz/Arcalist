import { act } from "react";
import type { User } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { useArcalistStore } from "../../src/store/useArcalistStore";
import { createBaseState } from "../utils/testState";
import * as storage from "../../src/lib/storage";

describe("startup hydration", () => {
  it("hydrates local state before background tasks", async () => {
    const base = createBaseState();
    const loadState = vi.fn(async () => base);
    vi.spyOn(storage, "loadState").mockImplementation(loadState);

    await act(async () => {
      await useArcalistStore
        .getState()
        .hydrateWorkspaceForUser({ id: "user-1" } as User);
    });

    const state = useArcalistStore.getState();
    expect(state.hydrated).toBe(true);
    expect(state.pages.length).toBe(1);
    expect(loadState).toHaveBeenCalledWith("user-1");
  });
});
