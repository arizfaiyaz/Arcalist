import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { useArcalistStore } from "../../src/store/useArcalistStore";
import { createBaseState } from "../utils/testState";

describe("bookmark deletion with Chrome sync", () => {
  it("removes Chrome bookmark when deleting from board", async () => {
    const base = createBaseState();
    act(() => useArcalistStore.setState({ ...base }));

    const removeSpy = vi.spyOn(chrome.bookmarks, "remove");

    act(() => {
      useArcalistStore.getState().trashBookmark("board-1", "bm-1");
    });

    expect(removeSpy).toHaveBeenCalledWith("chrome-bm-1");
  });
});