import type { WallpaperTheme } from "../types";

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return `rgba(0, 0, 0, ${alpha})`;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function applyTheme(wallpaper: WallpaperTheme) {
  const root = document.documentElement;
  const tone = wallpaper.tone ?? (wallpaper.isDark ? "dark" : "light");

  // ── Base dark / light colours ─────────────────────────────
  if (wallpaper.isDark) {
    root.style.setProperty("--color-background", "#1a1d24");
    root.style.setProperty("--text-primary", "#e2e8f0");
    root.style.setProperty("--text-secondary", "#94a3b8");
    root.style.setProperty("--text-muted", "#64748b");
    root.style.setProperty("--text-subtle", "#94a3b8");
    root.classList.remove("light");
    root.classList.add("dark");
  } else {
    root.style.setProperty("--color-background", "#f5f6f9");
    root.style.setProperty("--text-primary", "#0f172a");
    root.style.setProperty("--text-secondary", "#334155");
    root.style.setProperty("--text-muted", "#475569");
    root.style.setProperty("--text-subtle", "#64748b");
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

    const tint =
      tone === "colorful"
        ? hexToRgba(wallpaper.accentColor, wallpaper.isDark ? 0.18 : 0.12)
        : "rgba(255, 255, 255, 0)";

    if (wallpaper.isDark) {
      root.style.setProperty("--color-surface", "rgba(28, 34, 44, 0.62)");
      root.style.setProperty("--color-surface-2", "rgba(34, 41, 54, 0.56)");
      root.style.setProperty(
        "--glass-surface",
        `linear-gradient(180deg, ${tint}, rgba(255, 255, 255, 0.02)), rgba(28, 34, 44, 0.62)`,
      );
      root.style.setProperty(
        "--glass-surface-2",
        `linear-gradient(180deg, ${tint}, rgba(255, 255, 255, 0.02)), rgba(34, 41, 54, 0.56)`,
      );
      root.style.setProperty("--glass-surface-50", "rgba(24, 30, 40, 0.58)");
      root.style.setProperty("--glass-surface-80", "rgba(24, 30, 40, 0.78)");
      root.style.setProperty("--glass-border", "rgba(255, 255, 255, 0.10)");
      root.style.setProperty("--glass-border-strong", "rgba(255, 255, 255, 0.18)");
      root.style.setProperty(
        "--glass-shadow",
        "0 18px 40px rgba(0, 0, 0, 0.45)",
      );
      root.style.setProperty("--wallpaper-overlay", "linear-gradient(180deg, rgba(6, 10, 16, 0.35), rgba(6, 10, 16, 0.6))");
      root.style.setProperty("--glass-blur", "18px");
    } else {
      root.style.setProperty("--color-surface", "rgba(243, 246, 250, 0.9)");
      root.style.setProperty("--color-surface-2", "rgba(233, 237, 242, 0.82)");
      root.style.setProperty(
        "--glass-surface",
        `linear-gradient(180deg, ${tint}, rgba(255, 255, 255, 0.75)), rgba(243, 246, 250, 0.9)`,
      );
      root.style.setProperty(
        "--glass-surface-2",
        `linear-gradient(180deg, ${tint}, rgba(255, 255, 255, 0.7)), rgba(233, 237, 242, 0.82)`,
      );
      root.style.setProperty("--glass-surface-50", "rgba(242, 245, 248, 0.75)");
      root.style.setProperty("--glass-surface-80", "rgba(238, 242, 247, 0.9)");
      root.style.setProperty("--glass-border", "rgba(15, 23, 42, 0.12)");
      root.style.setProperty("--glass-border-strong", "rgba(15, 23, 42, 0.2)");
      root.style.setProperty(
        "--glass-shadow",
        "0 18px 40px rgba(15, 23, 42, 0.18)",
      );
      root.style.setProperty("--wallpaper-overlay", "linear-gradient(180deg, rgba(255, 255, 255, 0.65), rgba(255, 255, 255, 0.35))");
      root.style.setProperty("--glass-blur", "22px");
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
      root.style.setProperty("--glass-border", "rgba(255, 255, 255, 0.08)");
      root.style.setProperty("--glass-border-strong", "rgba(255, 255, 255, 0.14)");
      root.style.setProperty("--glass-shadow", "0 18px 40px rgba(0, 0, 0, 0.4)");
    } else {
      root.style.setProperty("--color-surface", "#ffffff");
      root.style.setProperty("--color-surface-2", "#eef0f3");
      root.style.setProperty("--glass-border", "rgba(15, 23, 42, 0.1)");
      root.style.setProperty("--glass-border-strong", "rgba(15, 23, 42, 0.18)");
      root.style.setProperty("--glass-shadow", "0 18px 40px rgba(15, 23, 42, 0.16)");
    }

    root.style.setProperty("--glass-surface", "var(--color-surface)");
    root.style.setProperty("--glass-surface-2", "var(--color-surface-2)");
    root.style.setProperty("--glass-surface-50", "var(--color-surface)");
    root.style.setProperty("--glass-surface-80", "var(--color-surface)");
    root.style.setProperty("--wallpaper-overlay", "none");
    root.style.setProperty("--glass-blur", "0px");

    root.classList.remove("has-wallpaper");
  }
}
