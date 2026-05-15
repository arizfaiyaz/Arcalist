import { useRef, useState } from "react";
import { X, Check, Lock, Upload, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { useTheme } from "../../hooks/useTheme";
import { UpgradePromptModal } from "../UpgradePromptModal";
import type { ArcalistTheme } from "../../config/themes";
import { useArcalistStore } from "../../store/useArcalistStore";
import {
  CUSTOM_THEME_PREFIX,
  deleteCustomWallpaperFile,
  uploadCustomWallpaper,
} from "../../lib/customWallpapers";
import { canUploadCustomWallpaper } from "../../lib/planLimits";

type Props = {
  open: boolean;
  onClose: () => void;
  layout?: "floating" | "rail";
  className?: string;
};

export function WallpaperPanel({
  open,
  onClose,
  layout = "floating",
  className,
}: Props) {
  const {
    selectedThemeId,
    effectiveTheme,
    setTheme,
    isThemeLocked,
    builtInDarkThemes,
    builtInLightThemes,
    customDarkThemes,
    customLightThemes,
    customWallpapers,
    isProUser,
  } = useTheme();
  const user = useArcalistStore((state) => state.user);
  const updateSettings = useArcalistStore((state) => state.updateSettings);
  const [styleTab, setStyleTab] = useState<"dark" | "light">(
    effectiveTheme.mode,
  );
  const [prompt, setPrompt] = useState<{
    title: string;
    description: string;
    featureName: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const builtInThemes =
    styleTab === "dark" ? builtInDarkThemes : builtInLightThemes;
  const customThemes =
    styleTab === "dark" ? customDarkThemes : customLightThemes;

  const handleSelectTheme = (theme: ArcalistTheme) => {
    const result = setTheme(theme.id);
    if (!result.ok && result.reason === "locked") {
      setPrompt({
        title: theme.id.startsWith(CUSTOM_THEME_PREFIX)
          ? "Custom wallpaper"
          : "Premium wallpaper",
        description: theme.id.startsWith(CUSTOM_THEME_PREFIX)
          ? "Custom wallpapers are available with Arcalist Pro."
          : "Premium wallpapers are available with Arcalist Pro.",
        featureName: theme.id.startsWith(CUSTOM_THEME_PREFIX)
          ? "Custom Wallpapers"
          : "Premium Themes",
      });
    }
  };

  const handleUploadClick = () => {
    setUploadError(null);
    if (!canUploadCustomWallpaper(isProUser)) {
      setPrompt({
        title: "Custom wallpaper",
        description: "Custom wallpapers are available with Arcalist Pro.",
        featureName: "Custom Wallpapers",
      });
      return;
    }

    if (!user) {
      setPrompt({
        title: "Sign in required",
        description: "Please sign in to upload custom wallpapers.",
        featureName: "Custom Wallpapers",
      });
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user) return;

    setUploading(true);
    setUploadError(null);
    const result = await uploadCustomWallpaper({
      file,
      userId: user.id,
      isProUser,
      mode: styleTab,
      accentColor: effectiveTheme.accentColor || "#22d3ee",
    });
    setUploading(false);

    if (!result.ok) {
      setUploadError(result.error);
      return;
    }

    const customWallpapersNext = [...customWallpapers, result.wallpaper];
    const selectedThemeIdNext = `${CUSTOM_THEME_PREFIX}${result.wallpaper.id}`;
    updateSettings({
      customWallpapers: customWallpapersNext,
      selectedThemeId: selectedThemeIdNext,
    });
    setPrompt({
      title: "Wallpaper uploaded",
      description: "Your custom wallpaper is ready.",
      featureName: "Custom Wallpapers",
    });
  };

  const handleDeleteCustomTheme = async (
    event: React.MouseEvent<HTMLButtonElement>,
    theme: ArcalistTheme,
  ) => {
    event.stopPropagation();
    const wallpaperId = theme.id.replace(CUSTOM_THEME_PREFIX, "");
    const wallpaper = customWallpapers.find((item) => item.id === wallpaperId);
    if (!wallpaper) return;

    const confirmed = window.confirm(
      `Delete "${wallpaper.name}"? This removes the wallpaper from Arcalist.`,
    );
    if (!confirmed) return;

    await deleteCustomWallpaperFile(wallpaper.storagePath);

    updateSettings({
      customWallpapers: customWallpapers.filter((item) => item.id !== wallpaperId),
      selectedThemeId:
        selectedThemeId === theme.id ? "default-dark" : selectedThemeId,
    });
  };

  const markImageBroken = (themeId: string) => {
    setBrokenImages((current) => new Set(current).add(themeId));
    if (import.meta.env.DEV) {
      console.warn(`[Arcalist] Wallpaper failed to load for theme: ${themeId}`);
    }
  };

  const positionClass =
    layout === "rail"
      ? "absolute bottom-16 left-0"
      : "fixed bottom-16 z-50 workspace-edge-left";

  return (
    <div
      className={cn(
        positionClass,
        "arc-glass-strong w-80 overflow-hidden rounded-2xl",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--arc-glass-border)]">
        <h3 className="text-[var(--arc-text-primary)] font-semibold text-sm">Style</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close style panel"
          className="rounded-full p-1 text-[var(--arc-text-secondary)] hover:bg-[var(--arc-button-hover-bg)] hover:text-[var(--arc-text-primary)]"
        >
          <X size={14} />
        </button>
      </div>

      {/* Dark / Light Toggle */}
      <div className="px-4 pt-3">
        <div className="flex rounded-xl overflow-hidden border border-[var(--arc-glass-border)]">
          <button
            type="button"
            onClick={() => setStyleTab("dark")}
            className={cn(
              "flex-1 py-2 text-sm font-medium transition-all",
              styleTab === "dark"
                ? "bg-[var(--arc-accent)] text-[var(--arc-accent-foreground)]"
                : "text-[var(--arc-text-secondary)] hover:text-[var(--arc-text-primary)]",
            )}
          >
            Dark
          </button>
          <button
            type="button"
            onClick={() => setStyleTab("light")}
            className={cn(
              "flex-1 py-2 text-sm font-medium transition-all",
              styleTab === "light"
                ? "bg-[var(--arc-accent)] text-[var(--arc-accent-foreground)]"
                : "text-[var(--arc-text-secondary)] hover:text-[var(--arc-text-primary)]",
            )}
          >
            Light
          </button>
        </div>
      </div>

      {/* Wallpaper Grid */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-[10px] text-[var(--arc-text-secondary)] uppercase tracking-wider font-semibold mb-2">
          Wallpapers
          <span className="ml-2 bg-[var(--arc-button-bg)] text-[var(--arc-text-secondary)] px-1.5 py-0.5 rounded-full">
            {builtInThemes.length + customThemes.length}
          </span>
        </p>
      </div>

      <div className="px-4 pb-4 max-h-72 overflow-y-auto">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={uploading}
            className={cn(
              "relative aspect-video rounded-xl overflow-hidden border-2",
              "border-[var(--arc-glass-border)] bg-black/35",
              "flex flex-col items-center justify-center gap-2",
              "text-[var(--arc-text-primary)] hover:text-white",
              "transition-all duration-150 hover:border-[var(--arc-accent)]",
              uploading && "opacity-70 cursor-wait",
            )}
          >
            <Upload size={18} />
            <span className="text-[10px] font-semibold">
              {uploading ? "Uploading..." : "Upload Wallpaper"}
            </span>
            <div className="absolute top-1.5 right-1.5 z-20 flex items-center gap-1 rounded-full border border-amber-100/70 bg-black/80 px-2 py-0.5 text-[10px] font-bold text-amber-50 shadow-lg shadow-black/40">
              {!isProUser && <Lock size={11} strokeWidth={2.5} />}
              Pro
            </div>
          </button>
        </div>

        {uploadError && (
          <p className="mb-3 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
            {uploadError}
          </p>
        )}

        {customThemes.length > 0 && (
          <ThemeGrid
            themes={customThemes}
            selectedThemeId={selectedThemeId}
            isThemeLocked={isThemeLocked}
            brokenImages={brokenImages}
            onSelect={handleSelectTheme}
            onImageBroken={markImageBroken}
            onDeleteCustomTheme={handleDeleteCustomTheme}
            title="My Wallpapers"
          />
        )}

        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--arc-text-secondary)]">
          Built-in Wallpapers
        </p>
        <ThemeGrid
          themes={builtInThemes}
          selectedThemeId={selectedThemeId}
          isThemeLocked={isThemeLocked}
          brokenImages={brokenImages}
          onSelect={handleSelectTheme}
          onImageBroken={markImageBroken}
        />
      </div>
      {prompt && (
        <UpgradePromptModal
          title={prompt.title}
          description={prompt.description}
          featureName={prompt.featureName}
          onClose={() => setPrompt(null)}
        />
      )}
    </div>
  );
}

function ThemeGrid({
  themes,
  selectedThemeId,
  isThemeLocked,
  brokenImages,
  onSelect,
  onImageBroken,
  onDeleteCustomTheme,
  title,
}: {
  themes: ArcalistTheme[];
  selectedThemeId: string;
  isThemeLocked: (theme: ArcalistTheme) => boolean;
  brokenImages: Set<string>;
  onSelect: (theme: ArcalistTheme) => void;
  onImageBroken: (themeId: string) => void;
  onDeleteCustomTheme?: (
    event: React.MouseEvent<HTMLButtonElement>,
    theme: ArcalistTheme,
  ) => void;
  title?: string;
}) {
  if (themes.length === 0) return null;

  return (
    <div className={title ? "mb-4" : undefined}>
      {title && (
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--arc-text-secondary)]">
          {title}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {themes.map((theme) => {
          const isActive = selectedThemeId === theme.id;
          const isLocked = isThemeLocked(theme);
          const hasImage = theme.wallpaper && !brokenImages.has(theme.id);
          const isCustom = theme.id.startsWith(CUSTOM_THEME_PREFIX);
          return (
            <button
              key={theme.id}
              onClick={() => onSelect(theme)}
              className={cn(
                "relative rounded-xl overflow-hidden aspect-video",
                "border-2 transition-all duration-150",
                isActive
                  ? "border-[var(--arc-accent)]"
                  : "border-transparent hover:border-[var(--arc-glass-border)]",
              )}
            >
              {hasImage ? (
                <img
                  src={theme.wallpaper}
                  alt={theme.name}
                  className="w-full h-full object-cover"
                  onError={() => onImageBroken(theme.id)}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: theme.glassBackground }}
                >
                  <span className="text-[var(--arc-text-secondary)] text-xs">
                    Default
                  </span>
                </div>
              )}

              <div
                className="absolute top-1.5 left-1.5 z-20 w-2.5 h-2.5 rounded-full border border-white/60 shadow-sm"
                style={{
                  backgroundColor: theme.previewColor ?? theme.accentColor,
                }}
              />

              {isLocked && (
                <div className="pointer-events-none absolute inset-0 z-10 bg-black/25" />
              )}

              {theme.tier === "pro" && (
                <div
                  className={cn(
                    "absolute top-1.5 right-1.5 z-30 flex items-center gap-1 rounded-full px-2 py-0.5",
                    "border border-amber-100/70 bg-black/80 text-[10px] font-bold text-amber-50",
                    "shadow-lg shadow-black/40 backdrop-blur-sm",
                  )}
                >
                  {isLocked && <Lock size={11} strokeWidth={2.5} />}
                  Pro
                </div>
              )}

              {isCustom && onDeleteCustomTheme && !isLocked && (
                <button
                  type="button"
                  onClick={(event) => onDeleteCustomTheme(event, theme)}
                  className={cn(
                    "absolute top-1.5 left-6 z-30 flex h-5 w-5 items-center justify-center",
                    "rounded-full border border-white/50 bg-black/70 text-white",
                    "shadow-lg shadow-black/30 hover:text-red-300",
                  )}
                  title="Delete wallpaper"
                >
                  <Trash2 size={10} />
                </button>
              )}

              <div className="absolute bottom-0 left-0 right-0 z-20 px-2 py-1 bg-black/75 backdrop-blur-sm">
                <p className="text-white text-[10px] font-medium truncate drop-shadow">
                  {theme.name}
                </p>
              </div>

              {isActive && (
                <div
                  className={cn(
                    "absolute w-5 h-5 rounded-full bg-[var(--arc-accent)]",
                    "z-30 flex items-center justify-center shadow-md shadow-black/30",
                    theme.tier === "pro"
                      ? "top-7 right-1.5"
                      : "top-1.5 right-1.5",
                  )}
                >
                  <Check
                    size={10}
                    className="text-[var(--arc-accent-foreground)]"
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
