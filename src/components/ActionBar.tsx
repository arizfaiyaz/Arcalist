import {
  Search,
  Download,
  EyeOff,
  Eye,
  Trash2,
  LayoutGrid,
  Settings,
  MoreVertical,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useArcalistStore } from "../store/useArcalistStore";
import { useState } from "react";

type Props = {
  onSearchOpen: () => void;
  onImportOpen: () => void;
  onTrashOpen: () => void;
  onSettingsOpen: () => void;
  onMultiSelectToggle: () => void;
  multiSelectMode: boolean;
  layout?: "floating" | "rail";
  className?: string;
};

export function ActionBar({
  onSearchOpen,
  onImportOpen,
  onTrashOpen,
  onSettingsOpen,
  onMultiSelectToggle,
  multiSelectMode,
  layout = "floating",
  className,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const privacyMode = useArcalistStore((state) => state.privacyMode);
  const togglePrivacyMode = useArcalistStore(
    (state) => state.togglePrivacyMode,
  );
  const trash = useArcalistStore((state) => state.trash);
  const groupTools = useArcalistStore((state) => state.settings.groupTools);

  const actions = [
    {
      icon: Search,
      label: "Search (Ctrl+K)",
      onClick: onSearchOpen,
    },
    {
      icon: privacyMode ? Eye : EyeOff,
      label: privacyMode ? "Disable privacy mode" : "Enable privacy mode",
      onClick: togglePrivacyMode,
      active: privacyMode,
    },
    {
      icon: Download,
      label: "Import bookmarks",
      onClick: onImportOpen,
    },
    {
      icon: LayoutGrid,
      label: "Select multiple bookmarks",
      onClick: onMultiSelectToggle,
      active: multiSelectMode,
    },
    {
      icon: Trash2,
      label: "Trash",
      onClick: onTrashOpen,
      badge: trash.length > 0 ? (trash.length > 9 ? "9+" : `${trash.length}`) : null,
    },
    {
      icon: Settings,
      label: "Settings",
      onClick: onSettingsOpen,
    },
  ];

  const containerClass =
    layout === "rail"
      ? "flex flex-col gap-2"
      : "fixed right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2";

  return (
    <div className={cn(containerClass, className)}>
      {groupTools ? (
        <div className="relative">
          <ActionButton
            icon={MoreVertical}
            label="Tools"
            onClick={() => setMenuOpen((v) => !v)}
            active={menuOpen}
          />
          {menuOpen && (
            <div className="absolute right-12 top-1/2 -translate-y-1/2 w-56 bg-[var(--arc-modal-bg)] border border-[var(--arc-glass-border)] rounded-xl shadow-xl shadow-black/40 p-2">
              {actions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => {
                    action.onClick();
                    setMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                    "text-[var(--arc-text-secondary)] hover:text-[var(--arc-text-primary)] hover:bg-[var(--arc-button-bg)]",
                    action.active && "text-[var(--arc-accent)]",
                  )}
                >
                  <action.icon size={14} />
                  <span className="flex-1 text-left">{action.label}</span>
                  {action.badge && (
                    <span className="ml-auto px-1.5 py-0.5 rounded-full text-[9px] bg-red-500 text-white">
                      {action.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <ActionButton
            icon={Search}
            label="Search (Ctrl+K)"
            onClick={onSearchOpen}
          />

          <ActionButton
            icon={privacyMode ? Eye : EyeOff}
            label={
              privacyMode ? "Disable privacy mode" : "Enable privacy mode"
            }
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

          <ActionButton
            icon={Settings}
            label="Settings"
            onClick={onSettingsOpen}
          />
        </>
      )}
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
        "w-10 h-10 rounded-full flex items-center justify-center",
        "border transition-all duration-150 shadow-lg shadow-black/20",
        active
          ? "bg-accent/20 border-[var(--arc-accent)] text-[var(--arc-accent)]"
          : "bg-[var(--arc-button-bg)] border-[var(--arc-glass-border)] text-[var(--arc-text-secondary)] hover:text-[var(--arc-text-primary)] hover:border-[var(--arc-accent)] hover:bg-[var(--arc-button-bg)]",
      )}
    >
      <Icon size={17} />
    </button>
  );
}
