import { Image } from "lucide-react";
import { cn } from "../../lib/utils";

type Props = {
  onClick: () => void;
};

export function WallpaperButton({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      title="Style and wallpaper"
      className={cn(
        "fixed bottom-4 left-4 z-40",
        "w-10 h-10 rounded-full flex items-center justify-center",
        "bg-surface/80 border border-white/10",
        "text-slate-400 hover:text-white",
        "hover:border-accent/30 backdrop-blur-sm",
        "transition-all duration-150 shadow-lg shadow-black/20",
      )}
    >
      <Image size={16} />
    </button>
  );
}
