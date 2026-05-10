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

  if (!user) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={signInWithGoogle}
          disabled={signingIn}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
            "bg-surface-2 text-slate-400 hover:text-white",
            "border border-white/10 hover:border-accent/30",
            "transition-all duration-150",
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
              : syncStatus === "error"
                ? "Sync failed"
                : "Cloud sync active"
        }
      >
        {syncStatus === "syncing" ? (
          <Loader2 size={14} className="text-accent animate-spin" />
        ) : syncStatus === "error" ? (
          <CloudOff size={14} className="text-red-400" />
        ) : (
          <Cloud
            size={14}
            className={cn(
              syncStatus === "synced" ? "text-accent" : "text-slate-500",
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
            className="w-6 h-6 rounded-full border border-white/10"
          />
        )}
        <span className="text-slate-400 text-xs hidden sm:block">
          {user.email}
        </span>
      </div>

      {/* Sign out */}
      <button
        onClick={signOut}
        title="Sign out"
        className="text-slate-500 hover:text-red-400 transition-colors"
      >
        <LogOut size={13} />
      </button>
    </div>
  );
}
