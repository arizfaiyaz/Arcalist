import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { useArcalistStore } from "../../src/store/useArcalistStore";
import { createBaseState } from "../utils/testState";

describe("trash behavior", () => {
  it("moves bookmark to trash and marks isTrashed", () => {
    const base = createBaseState();
    act(() => useArcalistStore.setState({ ...base }));

    act(() => {
      useArcalistStore.getState().trashBookmark("board-1", "bm-1");
    });

    const state = useArcalistStore.getState();
    expect(state.trash).toHaveLength(1);
    expect(state.trash[0].bookmark.isTrashed).toBe(true);
  });

  it("removes expired trash on cleanup", () => {
    const base = createBaseState({
      trash: [
        {
          bookmark: {
            id: "bm-old",
            title: "Old",
            url: "https://old.test",
            favicon: "",
            createdAt: Date.now() - 1000,
            isTrashed: true,
          },
          deletedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
          fromBoardTitle: "Inbox",
          fromPageTitle: "Home",
          fromBoardId: "board-1",
        },
      ],
    });
    act(() => useArcalistStore.setState({ ...base }));

    act(() => {
      useArcalistStore.getState().cleanupTrash();
    });

    expect(useArcalistStore.getState().trash).toHaveLength(0);
  });

  it("restores bookmark into a valid board and recreates chrome bookmark", async () => {
    const base = createBaseState({
      trash: [
        {
          bookmark: {
            id: "bm-restore",
            title: "Restore",
            url: "https://restore.test",
            favicon: "",
            createdAt: Date.now(),
            isTrashed: true,
          },
          deletedAt: Date.now(),
          fromBoardTitle: "Inbox",
          fromPageTitle: "Home",
          fromBoardId: "board-1",
          fromPageId: "page-1",
        },
      ],
    });
    act(() => useArcalistStore.setState({ ...base }));

    const createSpy = vi.spyOn(chrome.bookmarks, "create");

    act(() => {
      useArcalistStore.getState().restoreBookmark("bm-restore");
    });

    expect(useArcalistStore.getState().trash).toHaveLength(0);
    expect(createSpy).toHaveBeenCalled();
  });
});