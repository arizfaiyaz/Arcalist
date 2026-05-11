import { act } from "react";
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
      await useArcalistStore.getState().initialize();
    });

    const state = useArcalistStore.getState();
    expect(state.hydrated).toBe(true);
    expect(state.pages.length).toBe(1);
  });
});