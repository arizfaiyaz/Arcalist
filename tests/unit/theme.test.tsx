import { describe, expect, it } from "vitest";
import { getEffectiveTheme, getThemeById } from "../../src/config/themes";
import { applyTheme } from "../../src/lib/theme";

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
});

