import { describe, expect, it } from "vitest";
import { getDomainFromUrl, isTrackableUrl } from "../../src/lib/domain";

describe("analytics domain parsing", () => {
  it("tracks only domain-level http and https URLs", () => {
    expect(getDomainFromUrl("https://www.example.com/a/private/path")).toBe(
      "example.com",
    );
    expect(getDomainFromUrl("http://localhost:5173/app")).toBe("localhost");
  });

  it("does not track browser, extension, file, or unsafe pages", () => {
    expect(isTrackableUrl("chrome://extensions")).toBe(false);
    expect(isTrackableUrl("chrome-extension://abc/newtab.html")).toBe(false);
    expect(isTrackableUrl("file:///Users/me/private.txt")).toBe(false);
    expect(isTrackableUrl("about:blank")).toBe(false);
    expect(isTrackableUrl("javascript:alert(1)")).toBe(false);
  });
});
