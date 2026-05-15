import { describe, expect, it } from "vitest";
import {
  buildSharedPageSnapshot,
  createPageShare,
} from "../../src/lib/sharing";
import type { Page } from "../../src/types";

describe("shared page snapshots", () => {
  const page: Page = {
    id: "page-1",
    title: "Public page",
    order: 0,
    boards: [
      {
        id: "board-1",
        title: "Links",
        order: 0,
        bookmarks: [
          {
            id: "safe",
            title: "Safe",
            url: "https://example.com",
            favicon: "javascript:alert(1)",
          },
          {
            id: "unsafe",
            title: "Unsafe",
            url: "javascript:alert(1)",
          },
        ],
      },
    ],
  };

  it("includes only the selected page and strips unsafe bookmark data", () => {
    const snapshot = buildSharedPageSnapshot(page);

    expect(snapshot.page.id).toBe("page-1");
    expect(snapshot.boards).toHaveLength(1);
    expect(snapshot.boards[0].bookmarks).toHaveLength(1);
    expect(snapshot.boards[0].bookmarks[0]).toMatchObject({
      id: "safe",
      url: "https://example.com/",
      favicon: undefined,
    });
  });

  it("rejects direct share creation for free users", async () => {
    await expect(
      createPageShare({ userId: "user-1", page, isProUser: false }),
    ).rejects.toThrow("Page sharing is available with Arcalist Pro.");
  });
});
