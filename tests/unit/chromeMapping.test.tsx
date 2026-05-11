import { describe, expect, it } from "vitest";
import { createChromeBookmarkMock } from "../mocks/chrome";

describe("chrome bookmark mock", () => {
  it("removes a folder tree recursively", async () => {
    const mock = createChromeBookmarkMock();
    mock.addFolder("folder-1", "Folder");
    mock.addBookmark("bm-1", "Example", "https://example.com", "folder-1");

    await mock.api.removeTree("folder-1");
    const subtree = await mock.api.getSubTree("folder-1");

    expect(subtree).toEqual([]);
  });
});