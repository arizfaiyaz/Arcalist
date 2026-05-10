import { useState, useEffect } from "react";
import "./App.css";
import "./index.css";
import { NewTabPage } from "./newtab/NewTabPage";
import { useArcalistStore } from "./store/useArcalistStore";
import { OnboardingScreen } from "./components/Onboarding/OnboardingScreen";
import { isOnboarded } from "./lib/onboarding";

type AppState = "checking" | "onboarding" | "app";

function App() {
  const initialize = useArcalistStore((state) => state.initialize);
  const [appState, setAppState] = useState<AppState>("checking");

  useEffect(() => {
    const boot = async () => {
      // Always initialize the store first
      await initialize();

      // Then check if user has been onboarded
      const onboarded = await isOnboarded();

      if (onboarded) {
        setAppState("app");
      } else {
        setAppState("onboarding");
      }
    };

    boot();

    // Listen for Quick Save from service worker
    const handleMessage = (message: { type: string }) => {
      if (
        message.type === "QUICK_SAVE_DONE" ||
        message.type === "CHROME_BOOKMARKS_UPDATED"
      ) {
        initialize();
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
  }, [initialize]);

  // Full-screen spinner while we check storage
  if (appState === "checking") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-slate-500 text-sm">Loading Arcalist...</p>
        </div>
      </div>
    );
  }

  if (appState === "onboarding") {
    return <OnboardingScreen onComplete={() => setAppState("app")} />;
  }

  return <NewTabPage />;
}

export default App;
