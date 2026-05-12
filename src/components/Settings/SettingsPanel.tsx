import { useState } from "react";
import { X, Settings, User, HelpCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import { useArcalistStore } from "../../store/useArcalistStore";

type Tab = "general" | "account" | "support";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SettingsPanel({ open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("general");

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[var(--arc-overlay)] backdrop-blur-sm" />

      <div
        className={cn(
          "relative flex w-full max-w-2xl mx-4 h-[480px]",
          "bg-[var(--arc-modal-bg)] border border-[var(--arc-glass-border)] rounded-2xl",
          "shadow-2xl shadow-black/60 overflow-hidden",
        )}
        onClick={(e) => e.stopPropagation()}
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
        <SettingsToggle
          label="Auto close tabs after Save All Tabs"
          description="Automatically close tabs after saving them"
          value={settings.autoCloseAfterSaveAllTabs}
          onChange={(v) => updateSettings({ autoCloseAfterSaveAllTabs: v })}
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
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                Signed in as
              </p>
              <p className="text-accent text-sm font-medium">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <button className="text-slate-500 hover:text-white text-xs transition-colors">
                  Download Data
                </button>
                <span className="text-slate-600">·</span>
                <button className="text-slate-500 hover:text-red-400 text-xs transition-colors">
                  Delete Account
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={signOut}
            className="w-full py-2.5 rounded-xl text-sm text-slate-300 bg-surface-2 hover:bg-white/10 border border-white/10 transition-all"
          >
            Sign Out
          </button>
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
          <p className="text-white text-sm font-medium">Contact</p>
          <p className="text-slate-400 text-xs mt-1">
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
          className="w-full py-2 rounded-xl text-sm text-slate-300 bg-surface hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center"
        >
          Contact Us
        </a>
        <p className="text-slate-600 text-xs">Version 1.0.0</p>
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
        <p className="text-white text-sm">{label}</p>
        <p className="text-slate-500 text-xs mt-0.5">{description}</p>
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
        <p className="text-white text-sm">{label}</p>
        <p className="text-slate-500 text-xs mt-0.5">{description}</p>
      </div>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          "w-20 px-2 py-1 rounded-lg text-sm",
          "bg-surface-2 text-white border border-white/10",
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
        <p className="text-white text-sm">{label}</p>
        <p className="text-slate-500 text-xs mt-0.5">{description}</p>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "px-2 py-1 rounded-lg text-sm",
          "bg-surface-2 text-white border border-white/10",
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
        <p className="text-white text-sm">{label}</p>
        <p className="text-slate-500 text-xs mt-0.5">{description}</p>
      </div>
      <a
        href={href}
        className={cn(
          "px-3 py-1.5 rounded-lg text-xs",
          "bg-surface-2 text-slate-300 border border-white/10",
          "hover:text-white hover:border-accent/30",
        )}
      >
        Open
      </a>
    </div>
  );
}
