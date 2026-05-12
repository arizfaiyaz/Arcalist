import { useCallback, useEffect, useMemo } from "react";
import {
  arcalistThemes,
  getEffectiveTheme,
  getThemeById,
  getThemesByMode,
  type ArcalistTheme,
} from "../config/themes";
import { applyTheme } from "../lib/theme";
import { customWallpaperToTheme } from "../lib/customWallpapers";
import { useArcalistStore } from "../store/useArcalistStore";
import { usePlanLimits } from "./usePlanLimits";

export type SetThemeResult =
  | { ok: true; theme: ArcalistTheme }
  | { ok: false; reason: "locked" | "missing"; theme?: ArcalistTheme };

export function useTheme() {
  const selectedThemeId = useArcalistStore(
    (state) => state.settings.selectedThemeId,
  );
  const customWallpapers = useArcalistStore(
    (state) => state.settings.customWallpapers,
  );
  const updateSettings = useArcalistStore((state) => state.updateSettings);
  const planLimits = usePlanLimits();

  const customThemes = useMemo(
    () => customWallpapers.map(customWallpaperToTheme),
    [customWallpapers],
  );

  const themes = useMemo(
    () => [...arcalistThemes, ...customThemes],
    [customThemes],
  );

  const effectiveTheme = useMemo(
    () =>
      getEffectiveTheme(selectedThemeId, planLimits.isProUser, customThemes),
    [customThemes, planLimits.isProUser, selectedThemeId],
  );

  useEffect(() => {
    applyTheme(effectiveTheme);
  }, [effectiveTheme]);

  const isThemeLocked = useCallback(
    (theme: ArcalistTheme) => theme.tier === "pro" && !planLimits.isProUser,
    [planLimits.isProUser],
  );

  const setTheme = useCallback(
    (themeId: string): SetThemeResult => {
      const theme = getThemeById(themeId, customThemes);
      if (!theme) return { ok: false, reason: "missing" };
      if (isThemeLocked(theme)) {
        return { ok: false, reason: "locked", theme };
      }

      updateSettings({ selectedThemeId: theme.id });
      applyTheme(theme);
      return { ok: true, theme };
    },
    [customThemes, isThemeLocked, updateSettings],
  );

  return {
    selectedThemeId,
    effectiveTheme,
    setTheme,
    themes,
    builtInThemes: arcalistThemes,
    customThemes,
    customWallpapers,
    darkThemes: themes.filter((theme) => theme.mode === "dark"),
    lightThemes: themes.filter((theme) => theme.mode === "light"),
    freeThemes: arcalistThemes.filter((theme) => theme.tier === "free"),
    premiumThemes: themes.filter((theme) => theme.tier === "pro"),
    builtInDarkThemes: getThemesByMode("dark"),
    builtInLightThemes: getThemesByMode("light"),
    customDarkThemes: customThemes.filter((theme) => theme.mode === "dark"),
    customLightThemes: customThemes.filter((theme) => theme.mode === "light"),
    isThemeLocked,
    isProUser: planLimits.isProUser,
  };
}
