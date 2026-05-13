import { Cloud, CloudOff, Loader2, LogOut, LogIn } from "lucide-react";
import { cn } from "../lib/utils";
import { useArcalistStore } from "../store/useArcalistStore";

export function AuthStatus() {
  const user = useArcalistStore((state) => state.user);
  const syncStatus = useArcalistStore((state) => state.syncStatus);
  const signInWithGoogle = useArcalistStore((state) => state.signInWithGoogle);
  const signOut = useArcalistStore((state) => state.signOut);
  const signingIn = useArcalistStore((state) => state.signingIn);
  const signInError = useArcalistStore((state) => state.signInError);
  const handleSignOut = () => {
    if (!window.confirm("Sign out of Arcalist?")) return;
    void signOut();
  };

  if (!user) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={signingIn}
          className={cn(
            "arc-btn arc-btn-secondary min-h-8 rounded-full px-3 text-sm",
            signingIn && "opacity-60 cursor-not-allowed",
          )}
        >
          {signingIn ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <LogIn size={13} />
          )}
          {signingIn ? "Signing in..." : "Sign in to sync"}
        </button>
        {signInError && (
          <p className="text-[10px] text-red-400 max-w-48 text-right">
            {signInError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Sync status icon */}
      <div
        title={
          syncStatus === "syncing"
            ? "Syncing..."
            : syncStatus === "synced"
              ? "Synced to cloud"
              : syncStatus === "offline"
                ? "Offline"
                : syncStatus === "conflict"
                  ? "Conflict resolved"
              : syncStatus === "error"
                ? "Sync failed"
                : "Cloud sync active"
        }
      >
        {syncStatus === "syncing" ? (
          <Loader2 size={14} className="animate-spin text-[var(--arc-accent)]" />
        ) : syncStatus === "error" || syncStatus === "offline" ? (
          <CloudOff
            size={14}
            className={syncStatus === "offline" ? "text-amber-300" : "text-red-400"}
          />
        ) : (
          <Cloud
            size={14}
            className={cn(
              syncStatus === "synced" || syncStatus === "conflict"
                ? "text-[var(--arc-accent)]"
                : "text-[var(--arc-text-secondary)]",
            )}
          />
        )}
      </div>

      {/* Avatar + email */}
      <div className="flex items-center gap-2">
        {user.user_metadata?.avatar_url && (
          <img
            src={user.user_metadata.avatar_url}
            alt=""
            className="h-6 w-6 rounded-full border border-[var(--arc-glass-border)]"
          />
        )}
        <span className="hidden text-xs text-[var(--arc-text-secondary)] sm:block">
          {user.email}
        </span>
      </div>

      {/* Sign out */}
      <button
        type="button"
        onClick={handleSignOut}
        title="Sign out"
        aria-label="Sign out"
        className="text-[var(--arc-text-secondary)] transition-colors hover:text-red-400"
      >
        <LogOut size={13} />
      </button>
    </div>
  );
}
