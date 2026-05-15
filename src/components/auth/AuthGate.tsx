import { useEffect, useState } from "react";
import { OnboardingScreen } from "../Onboarding/OnboardingScreen";
import { NewTabPage } from "../../newtab/NewTabPage";
import { useAuth } from "../../hooks/useAuth";
import { useArcalistStore } from "../../store/useArcalistStore";
import { EntitlementProvider } from "../../providers/EntitlementProvider";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        <p className="text-sm text-[var(--arc-text-secondary)]">Loading Arcalist...</p>
      </div>
    </div>
  );
}

export function AuthGate() {
  const { user, loading } = useAuth();
  const hydrated = useArcalistStore((state) => state.hydrated);
  const hydrateWorkspaceForUser = useArcalistStore(
    (state) => state.hydrateWorkspaceForUser,
  );
  const [hydrationError, setHydrationError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    let active = true;
    void hydrateWorkspaceForUser(user)
      .then(() => {
        if (active) setHydrationError(null);
      })
      .catch((error) => {
        if (!active) return;
        setHydrationError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      active = false;
    };
  }, [hydrateWorkspaceForUser, user]);

  useEffect(() => {
    if (!user) return;

    const handleMessage = (message: { type?: string }) => {
      if (
        message.type === "QUICK_SAVE_DONE" ||
        message.type === "CHROME_BOOKMARKS_UPDATED"
      ) {
        void hydrateWorkspaceForUser(user);
      }
    };

    if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(handleMessage);
    }

    return () => {
      if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(handleMessage);
      }
    };
  }, [hydrateWorkspaceForUser, user]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <OnboardingScreen onComplete={() => undefined} />;
  }

  if (hydrationError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold text-[var(--arc-text-primary)]">
            Could not load Arcalist
          </h1>
          <p className="mt-2 text-sm text-[var(--arc-text-secondary)]">{hydrationError}</p>
        </div>
      </div>
    );
  }

  if (!hydrated) {
    return <LoadingScreen />;
  }

  return (
    <EntitlementProvider>
      <NewTabPage />
    </EntitlementProvider>
  );
}
