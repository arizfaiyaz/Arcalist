import { useCallback, useEffect, useMemo } from "react";
import {
  arcalistThemes,
  getEffectiveTheme,
  getThemeById,
  getThemesByMode,
  type ArcalistTheme,
} from "../config/themes";
import { applyTheme } from "../lib/theme";
import { cacheThemeSelection } from "../lib/themeBootstrap";
import {
  customWallpaperToTheme,
  refreshCustomWallpaperSignedUrls,
} from "../lib/customWallpapers";
import { useArcalistStore } from "../store/useArcalistStore";
import { usePlanLimits } from "./usePlanLimits";
import { canUsePremiumThemes } from "../lib/planLimits";

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
  const user = useArcalistStore((state) => state.user);
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
    cacheThemeSelection(selectedThemeId, effectiveTheme);
  }, [effectiveTheme, selectedThemeId]);

  useEffect(() => {
    if (!user || customWallpapers.length === 0) return;

    let cancelled = false;
    void refreshCustomWallpaperSignedUrls(customWallpapers).then((refreshed) => {
      if (cancelled || refreshed === customWallpapers) return;
      updateSettings({ customWallpapers: refreshed });
    });

    return () => {
      cancelled = true;
    };
  }, [customWallpapers, updateSettings, user]);

  const isThemeLocked = useCallback(
    (theme: ArcalistTheme) =>
      theme.tier === "pro" && !canUsePremiumThemes(planLimits.isProUser),
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
      cacheThemeSelection(theme.id, theme);
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
