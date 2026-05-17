import { describe, expect, it } from "vitest";
import { getEffectiveTheme, getThemeById } from "../../src/config/themes";
import { applyTheme } from "../../src/lib/theme";
import {
  LAST_EFFECTIVE_THEME_CACHE_KEY,
  applyThemeByIdFromCache,
  cacheThemeSelection,
} from "../../src/lib/themeBootstrap";

describe("theme presets", () => {
  it("sets light-mode text variables for readability", () => {
    const theme = getThemeById("default-light");
    expect(theme).toBeDefined();
    applyTheme(theme!);

    const root = document.documentElement;
    expect(root.classList.contains("light")).toBe(true);
    expect(root.style.getPropertyValue("--arc-text-primary")).toBe("#0f172a");
    expect(root.style.getPropertyValue("--glass-border")).toBe(
      "var(--arc-glass-border)",
    );
  });

  it("sets glass variables for wallpaper themes", () => {
    const theme = getThemeById("eclipse");
    expect(theme).toBeDefined();
    applyTheme(theme!);

    const root = document.documentElement;
    expect(root.classList.contains("has-wallpaper")).toBe(true);
    expect(root.style.getPropertyValue("--arc-glass-blur")).toBe("18px");
    expect(root.style.getPropertyValue("--arc-wallpaper")).toBe(
      "url(/wallpapers/1.jpg)",
    );
  });

  it("falls back visually without deleting a saved pro theme", () => {
    const effectiveTheme = getEffectiveTheme("aurora-glass", false);

    expect(effectiveTheme.id).toBe("default-dark");
  });

  it("bootstraps the last effective theme before React renders", () => {
    localStorage.setItem(LAST_EFFECTIVE_THEME_CACHE_KEY, "eclipse");

    applyThemeByIdFromCache();

    const root = document.documentElement;
    expect(root.dataset.themeReady).toBe("true");
    expect(root.dataset.arcMode).toBe("dark");
    expect(root.classList.contains("has-wallpaper")).toBe(true);
    expect(root.style.getPropertyValue("--arc-accent")).toBe("#FAD02C");
  });

  it("caches the selected theme separately from the effective theme", () => {
    const effectiveTheme = getEffectiveTheme("aurora-glass", false);

    cacheThemeSelection("aurora-glass", effectiveTheme);

    expect(localStorage.getItem("arcalist:selectedThemeId")).toBe("aurora-glass");
    expect(localStorage.getItem(LAST_EFFECTIVE_THEME_CACHE_KEY)).toBe(
      "default-dark",
    );
  });
});
