import { Image } from "lucide-react";
import { cn } from "../../lib/utils";

type Props = {
  onClick: () => void;
  layout?: "floating" | "rail";
  className?: string;
};

export function WallpaperButton({
  onClick,
  layout = "floating",
  className,
}: Props) {
  const baseClass =
    layout === "rail"
      ? "w-10 h-10 rounded-full flex items-center justify-center"
      : "fixed bottom-4 z-40 workspace-edge-left w-10 h-10 rounded-full flex items-center justify-center";

  return (
    <button
      onClick={onClick}
      title="Style and wallpaper"
      className={cn(
        baseClass,
        "bg-[var(--arc-nav-bg)] border border-[var(--arc-glass-border)]",
        "text-[var(--arc-text-secondary)] hover:text-[var(--arc-text-primary)]",
        "hover:border-[var(--arc-accent)] backdrop-blur-sm",
        "transition-all duration-150 shadow-lg shadow-black/20",
        className,
      )}
    >
      <Image size={16} />
    </button>
  );
}
