import type { WallpaperTheme } from "../types";

export const WALLPAPERS: WallpaperTheme[] = [
  // ── Dark wallpapers ──────────────────────────────────────
  {
    id: "default-dark",
    name: "Default",
    url: null,
    isDark: true,
    accentColor: "#00d285",
  },
  {
    id: "eclipse",
    name: "Eclipse",
    url: "/wallpapers/1.jpg",
    isDark: true,
    accentColor: "#FAD02C",
  },
  {
    id: "skyline",
    name: "Skyline",
    url: "/wallpapers/2.jpg",
    isDark: true,
    accentColor: "#00E5FF",
  },
  {
    id: "heart-tree",
    name: "Heart Tree",
    url: "/wallpapers/3.jpg",
    isDark: true,
    accentColor: "#A06EE1",
  },

  // ── Light wallpapers ─────────────────────────────────────
  {
    id: "default-light",
    name: "Default Light",
    url: null,
    isDark: false,
    accentColor: "#7C3AED",
  },
  {
    id: "field-sunset",
    name: "Field Sunset",
    url: "/wallpapers/4.jpg",
    isDark: false,
    accentColor: "#FF5F6D",
  },
  {
    id: "torii-gate",
    name: "Torii Gate",
    url: "/wallpapers/5.jpg",
    isDark: false,
    accentColor: "#D97706",
  },
  {
    id: "pagoda",
    name: "Pagoda",
    url: "/wallpapers/6.jpg",
    isDark: false,
    accentColor: "#FF9A00",
  },
  {
    id: "studio-cat",
    name: "Studio Cat",
    url: "/wallpapers/7.jpg",
    isDark: false,
    accentColor: "#48BB78",
  },
];

export const DEFAULT_WALLPAPER = WALLPAPERS[0];
