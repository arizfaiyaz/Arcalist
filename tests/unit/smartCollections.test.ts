import { describe, expect, it } from "vitest";
import { buildDuplicateLinksCollection } from "../../src/lib/smartCollections";

describe("smart collections", () => {
  it("detects duplicate links after removing tracking parameters", () => {
    const duplicates = buildDuplicateLinksCollection([
      {
        bookmarkId: "a",
        boardId: "board-1",
        boardTitle: "Inbox",
        pageId: "page-1",
        pageTitle: "Home",
        bookmark: {
          id: "a",
          title: "One",
          url: "https://example.com/article?utm_source=newsletter",
        },
      },
      {
        bookmarkId: "b",
        boardId: "board-2",
        boardTitle: "Reading",
        pageId: "page-1",
        pageTitle: "Home",
        bookmark: {
          id: "b",
          title: "Two",
          url: "https://example.com/article",
        },
      },
    ]);

    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].bookmarks.map((bookmark) => bookmark.bookmarkId)).toEqual([
      "a",
      "b",
    ]);
  });
});
