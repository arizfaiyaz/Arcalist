import { describe, expect, it } from "vitest";
import {
  resolveConflict,
  willOverwriteLocal,
} from "../../src/lib/sync/conflictResolution";
import { createBaseState } from "../utils/testState";

describe("sync conflict resolution", () => {
  it("preserves local and cloud-only bookmarks instead of overwriting one side", () => {
    const local = createBaseState({ updatedAt: 2000 });
    const cloud = createBaseState({
      updatedAt: 1000,
      pages: [
        {
          id: "page-1",
          title: "Home",
          order: 0,
          boards: [
            {
              id: "board-1",
              title: "Inbox",
              order: 0,
              bookmarks: [
                {
                  id: "cloud-only",
                  title: "Cloud",
                  url: "https://cloud.example",
                  favicon: "",
                },
              ],
            },
          ],
        },
      ],
    });

    const resolved = resolveConflict(local, cloud);
    const bookmarks = resolved.pages[0].boards[0].bookmarks;

    expect(bookmarks.map((bookmark) => bookmark.id)).toEqual(
      expect.arrayContaining(["bm-1", "cloud-only"]),
    );
    expect(willOverwriteLocal(local, resolved)).toBe(true);
  });
});
