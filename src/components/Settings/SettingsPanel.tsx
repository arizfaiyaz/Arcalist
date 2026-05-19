import { useRef, useState } from "react";
import {
  CheckCircle2,
  Crown,
  HelpCircle,
  RefreshCw,
  Settings,
  User,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useArcalistStore } from "../../store/useArcalistStore";
import { usePlanLimits } from "../../hooks/usePlanLimits";
import { SyncSettings } from "./SyncSettings";

type Tab = "general" | "account" | "support";

type Props = {
  open: boolean;
  onClose: () => void;
  onUpgradeRequest: () => void;
};

export function SettingsPanel({ open, onClose, onUpgradeRequest }: Props) {
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
          "arc-glass-strong relative mx-4 flex h-[min(520px,calc(100vh-2rem))] w-full max-w-2xl rounded-2xl",
          "overflow-hidden",
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
            aria-label="Close settings"
            className="absolute right-3 top-3 rounded-full p-1 text-[var(--arc-text-secondary)] hover:bg-[var(--arc-button-hover-bg)] hover:text-[var(--arc-text-primary)]"
          >
            <X size={15} />
          </button>

          {tab === "general" && <GeneralSettings />}
          {tab === "account" && (
            <AccountSettings onUpgradeRequest={onUpgradeRequest} />
          )}
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
function AccountSettings({
  onUpgradeRequest,
}: {
  onUpgradeRequest: () => void;
}) {
  const user = useArcalistStore((state) => state.user);
  const signInWithGoogle = useArcalistStore((state) => state.signInWithGoogle);
  const signOut = useArcalistStore((state) => state.signOut);
  const [syncSettingsOpen, setSyncSettingsOpen] = useState(false);

  const handleSignOut = () => {
    if (!window.confirm("Sign out of Arcalist?")) return;
    void signOut();
  };

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
          <div className="flex items-center gap-3 rounded-xl border border-[var(--arc-glass-border)] bg-[var(--arc-button-bg)] p-4">
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt=""
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--arc-button-active-bg)]">
                <span className="text-sm font-bold text-[var(--arc-accent)]">
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

          <ArcalistProSettings onUpgradeRequest={onUpgradeRequest} />

          <button
            onClick={handleSignOut}
            className="arc-btn arc-btn-secondary w-full"
          >
            Sign Out
          </button>

          <button
            type="button"
            onClick={() => setSyncSettingsOpen((value) => !value)}
            className="w-full rounded-xl border border-[var(--arc-glass-border)] bg-[var(--arc-button-bg)] px-4 py-3 text-left text-sm text-[var(--arc-text-primary)] hover:bg-[var(--arc-button-hover-bg)]"
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
          <p className="text-sm text-[var(--arc-text-secondary)]">
            Sign in to sync your bookmarks across all your devices
            automatically.
          </p>
          <button
            onClick={signInWithGoogle}
            className="arc-btn arc-btn-primary w-full"
          >
            Sign in with Google
          </button>
        </div>
      )}
    </div>
  );
}

function ArcalistProSettings({
  onUpgradeRequest,
}: {
  onUpgradeRequest: () => void;
}) {
  const planLimits = usePlanLimits();
  const [refreshing, setRefreshing] = useState(false);
  const loading = Boolean(planLimits.loading);
  const isProUser = planLimits.isProUser;

  const handleRefresh = async () => {
    if (!planLimits.refreshPlan) return;
    setRefreshing(true);
    try {
      await planLimits.refreshPlan();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--arc-glass-border)] bg-[var(--arc-button-bg)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--arc-glass-border)] bg-[var(--arc-button-active-bg)] text-[var(--arc-accent)]">
            <Crown size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-[var(--arc-text-primary)]">
                Arcalist Pro
              </p>
              {!loading && isProUser && (
                <span className="inline-flex items-center gap-1 rounded-md border border-[var(--arc-accent)]/35 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--arc-accent)]">
                  <CheckCircle2 size={11} />
                  Active
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-[var(--arc-text-secondary)]">
              {loading
                ? "Checking your plan..."
                : isProUser
                  ? "Current plan: Pro"
                  : "Current plan: Free"}
            </p>
            {!loading && !isProUser && (
              <p className="mt-2 text-xs leading-5 text-[var(--arc-text-secondary)]">
                Unlock unlimited boards, premium themes, smart collections,
                analytics, sharing, and sync.
              </p>
            )}
            {!loading && isProUser && (
              <p className="mt-2 text-xs leading-5 text-[var(--arc-text-secondary)]">
                Billing management will be available soon.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <button type="button" disabled className="arc-btn arc-btn-secondary w-full">
            <RefreshCw size={14} className="animate-spin" />
            Checking plan...
          </button>
        ) : isProUser ? (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="arc-btn arc-btn-secondary w-full"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh Pro status
          </button>
        ) : (
          <button
            type="button"
            onClick={onUpgradeRequest}
            className="arc-btn arc-btn-primary w-full"
          >
            Upgrade to Pro
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Support Tab ──────────────────────────────────────────
function SupportSettings() {
  return (
    <div className="p-6">
      <h2 className="text-[var(--arc-text-primary)] font-bold text-lg mb-6">Support</h2>

      <div className="flex flex-col gap-3 rounded-xl border border-[var(--arc-glass-border)] bg-[var(--arc-button-bg)] p-4">
        <div>
          <p className="text-[var(--arc-text-primary)] text-sm font-medium">Contact</p>
          <p className="text-[var(--arc-text-secondary)] text-xs mt-1">
            Have a question or feedback? Email us anytime at{" "}
            <a
              href="mailto:arizfaiyazwork@gmail.com"
              className="text-[var(--arc-accent)] hover:underline"
            >
              arizfaiyazwork@gmail.com
            </a>
          </p>
        </div>
        <a
          href="mailto:arizfaiyazwork@gmail.com"
          className="arc-btn arc-btn-secondary w-full"
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
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--arc-text-secondary)]">
        {title}
      </p>
      <div className="overflow-hidden rounded-xl border border-[var(--arc-glass-border)] bg-[var(--arc-button-bg)] divide-y divide-[var(--arc-glass-border)]">
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
        type="button"
        onClick={() => onChange(!value)}
        aria-pressed={value}
        aria-label={label}
        className={cn(
          "w-10 h-6 rounded-full relative transition-all duration-200 shrink-0",
          value ? "bg-[var(--arc-accent)]" : "bg-[var(--arc-glass-bg)]",
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
        aria-label={label}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (!Number.isFinite(next)) return;
          onChange(Math.min(max, Math.max(min, next)));
        }}
        className={cn(
          "w-20 px-2 py-1 rounded-lg text-sm",
          "arc-input",
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
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "px-2 py-1 rounded-lg text-sm",
          "arc-input",
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
        type="button"
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
          "arc-btn arc-btn-secondary min-h-8 px-3 text-xs",
        )}
      >
        Open
      </button>
    </div>
  );
}
