import { useState } from "react";
import { X, Check } from "lucide-react";
import { cn } from "../../lib/utils";
import { useArcalistStore } from "../../store/useArcalistStore";
import { WALLPAPERS } from "../../data/wallpapers";

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
  const wallpaper = useArcalistStore((state) => state.wallpaperTheme);
  const setWallpaper = useArcalistStore((state) => state.setWallpaper);
  const [styleTab, setStyleTab] = useState<"dark" | "light">(
    wallpaper.isDark ? "dark" : "light",
  );

  if (!open) return null;

  const filtered = WALLPAPERS.filter((w) =>
    styleTab === "dark" ? w.isDark : !w.isDark,
  );

  const positionClass =
    layout === "rail"
      ? "absolute bottom-16 left-0"
      : "fixed bottom-16 z-50 workspace-edge-left";

  return (
    <div
      className={cn(
        positionClass,
        "w-80 bg-surface border border-white/10 rounded-2xl",
        "shadow-2xl shadow-black/60 overflow-hidden",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="text-white font-semibold text-sm">Style</h3>
        <button onClick={onClose} className="text-slate-500 hover:text-white">
          <X size={14} />
        </button>
      </div>

      {/* Dark / Light Toggle */}
      <div className="px-4 pt-3">
        <div className="flex rounded-xl overflow-hidden border border-white/10">
          <button
            onClick={() => setStyleTab("dark")}
            className={cn(
              "flex-1 py-2 text-sm font-medium transition-all",
              styleTab === "dark"
                ? "bg-accent text-background"
                : "text-slate-400 hover:text-white",
            )}
          >
            Dark
          </button>
          <button
            onClick={() => setStyleTab("light")}
            className={cn(
              "flex-1 py-2 text-sm font-medium transition-all",
              styleTab === "light"
                ? "bg-accent text-background"
                : "text-slate-400 hover:text-white",
            )}
          >
            Light
          </button>
        </div>
      </div>

      {/* Wallpaper Grid */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">
          Wallpapers
          <span className="ml-2 bg-surface-2 text-slate-400 px-1.5 py-0.5 rounded-full">
            {filtered.length}
          </span>
        </p>
      </div>

      <div className="px-4 pb-4 max-h-72 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2">
          {filtered.map((w) => {
            const isActive = wallpaper.id === w.id;
            return (
              <button
                key={w.id}
                onClick={() => setWallpaper(w)}
                className={cn(
                  "relative rounded-xl overflow-hidden aspect-video",
                  "border-2 transition-all duration-150",
                  isActive
                    ? "border-accent"
                    : "border-transparent hover:border-white/20",
                )}
              >
                {w.url ? (
                  <img
                    src={w.url}
                    alt={w.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-surface-2 flex items-center justify-center">
                    <span className="text-slate-400 text-xs">Default</span>
                  </div>
                )}

                {/* Accent dot preview */}
                <div
                  className="absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full border border-white/30"
                  style={{ backgroundColor: w.accentColor }}
                />

                {/* Name label */}
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/50">
                  <p className="text-white text-[10px] truncate">{w.name}</p>
                </div>

                {/* Active checkmark */}
                {isActive && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                    <Check size={10} className="text-background" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
