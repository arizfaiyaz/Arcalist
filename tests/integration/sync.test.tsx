import { act } from "react";
import type { User } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { useArcalistStore } from "../../src/store/useArcalistStore";
import { createBaseState } from "../utils/testState";

describe("Supabase sync", () => {
  it("pushes updates to cloud on persist", async () => {
    const base = createBaseState();
    act(() =>
      useArcalistStore.setState({
        ...base,
        user: { id: "test-user" } as User,
      }),
    );

    const push = vi.fn(async () => {});
    const sync = await import("../../src/lib/sync");
    vi.spyOn(sync, "pushToCloud").mockImplementation(push);

    act(() => {
      useArcalistStore.getState().addBookmark("board-1", {
        title: "New",
        url: "https://new.example",
        favicon: "",
      });
    });

    expect(push).toHaveBeenCalled();
  });
});
