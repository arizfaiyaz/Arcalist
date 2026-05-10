import {
  Search,
  Download,
  EyeOff,
  Eye,
  Trash2,
  LayoutGrid,
  Settings,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useArcalistStore } from "../store/useArcalistStore";

type Props = {
  onSearchOpen: () => void;
  onImportOpen: () => void;
  onTrashOpen: () => void;
  onSettingsOpen: () => void;
  onMultiSelectToggle: () => void;
  multiSelectMode: boolean;
};

export function ActionBar({
  onSearchOpen,
  onImportOpen,
  onTrashOpen,
  onSettingsOpen,
  onMultiSelectToggle,
  multiSelectMode,
}: Props) {
  const privacyMode = useArcalistStore((state) => state.privacyMode);
  const togglePrivacyMode = useArcalistStore(
    (state) => state.togglePrivacyMode,
  );
  const trash = useArcalistStore((state) => state.trash);

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
      <ActionButton
        icon={Search}
        label="Search (Ctrl+K)"
        onClick={onSearchOpen}
      />

      <ActionButton
        icon={privacyMode ? Eye : EyeOff}
        label={privacyMode ? "Disable privacy mode" : "Enable privacy mode"}
        onClick={togglePrivacyMode}
        active={privacyMode}
      />

      <ActionButton
        icon={Download}
        label="Import bookmarks"
        onClick={onImportOpen}
      />

      <ActionButton
        icon={LayoutGrid}
        label="Select multiple bookmarks"
        onClick={onMultiSelectToggle}
        active={multiSelectMode}
      />

      <div className="relative">
        <ActionButton icon={Trash2} label="Trash" onClick={onTrashOpen} />
        {trash.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] text-white font-bold flex items-center justify-center pointer-events-none">
            {trash.length > 9 ? "9+" : trash.length}
          </span>
        )}
      </div>

      <ActionButton icon={Settings} label="Settings" onClick={onSettingsOpen} />
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center",
        "border transition-all duration-150 shadow-lg shadow-black/20",
        active
          ? "bg-accent/20 border-accent/50 text-accent"
          : "bg-surface border-white/10 text-slate-400 hover:text-white hover:border-accent/30 hover:bg-surface-2",
      )}
    >
      <Icon size={15} />
    </button>
  );
}
