import { useRef, useState } from "react";
import { X, Settings, User, HelpCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import { useArcalistStore } from "../../store/useArcalistStore";
import { SyncSettings } from "./SyncSettings";

type Tab = "general" | "account" | "support";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SettingsPanel({ open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("general");
  const panelRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onPointerDown={(event) => {
        const target = event.target;
        if (
          target instanceof Node &&
          panelRef.current?.contains(target)
        ) {
          return;
        }
        onClose();
      }}
    >
      <div className="absolute inset-0 bg-[var(--arc-overlay)] backdrop-blur-sm" />

      <div
        ref={panelRef}
        className={cn(
          "relative flex w-full max-w-2xl mx-4 h-[480px]",
          "bg-[var(--arc-modal-bg)] border border-[var(--arc-glass-border)] rounded-2xl",
          "shadow-2xl shadow-black/60 overflow-hidden",
        )}
      >
        {/* Sidebar */}
        <div className="w-52 border-r border-[var(--arc-glass-border)] p-3 flex flex-col gap-1">
          <p className="text-[var(--arc-text-primary)] font-bold text-base px-3 py-2">Settings</p>

          {[
            { id: "general" as Tab, label: "General", icon: Settings },
            { id: "account" as Tab, label: "Account", icon: User },
            { id: "support" as Tab, label: "Support", icon: HelpCircle },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm",
                "transition-all duration-150 text-left",
                tab === id
                  ? "bg-accent/15 text-[var(--arc-accent)]"
                  : "text-[var(--arc-text-secondary)] hover:text-[var(--arc-text-primary)] hover:bg-[var(--arc-button-bg)]",
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 text-[var(--arc-text-secondary)] hover:text-[var(--arc-text-primary)]"
          >
            <X size={15} />
          </button>

          {tab === "general" && <GeneralSettings />}
          {tab === "account" && <AccountSettings />}
          {tab === "support" && <SupportSettings />}
        </div>
      </div>
    </div>
  );
}

// ─── General Tab ──────────────────────────────────────────
function GeneralSettings() {
  const settings = useArcalistStore((state) => state.settings);
  const updateSettings = useArcalistStore((state) => state.updateSettings);
  const pages = useArcalistStore((state) => state.pages);
  const boardOptions = pages.flatMap((page) =>
    page.boards.map((board) => ({
      id: board.id,
      label: `${page.title} · ${board.title}`,
    })),
  );

  return (
    <div className="p-6">
      <h2 className="text-[var(--arc-text-primary)] font-bold text-lg mb-6">General Settings</h2>

      <SettingsSection title="Appearance">
        <SettingsToggle
          label="Compact mode"
          description="Reduce spacing to show more bookmarks"
          value={settings.compactMode}
          onChange={(v) => updateSettings({ compactMode: v })}
        />
        <SettingsToggle
          label="Group tools"
          description="Collapse right-side utility buttons into a menu"
          value={settings.groupTools}
          onChange={(v) => updateSettings({ groupTools: v })}
        />
        <SettingsToggle
          label="Smart truncation"
          description='Hide long bookmark lists and show a "Show More" button'
          value={settings.smartTruncation}
          onChange={(v) => updateSettings({ smartTruncation: v })}
        />
        <SettingsNumber
          label="Visibility threshold"
          description="How many bookmarks show before truncating"
          value={settings.visibilityThreshold}
          min={1}
          max={500}
          onChange={(v) => updateSettings({ visibilityThreshold: v })}
        />
        <SettingsToggle
          label="Shorten long titles"
          description='Show titles on one line with "..."'
          value={settings.shortenTitles}
          onChange={(v) => updateSettings({ shortenTitles: v })}
        />
      </SettingsSection>

      <SettingsSection title="Behavior">
        <SettingsToggle
          label="Open links in new tab"
          description="Open bookmarks in a new browser tab"
          value={settings.openInNewTab}
          onChange={(v) => updateSettings({ openInNewTab: v })}
        />
        <SettingsToggle
          label="Show bookmark descriptions"
          description="Display saved descriptions below bookmark titles"
          value={settings.showDescriptions}
          onChange={(v) => updateSettings({ showDescriptions: v })}
        />
        <SettingsSelect
          label="Default capture board"
          description="Default destination for Quick Save"
          value={settings.defaultCaptureBoardId ?? ""}
          options={boardOptions}
          onChange={(v) =>
            updateSettings({
              defaultCaptureBoardId: v.length > 0 ? v : null,
            })
          }
        />
        <SettingsLink
          label="Shortcut management"
          description="Open browser shortcut settings"
          href="chrome://extensions/shortcuts"
        />
      </SettingsSection>
    </div>
  );
}

// ─── Account Tab ──────────────────────────────────────────
function AccountSettings() {
  const user = useArcalistStore((state) => state.user);
  const signInWithGoogle = useArcalistStore((state) => state.signInWithGoogle);
  const signOut = useArcalistStore((state) => state.signOut);
  const [syncSettingsOpen, setSyncSettingsOpen] = useState(false);

  const downloadData = () => {
    if (!user) return;
    const state = useArcalistStore.getState();
    const payload = {
      app: "Arcalist",
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
      },
      workspace: {
        pages: state.pages,
        activePageId: state.activePageId,
        trash: state.trash,
        overflowBoards: state.overflowBoards,
        privacyMode: state.privacyMode,
        settings: state.settings,
        wallpaperTheme: state.wallpaperTheme,
        updatedAt: state.updatedAt,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `arcalist-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <h2 className="text-[var(--arc-text-primary)] font-bold text-lg mb-6">Account</h2>

      {user ? (
        <div className="flex flex-col gap-3">
          {/* User card */}
          <div className="flex items-center gap-3 bg-surface-2 rounded-xl p-4">
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt=""
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-accent font-bold text-sm">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] text-[var(--arc-text-secondary)] uppercase tracking-wider">
                Signed in as
              </p>
              <p className="text-[var(--arc-accent)] text-sm font-medium truncate">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={downloadData}
                  className="text-[var(--arc-text-secondary)] hover:text-[var(--arc-text-primary)] text-xs transition-colors"
                >
                  Download Data
                </button>
                <span className="text-[var(--arc-text-secondary)]">·</span>
                <a
                  href={`mailto:arizfaiyazwork@gmail.com?subject=${encodeURIComponent(
                    "Arcalist account deletion request",
                  )}&body=${encodeURIComponent(
                    `Please delete my Arcalist account and associated cloud data.\n\nAccount email: ${
                      user.email ?? ""
                    }\nUser ID: ${user.id}`,
                  )}`}
                  className="text-[var(--arc-text-secondary)] hover:text-red-300 text-xs transition-colors"
                >
                  Request Deletion
                </a>
              </div>
            </div>
          </div>

          <button
            onClick={signOut}
            className="w-full py-2.5 rounded-xl text-sm text-slate-300 bg-surface-2 hover:bg-white/10 border border-white/10 transition-all"
          >
            Sign Out
          </button>

          <button
            type="button"
            onClick={() => setSyncSettingsOpen((value) => !value)}
            className="w-full rounded-xl border border-[var(--arc-glass-border)] bg-surface-2 px-4 py-3 text-left text-sm text-[var(--arc-text-primary)] hover:bg-[var(--arc-button-bg)]"
          >
            Cross-browser Sync
            <span className="block text-xs text-[var(--arc-text-secondary)]">
              {syncSettingsOpen ? "Hide sync settings" : "Manage sync settings"}
            </span>
          </button>

          {syncSettingsOpen && <SyncSettings />}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-slate-400 text-sm">
            Sign in to sync your bookmarks across all your devices
            automatically.
          </p>
          <button
            onClick={signInWithGoogle}
            className="w-full py-2.5 rounded-xl text-sm font-medium bg-accent text-background hover:bg-accent-hover transition-all"
          >
            Sign in with Google
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Support Tab ──────────────────────────────────────────
function SupportSettings() {
  return (
    <div className="p-6">
      <h2 className="text-[var(--arc-text-primary)] font-bold text-lg mb-6">Support</h2>

      <div className="bg-surface-2 rounded-xl p-4 flex flex-col gap-3">
        <div>
          <p className="text-[var(--arc-text-primary)] text-sm font-medium">Contact</p>
          <p className="text-[var(--arc-text-secondary)] text-xs mt-1">
            Have a question or feedback? Email us anytime at{" "}
            <a
              href="mailto:arizfaiyazwork@gmail.com"
              className="text-accent hover:underline"
            >
              arizfaiyazwork@gmail.com
            </a>
          </p>
        </div>
        <a
          href="mailto:arizfaiyazwork@gmail.com"
          className="w-full py-2 rounded-xl text-sm text-[var(--arc-text-secondary)] bg-surface hover:bg-[var(--arc-button-bg)] hover:text-[var(--arc-text-primary)] border border-white/10 transition-all flex items-center justify-center"
        >
          Contact Us
        </a>
        <p className="text-[var(--arc-text-secondary)] text-xs opacity-70">Version 1.0.0</p>
      </div>
    </div>
  );
}

// ─── Reusable Components ──────────────────────────────────
function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-3">
        {title}
      </p>
      <div className="bg-surface-2 rounded-xl overflow-hidden divide-y divide-white/5">
        {children}
      </div>
    </div>
  );
}

function SettingsToggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex-1 pr-4">
        <p className="text-[var(--arc-text-primary)] text-sm">{label}</p>
        <p className="text-[var(--arc-text-secondary)] text-xs mt-0.5">{description}</p>
      </div>
      {/* Toggle */}
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "w-10 h-6 rounded-full relative transition-all duration-200 shrink-0",
          value ? "bg-accent" : "bg-surface",
        )}
      >
        <div
          className={cn(
            "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200",
            value ? "left-5" : "left-1",
          )}
        />
      </button>
    </div>
  );
}

function SettingsNumber({
  label,
  description,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex-1 pr-4">
        <p className="text-[var(--arc-text-primary)] text-sm">{label}</p>
        <p className="text-[var(--arc-text-secondary)] text-xs mt-0.5">{description}</p>
      </div>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (!Number.isFinite(next)) return;
          onChange(Math.min(max, Math.max(min, next)));
        }}
        className={cn(
          "w-20 px-2 py-1 rounded-lg text-sm",
          "bg-surface-2 text-[var(--arc-text-primary)] border border-white/10",
          "outline-none focus:border-accent/40",
        )}
      />
    </div>
  );
}

function SettingsSelect({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex-1 pr-4">
        <p className="text-[var(--arc-text-primary)] text-sm">{label}</p>
        <p className="text-[var(--arc-text-secondary)] text-xs mt-0.5">{description}</p>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "px-2 py-1 rounded-lg text-sm",
          "bg-surface-2 text-[var(--arc-text-primary)] border border-white/10",
          "outline-none focus:border-accent/40",
        )}
      >
        <option value="">Inbox / First Board</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SettingsLink({
  label,
  description,
  href,
}: {
  label: string;
  description: string;
  href: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex-1 pr-4">
        <p className="text-[var(--arc-text-primary)] text-sm">{label}</p>
        <p className="text-[var(--arc-text-secondary)] text-xs mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => {
          if (
            href.startsWith("chrome://") &&
            typeof chrome !== "undefined" &&
            chrome.tabs?.create
          ) {
            void chrome.tabs.create({ url: href });
            return;
          }
          window.open(href, "_blank", "noopener,noreferrer");
        }}
        className={cn(
          "px-3 py-1.5 rounded-lg text-xs",
          "bg-surface-2 text-slate-300 border border-white/10",
          "hover:text-white hover:border-accent/30",
        )}
      >
        Open
      </button>
    </div>
  );
}
