import type { ArcalistTheme } from "../config/themes";

const withFallback = (value: string | undefined, fallback: string) =>
  value && value.length > 0 ? value : fallback;

const getReadableAccentText = (hex: string) => {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return "#0f172a";

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  return luminance > 0.58 ? "#0f172a" : "#ffffff";
};

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return `rgba(0, 210, 133, ${alpha})`;

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export function applyTheme(theme: ArcalistTheme) {
  const root = document.documentElement;
  const wallpaper = theme.wallpaper.trim();
  const glassBlur = withFallback(theme.glassBlur, "22px");
  const glassShadow = withFallback(
    theme.glassShadow,
    "0 20px 60px rgba(0, 0, 0, 0.35)",
  );
  const navBackground = withFallback(theme.navBackground, theme.glassBackground);
  const modalBackground = withFallback(
    theme.modalBackground,
    theme.glassBackground,
  );
  const buttonBackground = withFallback(
    theme.buttonBackground,
    theme.glassBackground,
  );
  const buttonText = withFallback(theme.buttonText, theme.textPrimary);
  const overlay = withFallback(theme.overlay, "rgba(0,0,0,0.25)");
  const accentSoft = hexToRgba(theme.accentColor, 0.12);
  const accentActive = hexToRgba(theme.accentColor, 0.20);
  const surfaceStrong =
    theme.mode === "dark"
      ? `linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04)), ${modalBackground}`
      : `linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.76)), ${modalBackground}`;
  const buttonHover = `linear-gradient(0deg, ${accentSoft}, ${accentSoft}), ${buttonBackground}`;
  const buttonActive = `linear-gradient(0deg, ${accentActive}, ${accentActive}), ${buttonBackground}`;

  root.classList.toggle("dark", theme.mode === "dark");
  root.classList.toggle("light", theme.mode === "light");
  root.classList.toggle("has-wallpaper", wallpaper.length > 0);

  root.style.setProperty("--arc-wallpaper", wallpaper ? `url(${wallpaper})` : "none");
  root.style.setProperty("--arc-accent", theme.accentColor);
  root.style.setProperty(
    "--arc-accent-foreground",
    getReadableAccentText(theme.accentColor),
  );
  root.style.setProperty("--arc-glass-bg", theme.glassBackground);
  root.style.setProperty("--arc-glass-border", theme.glassBorder);
  root.style.setProperty("--arc-glass-blur", glassBlur);
  root.style.setProperty("--arc-glass-shadow", glassShadow);
  root.style.setProperty("--arc-text-primary", theme.textPrimary);
  root.style.setProperty("--arc-text-secondary", theme.textSecondary);
  root.style.setProperty("--arc-button-bg", buttonBackground);
  root.style.setProperty("--arc-button-text", buttonText);
  root.style.setProperty("--arc-button-hover-bg", buttonHover);
  root.style.setProperty("--arc-button-active-bg", buttonActive);
  root.style.setProperty("--arc-button-border", theme.glassBorder);
  root.style.setProperty("--arc-surface-soft", theme.glassBackground);
  root.style.setProperty("--arc-surface-strong", surfaceStrong);
  root.style.setProperty("--arc-dropdown-bg", surfaceStrong);
  root.style.setProperty("--arc-dropdown-border", theme.glassBorder);
  root.style.setProperty("--arc-actionbar-bg", surfaceStrong);
  root.style.setProperty("--arc-actionbar-border", theme.glassBorder);
  root.style.setProperty("--arc-focus-ring", theme.accentColor);
  root.style.setProperty("--arc-nav-bg", navBackground);
  root.style.setProperty("--arc-modal-bg", modalBackground);
  root.style.setProperty("--arc-overlay", overlay);

  root.style.setProperty(
    "--color-background",
    theme.mode === "dark" ? "#1a1d24" : "#f5f6f9",
  );
  root.style.setProperty("--color-surface", "var(--arc-glass-bg)");
  root.style.setProperty("--color-surface-2", "var(--arc-button-bg)");
  root.style.setProperty("--color-accent", "var(--arc-accent)");
  root.style.setProperty("--color-accent-hover", `${theme.accentColor}cc`);
  root.style.setProperty("--text-primary", "var(--arc-text-primary)");
  root.style.setProperty("--text-secondary", "var(--arc-text-secondary)");
  root.style.setProperty("--text-muted", "var(--arc-text-secondary)");
  root.style.setProperty("--text-subtle", "var(--arc-text-secondary)");
  root.style.setProperty("--glass-surface", "var(--arc-glass-bg)");
  root.style.setProperty("--glass-surface-2", "var(--arc-button-bg)");
  root.style.setProperty("--glass-surface-50", "var(--arc-modal-bg)");
  root.style.setProperty("--glass-surface-80", "var(--arc-nav-bg)");
  root.style.setProperty("--glass-border", "var(--arc-glass-border)");
  root.style.setProperty("--glass-border-strong", "var(--arc-glass-border)");
  root.style.setProperty("--glass-shadow", "var(--arc-glass-shadow)");
  root.style.setProperty("--wallpaper-overlay", "var(--arc-overlay)");
  root.style.setProperty("--glass-blur", "var(--arc-glass-blur)");

  if (wallpaper) {
    document.body.style.backgroundImage = `url(${wallpaper})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";
  } else {
    document.body.style.backgroundImage = "";
    document.body.style.backgroundSize = "";
    document.body.style.backgroundPosition = "";
    document.body.style.backgroundAttachment = "";
  }
}
