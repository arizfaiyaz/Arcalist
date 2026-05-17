import {
  DEFAULT_DARK_THEME_ID,
  arcalistThemes,
  getThemeById,
  type ArcalistTheme,
} from "../config/themes";
import { applyTheme } from "./theme";

export const SELECTED_THEME_CACHE_KEY = "arcalist:selectedThemeId";
export const LAST_EFFECTIVE_THEME_CACHE_KEY = "arcalist:lastEffectiveThemeId";

function readThemeIdFromCache() {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(LAST_EFFECTIVE_THEME_CACHE_KEY);
  } catch {
    return null;
  }
}

function writeThemeIdToCache(key: string, themeId: string) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, themeId);
  } catch {
    // Theme caching is a visual optimization only.
  }
}

function preloadWallpaper(theme: ArcalistTheme) {
  const wallpaper = theme.wallpaper.trim();
  if (!wallpaper) return;
  const image = new Image();
  image.src = wallpaper;
}

export function cacheThemeSelection(
  selectedThemeId: string,
  effectiveTheme: ArcalistTheme,
) {
  writeThemeIdToCache(SELECTED_THEME_CACHE_KEY, selectedThemeId);
  writeThemeIdToCache(LAST_EFFECTIVE_THEME_CACHE_KEY, effectiveTheme.id);
}

export function applyThemeByIdFromCache() {
  const cachedThemeId = readThemeIdFromCache();
  const theme =
    getThemeById(cachedThemeId) ??
    getThemeById(DEFAULT_DARK_THEME_ID) ??
    arcalistThemes[0];

  applyTheme(theme);
  preloadWallpaper(theme);
}
