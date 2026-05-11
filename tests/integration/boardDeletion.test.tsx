import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { useArcalistStore } from "../../src/store/useArcalistStore";
import { createBaseState } from "../utils/testState";

describe("board deletion with Chrome sync", () => {
  it("removes Chrome folder tree when deleting board", () => {
    const base = createBaseState();
    act(() => useArcalistStore.setState({ ...base }));

    const removeTreeSpy = vi.spyOn(chrome.bookmarks, "removeTree");

    act(() => {
      useArcalistStore.getState().deleteBoard("page-1", "board-1");
    });

    expect(removeTreeSpy).toHaveBeenCalledWith("chrome-folder-1");
  });
});