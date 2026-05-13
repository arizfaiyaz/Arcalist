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
      ? ""
      : "fixed bottom-4 z-40 workspace-edge-left";

  return (
    <button
      type="button"
      onClick={onClick}
      title="Style and wallpaper"
      aria-label="Style and wallpaper"
      className={cn(
        baseClass,
        "arc-icon-btn",
        className,
      )}
    >
      <Image size={16} />
    </button>
  );
}
