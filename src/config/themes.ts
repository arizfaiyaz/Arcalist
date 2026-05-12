export type ThemeMode = "dark" | "light";
export type ThemeTier = "free" | "pro";

export type ArcalistTheme = {
  id: string;
  name: string;
  mode: ThemeMode;
  tier: ThemeTier;
  wallpaper: string;
  accentColor: string;
  previewColor?: string;
  glassBackground: string;
  glassBorder: string;
  glassBlur?: string;
  glassShadow?: string;
  textPrimary: string;
  textSecondary: string;
  buttonBackground?: string;
  buttonText?: string;
  navBackground?: string;
  modalBackground?: string;
  overlay?: string;
};

export const DEFAULT_DARK_THEME_ID = "default-dark";
export const DEFAULT_LIGHT_THEME_ID = "default-light";

export const arcalistThemes: ArcalistTheme[] = [
  {
    id: DEFAULT_DARK_THEME_ID,
    name: "Default",
    mode: "dark",
    tier: "free",
    wallpaper: "",
    accentColor: "#00d285",
    previewColor: "#00d285",
    glassBackground: "#22262f",
    glassBorder: "rgba(255, 255, 255, 0.08)",
    glassBlur: "0px",
    glassShadow: "0 18px 40px rgba(0, 0, 0, 0.4)",
    textPrimary: "#e2e8f0",
    textSecondary: "#94a3b8",
    navBackground: "#22262f",
    modalBackground: "#22262f",
    overlay: "none",
  },
  {
    id: "eclipse",
    name: "Eclipse",
    mode: "dark",
    tier: "free",
    wallpaper: "/wallpapers/1.jpg",
    accentColor: "#FAD02C",
    previewColor: "#FAD02C",
    glassBackground: "rgba(28, 34, 44, 0.62)",
    glassBorder: "rgba(255, 255, 255, 0.10)",
    glassBlur: "18px",
    glassShadow: "0 18px 40px rgba(0, 0, 0, 0.45)",
    textPrimary: "#f8fafc",
    textSecondary: "rgba(226, 232, 240, 0.76)",
    overlay:
      "linear-gradient(180deg, rgba(6, 10, 16, 0.35), rgba(6, 10, 16, 0.6))",
  },
  {
    id: "skyline",
    name: "Skyline",
    mode: "dark",
    tier: "free",
    wallpaper: "/wallpapers/2.jpg",
    accentColor: "#00E5FF",
    previewColor: "#00E5FF",
    glassBackground:
      "linear-gradient(180deg, rgba(0, 229, 255, 0.16), rgba(255,255,255,0.02)), rgba(24, 34, 46, 0.62)",
    glassBorder: "rgba(125, 211, 252, 0.20)",
    glassBlur: "20px",
    glassShadow: "0 20px 54px rgba(0, 0, 0, 0.42)",
    textPrimary: "#f8fafc",
    textSecondary: "rgba(226, 232, 240, 0.78)",
    overlay:
      "linear-gradient(180deg, rgba(2, 6, 23, 0.25), rgba(2, 6, 23, 0.58))",
  },
  {
    id: "heart-tree",
    name: "Heart Tree",
    mode: "dark",
    tier: "free",
    wallpaper: "/wallpapers/3.jpg",
    accentColor: "#A06EE1",
    previewColor: "#A06EE1",
    glassBackground:
      "linear-gradient(180deg, rgba(160, 110, 225, 0.16), rgba(255,255,255,0.02)), rgba(31, 27, 42, 0.64)",
    glassBorder: "rgba(216, 180, 254, 0.22)",
    glassBlur: "20px",
    glassShadow: "0 20px 54px rgba(0, 0, 0, 0.44)",
    textPrimary: "#faf5ff",
    textSecondary: "rgba(245, 243, 255, 0.76)",
    overlay:
      "linear-gradient(180deg, rgba(18, 8, 30, 0.28), rgba(18, 8, 30, 0.62))",
  },
  {
    id: DEFAULT_LIGHT_THEME_ID,
    name: "Default Light",
    mode: "light",
    tier: "free",
    wallpaper: "",
    accentColor: "#7C3AED",
    previewColor: "#7C3AED",
    glassBackground: "#ffffff",
    glassBorder: "rgba(15, 23, 42, 0.10)",
    glassBlur: "0px",
    glassShadow: "0 18px 40px rgba(15, 23, 42, 0.16)",
    textPrimary: "#0f172a",
    textSecondary: "#334155",
    navBackground: "#ffffff",
    modalBackground: "#ffffff",
    overlay: "none",
  },
  {
    id: "field-sunset",
    name: "Field Sunset",
    mode: "light",
    tier: "free",
    wallpaper: "/wallpapers/4.jpg",
    accentColor: "#FF5F6D",
    previewColor: "#FF5F6D",
    glassBackground:
      "linear-gradient(180deg, rgba(255, 95, 109, 0.12), rgba(255,255,255,0.72)), rgba(244, 247, 250, 0.86)",
    glassBorder: "rgba(148, 85, 69, 0.18)",
    glassBlur: "22px",
    glassShadow: "0 18px 42px rgba(88, 64, 56, 0.18)",
    textPrimary: "#1f2937",
    textSecondary: "#475569",
    overlay:
      "linear-gradient(180deg, rgba(255, 255, 255, 0.60), rgba(255, 255, 255, 0.36))",
  },
  {
    id: "torii-gate",
    name: "Torii Gate",
    mode: "light",
    tier: "free",
    wallpaper: "/wallpapers/5.jpg",
    accentColor: "#D97706",
    previewColor: "#D97706",
    glassBackground:
      "linear-gradient(180deg, rgba(217, 119, 6, 0.11), rgba(255,255,255,0.74)), rgba(245, 241, 234, 0.88)",
    glassBorder: "rgba(120, 53, 15, 0.18)",
    glassBlur: "22px",
    glassShadow: "0 18px 42px rgba(120, 53, 15, 0.16)",
    textPrimary: "#1c1917",
    textSecondary: "#57534e",
    overlay:
      "linear-gradient(180deg, rgba(255, 255, 255, 0.62), rgba(255, 255, 255, 0.34))",
  },
  {
    id: "pagoda",
    name: "Pagoda",
    mode: "light",
    tier: "free",
    wallpaper: "/wallpapers/6.jpg",
    accentColor: "#FF9A00",
    previewColor: "#FF9A00",
    glassBackground:
      "linear-gradient(180deg, rgba(255, 154, 0, 0.12), rgba(255,255,255,0.72)), rgba(246, 241, 232, 0.88)",
    glassBorder: "rgba(154, 52, 18, 0.18)",
    glassBlur: "22px",
    glassShadow: "0 18px 42px rgba(154, 52, 18, 0.16)",
    textPrimary: "#1f2937",
    textSecondary: "#57534e",
    overlay:
      "linear-gradient(180deg, rgba(255, 255, 255, 0.64), rgba(255, 255, 255, 0.36))",
  },
  {
    id: "studio-cat",
    name: "Studio Cat",
    mode: "light",
    tier: "free",
    wallpaper: "/wallpapers/7.jpg",
    accentColor: "#48BB78",
    previewColor: "#48BB78",
    glassBackground:
      "linear-gradient(180deg, rgba(72, 187, 120, 0.10), rgba(255,255,255,0.72)), rgba(243, 247, 242, 0.9)",
    glassBorder: "rgba(22, 101, 52, 0.16)",
    glassBlur: "22px",
    glassShadow: "0 18px 42px rgba(22, 101, 52, 0.14)",
    textPrimary: "#172033",
    textSecondary: "#475569",
    overlay:
      "linear-gradient(180deg, rgba(255, 255, 255, 0.60), rgba(255, 255, 255, 0.38))",
  },
  {
    id: "aurora-glass",
    name: "Aurora Glass",
    mode: "dark",
    tier: "pro",
    wallpaper: "/wallpapers/pro-sakura-falls-night.jpg",
    accentColor: "#67E8F9",
    previewColor: "#67E8F9",
    glassBackground:
      "linear-gradient(180deg, rgba(103,232,249,0.18), rgba(236,72,153,0.08)), rgba(8, 47, 73, 0.48)",
    glassBorder: "rgba(103, 232, 249, 0.24)",
    glassBlur: "24px",
    glassShadow: "0 24px 70px rgba(0, 0, 0, 0.42)",
    textPrimary: "#f8fafc",
    textSecondary: "rgba(224, 242, 254, 0.78)",
    overlay:
      "linear-gradient(180deg, rgba(5, 12, 28, 0.18), rgba(5, 12, 28, 0.62))",
  },
  {
    id: "cyber-neon",
    name: "Cyber Neon",
    mode: "dark",
    tier: "pro",
    wallpaper: "/wallpapers/pro-night-city-ferris-wheel.jpg",
    accentColor: "#22D3EE",
    previewColor: "#22D3EE",
    glassBackground:
      "linear-gradient(180deg, rgba(34,211,238,0.18), rgba(168,85,247,0.10)), rgba(15, 23, 42, 0.54)",
    glassBorder: "rgba(34, 211, 238, 0.28)",
    glassBlur: "24px",
    glassShadow: "0 24px 70px rgba(0, 0, 0, 0.48)",
    textPrimary: "#ecfeff",
    textSecondary: "rgba(207, 250, 254, 0.76)",
    overlay:
      "linear-gradient(180deg, rgba(3, 7, 18, 0.18), rgba(3, 7, 18, 0.66))",
  },
  {
    id: "deep-ocean",
    name: "Deep Ocean",
    mode: "dark",
    tier: "pro",
    wallpaper: "/wallpapers/pro-cascading-waterfall-port.jpg",
    accentColor: "#2DD4BF",
    previewColor: "#2DD4BF",
    glassBackground:
      "linear-gradient(180deg, rgba(45,212,191,0.14), rgba(255,255,255,0.02)), rgba(7, 47, 54, 0.54)",
    glassBorder: "rgba(94, 234, 212, 0.22)",
    glassBlur: "24px",
    glassShadow: "0 24px 70px rgba(0, 0, 0, 0.44)",
    textPrimary: "#f0fdfa",
    textSecondary: "rgba(204, 251, 241, 0.76)",
    overlay:
      "linear-gradient(180deg, rgba(4, 20, 24, 0.22), rgba(4, 20, 24, 0.64))",
  },
  {
    id: "cosmic-purple",
    name: "Cosmic Purple",
    mode: "dark",
    tier: "pro",
    wallpaper: "/wallpapers/pro-celestial-cityscape.jpg",
    accentColor: "#C084FC",
    previewColor: "#C084FC",
    glassBackground:
      "linear-gradient(180deg, rgba(192,132,252,0.18), rgba(96,165,250,0.08)), rgba(30, 27, 75, 0.52)",
    glassBorder: "rgba(216, 180, 254, 0.25)",
    glassBlur: "24px",
    glassShadow: "0 24px 70px rgba(0, 0, 0, 0.46)",
    textPrimary: "#faf5ff",
    textSecondary: "rgba(243, 232, 255, 0.76)",
    overlay:
      "linear-gradient(180deg, rgba(15, 12, 35, 0.18), rgba(15, 12, 35, 0.66))",
  },
  {
    id: "rainy-window",
    name: "Rainy Window",
    mode: "dark",
    tier: "pro",
    wallpaper: "/wallpapers/pro-midnight-cathedral.jpg",
    accentColor: "#93C5FD",
    previewColor: "#93C5FD",
    glassBackground:
      "linear-gradient(180deg, rgba(147,197,253,0.14), rgba(255,255,255,0.03)), rgba(15, 23, 42, 0.58)",
    glassBorder: "rgba(191, 219, 254, 0.22)",
    glassBlur: "26px",
    glassShadow: "0 24px 70px rgba(0, 0, 0, 0.50)",
    textPrimary: "#eff6ff",
    textSecondary: "rgba(219, 234, 254, 0.76)",
    overlay:
      "linear-gradient(180deg, rgba(8, 13, 25, 0.28), rgba(8, 13, 25, 0.68))",
  },
  {
    id: "sakura-morning",
    name: "Sakura Morning",
    mode: "light",
    tier: "pro",
    wallpaper: "/wallpapers/pro-cherry-blossom-valley.jpg",
    accentColor: "#EC4899",
    previewColor: "#EC4899",
    glassBackground:
      "linear-gradient(180deg, rgba(236,72,153,0.11), rgba(255,255,255,0.76)), rgba(255, 247, 251, 0.88)",
    glassBorder: "rgba(190, 24, 93, 0.16)",
    glassBlur: "24px",
    glassShadow: "0 20px 52px rgba(190, 24, 93, 0.15)",
    textPrimary: "#29111f",
    textSecondary: "#6b3b52",
    overlay:
      "linear-gradient(180deg, rgba(255, 255, 255, 0.62), rgba(255, 255, 255, 0.34))",
  },
  {
    id: "golden-focus",
    name: "Golden Focus",
    mode: "light",
    tier: "pro",
    wallpaper: "/wallpapers/pro-golden-autumn-creek.jpg",
    accentColor: "#F59E0B",
    previewColor: "#F59E0B",
    glassBackground:
      "linear-gradient(180deg, rgba(245,158,11,0.12), rgba(255,255,255,0.78)), rgba(255, 251, 235, 0.88)",
    glassBorder: "rgba(180, 83, 9, 0.17)",
    glassBlur: "24px",
    glassShadow: "0 20px 52px rgba(146, 64, 14, 0.16)",
    textPrimary: "#23180b",
    textSecondary: "#5f4b32",
    overlay:
      "linear-gradient(180deg, rgba(255, 255, 255, 0.64), rgba(255, 255, 255, 0.34))",
  },
  {
    id: "cloud-desk",
    name: "Cloud Desk",
    mode: "light",
    tier: "pro",
    wallpaper: "/wallpapers/pro-coastal-stone-cottage.jpg",
    accentColor: "#0EA5E9",
    previewColor: "#0EA5E9",
    glassBackground:
      "linear-gradient(180deg, rgba(14,165,233,0.10), rgba(255,255,255,0.76)), rgba(240, 249, 255, 0.88)",
    glassBorder: "rgba(3, 105, 161, 0.15)",
    glassBlur: "24px",
    glassShadow: "0 20px 52px rgba(14, 116, 144, 0.14)",
    textPrimary: "#102033",
    textSecondary: "#3f5368",
    overlay:
      "linear-gradient(180deg, rgba(255, 255, 255, 0.64), rgba(255, 255, 255, 0.36))",
  },
  {
    id: "soft-meadow",
    name: "Soft Meadow",
    mode: "light",
    tier: "pro",
    wallpaper: "/wallpapers/pro-red-sun-lake-house.jpg",
    accentColor: "#65A30D",
    previewColor: "#65A30D",
    glassBackground:
      "linear-gradient(180deg, rgba(101,163,13,0.10), rgba(255,255,255,0.76)), rgba(247, 252, 241, 0.88)",
    glassBorder: "rgba(63, 98, 18, 0.15)",
    glassBlur: "24px",
    glassShadow: "0 20px 52px rgba(63, 98, 18, 0.13)",
    textPrimary: "#17210e",
    textSecondary: "#4b5f3a",
    overlay:
      "linear-gradient(180deg, rgba(255, 255, 255, 0.64), rgba(255, 255, 255, 0.36))",
  },
  {
    id: "crimson-pagoda",
    name: "Crimson Pagoda",
    mode: "dark",
    tier: "pro",
    wallpaper: "/wallpapers/pro-crimson-tree-pagoda.jpg",
    accentColor: "#F97316",
    previewColor: "#F97316",
    glassBackground:
      "linear-gradient(180deg, rgba(249,115,22,0.16), rgba(185,28,28,0.08)), rgba(32, 18, 16, 0.62)",
    glassBorder: "rgba(251, 146, 60, 0.24)",
    glassBlur: "24px",
    glassShadow: "0 24px 70px rgba(0, 0, 0, 0.48)",
    textPrimary: "#fff7ed",
    textSecondary: "rgba(255, 237, 213, 0.78)",
    overlay:
      "linear-gradient(180deg, rgba(20, 10, 8, 0.24), rgba(20, 10, 8, 0.66))",
  },
];

export const getThemeById = (
  themeId?: string | null,
  customThemes: ArcalistTheme[] = [],
) => [...arcalistThemes, ...customThemes].find((theme) => theme.id === themeId);

export const getThemesByMode = (mode: ThemeMode) =>
  arcalistThemes.filter((theme) => theme.mode === mode);

const getFallbackTheme = (mode: ThemeMode = "dark") =>
  getThemeById(mode === "light" ? DEFAULT_LIGHT_THEME_ID : DEFAULT_DARK_THEME_ID) ??
  arcalistThemes[0];

export const getEffectiveTheme = (
  selectedThemeId: string | null | undefined,
  isProUser: boolean,
  customThemes: ArcalistTheme[] = [],
) => {
  const selectedTheme = getThemeById(selectedThemeId, customThemes);
  if (!selectedTheme) return getFallbackTheme("dark");
  if (selectedTheme.tier === "pro" && !isProUser) {
    return getFallbackTheme(selectedTheme.mode);
  }
  return selectedTheme;
};
