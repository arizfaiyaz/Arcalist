import { describe, expect, it } from "vitest";
import { getEffectiveTheme } from "../../src/config/themes";
import {
  customWallpaperToTheme,
  validateWallpaperFile,
} from "../../src/lib/customWallpapers";
import type { CustomWallpaper } from "../../src/types";

describe("custom wallpapers", () => {
  it("rejects unsafe or oversized wallpaper files", () => {
    const svg = new File(["<svg></svg>"], "unsafe.svg", {
      type: "image/svg+xml",
    });
    const largeJpeg = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.jpg", {
      type: "image/jpeg",
    });

    expect(validateWallpaperFile(svg)).toBe(
      "Please upload a JPG, PNG, or WebP image.",
    );
    expect(validateWallpaperFile(largeJpeg)).toBe(
      "Wallpaper must be under 2MB.",
    );
  });

  it("turns custom wallpaper metadata into a locked pro theme for free users", () => {
    const wallpaper: CustomWallpaper = {
      id: "cw_test",
      userId: "user-1",
      name: "Desk",
      storagePath: "user-1/cw_test.webp",
      publicUrl: "https://example.supabase.co/storage/v1/object/public/custom-wallpapers/user-1/cw_test.webp",
      createdAt: new Date().toISOString(),
      mode: "dark",
      accentColor: "#22d3ee",
    };

    const theme = customWallpaperToTheme(wallpaper);

    expect(theme.id).toBe("custom:cw_test");
    expect(theme.tier).toBe("pro");
    expect(getEffectiveTheme(theme.id, false, [theme]).id).toBe(
      "default-dark",
    );
    expect(getEffectiveTheme(theme.id, true, [theme]).id).toBe(
      "custom:cw_test",
    );
  });
});

