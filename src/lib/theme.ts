import type { WallpaperTheme } from "../types";

export function applyTheme(wallpaper: WallpaperTheme) {
  const root = document.documentElement;

  // ── Base dark / light colours ─────────────────────────────
  if (wallpaper.isDark) {
    root.style.setProperty("--color-background", "#1a1d24");
    root.style.setProperty("--text-primary", "#e2e8f0");
    root.style.setProperty("--text-secondary", "#94a3b8");
    root.classList.remove("light");
    root.classList.add("dark");
  } else {
    root.style.setProperty("--color-background", "#f0f2f5");
    root.style.setProperty("--text-primary", "#1a1d24");
    root.style.setProperty("--text-secondary", "#4b5563");
    root.classList.remove("dark");
    root.classList.add("light");
  }

  // ── Accent colour ─────────────────────────────────────────
  root.style.setProperty("--color-accent", wallpaper.accentColor);
  root.style.setProperty("--color-accent-hover", wallpaper.accentColor + "cc");

  // ── Background image + glassy surfaces ───────────────────
  if (wallpaper.url) {
    document.body.style.backgroundImage = `url(${wallpaper.url})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";

    // Translucent surfaces so the wallpaper shows through
    if (wallpaper.isDark) {
      // Slightly more opaque so boards are readable without losing the glass feel
      root.style.setProperty("--color-surface", "rgba(22, 26, 34, 0.72)");
      root.style.setProperty("--color-surface-2", "rgba(30, 35, 45, 0.68)");
    } else {
      root.style.setProperty("--color-surface", "rgba(255, 255, 255, 0.62)");
      root.style.setProperty("--color-surface-2", "rgba(240, 242, 245, 0.55)");
    }

    // Class used in index.css to add backdrop-filter blur on all surfaces
    root.classList.add("has-wallpaper");
  } else {
    // No wallpaper — restore solid surfaces
    document.body.style.backgroundImage = "";
    document.body.style.backgroundSize = "";
    document.body.style.backgroundPosition = "";
    document.body.style.backgroundAttachment = "";

    if (wallpaper.isDark) {
      root.style.setProperty("--color-surface", "#22262f");
      root.style.setProperty("--color-surface-2", "#2a2f3a");
    } else {
      root.style.setProperty("--color-surface", "#ffffff");
      root.style.setProperty("--color-surface-2", "#e8eaed");
    }

    root.classList.remove("has-wallpaper");
  }
}
