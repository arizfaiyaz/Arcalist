import { describe, expect, it } from "vitest";
import { useArcalistStore } from "../../src/store/useArcalistStore";

describe("startup performance", () => {
  it("initializes under 500ms for local state", async () => {
    const start = performance.now();
    await useArcalistStore.getState().initialize();
    const end = performance.now();

    expect(end - start).toBeLessThan(500);
  });
});