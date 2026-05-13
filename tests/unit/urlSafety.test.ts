import { describe, expect, it } from "vitest";
import { normalizeSafeUrl } from "../../src/lib/urlSafety";

describe("URL safety", () => {
  it("allows http and https URLs, including localhost", () => {
    expect(normalizeSafeUrl("example.com")).toBe("https://example.com/");
    expect(normalizeSafeUrl("http://localhost:5173")).toBe(
      "http://localhost:5173/",
    );
  });

  it("blocks unsafe bookmark protocols", () => {
    expect(normalizeSafeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeSafeUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(normalizeSafeUrl("vbscript:msgbox(1)")).toBeNull();
    expect(normalizeSafeUrl("file:///etc/passwd")).toBeNull();
  });
});
