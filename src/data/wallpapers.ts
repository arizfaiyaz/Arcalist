import { arcalistThemes } from "../config/themes";
import type { WallpaperTheme } from "../types";

export const toWallpaperTheme = (themeId: string): WallpaperTheme => {
  const theme = arcalistThemes.find((item) => item.id === themeId);
  if (!theme) {
    return toWallpaperTheme("default-dark");
  }

  return {
    id: theme.id,
    name: theme.name,
    url: theme.wallpaper || null,
    isDark: theme.mode === "dark",
    accentColor: theme.accentColor,
    tone: theme.mode,
  };
};

export const WALLPAPERS: WallpaperTheme[] = arcalistThemes
  .filter((theme) => theme.tier === "free")
  .map((theme) => toWallpaperTheme(theme.id));

export const DEFAULT_WALLPAPER = toWallpaperTheme("default-dark");

