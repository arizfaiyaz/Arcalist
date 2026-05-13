import {
  Search,
  Download,
  EyeOff,
  Eye,
  Trash2,
  LayoutGrid,
  Settings,
  MoreVertical,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useArcalistStore } from "../store/useArcalistStore";
import { useState } from "react";

type Props = {
  onSearchOpen: () => void;
  onImportOpen: () => void;
  onTrashOpen: () => void;
  onSettingsOpen: () => void;
  onSmartCollectionsOpen: () => void;
  onAnalyticsOpen: () => void;
  onMultiSelectToggle: () => void;
  multiSelectMode: boolean;
  smartCollectionsLocked?: boolean;
  analyticsLocked?: boolean;
  layout?: "floating" | "rail";
  className?: string;
};

export function ActionBar({
  onSearchOpen,
  onImportOpen,
  onTrashOpen,
  onSettingsOpen,
  onSmartCollectionsOpen,
  onAnalyticsOpen,
  onMultiSelectToggle,
  multiSelectMode,
  smartCollectionsLocked = false,
  analyticsLocked = false,
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
      icon: Sparkles,
      label: "Smart Collections",
      onClick: onSmartCollectionsOpen,
      badge: smartCollectionsLocked ? "Pro" : null,
    },
    {
      icon: BarChart3,
      label: "Productivity Analytics",
      onClick: onAnalyticsOpen,
      badge: analyticsLocked ? "Pro" : null,
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
        <div className="relative rounded-full p-1 arc-glass-strong">
          <ActionButton
            icon={MoreVertical}
            label="Tools"
            onClick={() => setMenuOpen((v) => !v)}
            active={menuOpen}
          />
          {menuOpen && (
            <div className="arc-menu absolute right-14 top-1/2 z-50 w-60 -translate-y-1/2 rounded-xl p-2">
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => {
                    action.onClick();
                    setMenuOpen(false);
                  }}
                  className={cn(
                    "arc-menu-item",
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
            icon={Sparkles}
            label="Smart Collections"
            onClick={onSmartCollectionsOpen}
            badge={smartCollectionsLocked ? "Pro" : undefined}
          />

          <ActionButton
            icon={BarChart3}
            label="Productivity Analytics"
            onClick={onAnalyticsOpen}
            badge={analyticsLocked ? "Pro" : undefined}
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
  badge,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  active?: boolean;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "arc-icon-btn relative",
        active
          ? "border-[var(--arc-accent)] text-[var(--arc-accent)] bg-[var(--arc-button-active-bg)]"
          : "",
      )}
    >
      <Icon size={17} />
      {badge && (
        <span className="absolute -right-2 -top-1 rounded-full border border-amber-300/30 bg-amber-500/20 px-1 text-[8px] font-semibold leading-4 text-amber-100">
          {badge}
        </span>
      )}
    </button>
  );
}
