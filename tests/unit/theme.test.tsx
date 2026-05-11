import { describe, expect, it } from "vitest";
import { applyTheme } from "../../src/lib/theme";

describe("applyTheme", () => {
  it("sets light-mode text variables for readability", () => {
    applyTheme({
      id: "default-light",
      name: "Default Light",
      url: null,
      isDark: false,
      accentColor: "#7C3AED",
      tone: "light",
    });

    const root = document.documentElement;
    expect(root.classList.contains("light")).toBe(true);
    expect(root.style.getPropertyValue("--text-primary")).toBe("#0f172a");
    expect(root.style.getPropertyValue("--glass-border")).toBe(
      "rgba(15, 23, 42, 0.1)",
    );
  });

  it("sets glass variables for wallpaper themes", () => {
    applyTheme({
      id: "eclipse",
      name: "Eclipse",
      url: "/wallpapers/1.jpg",
      isDark: true,
      accentColor: "#FAD02C",
      tone: "dark",
    });

    const root = document.documentElement;
    expect(root.classList.contains("has-wallpaper")).toBe(true);
    expect(root.style.getPropertyValue("--glass-blur")).toBe("18px");
  });
});