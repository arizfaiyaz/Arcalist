import { useEffect } from "react";
import "./App.css";
import "./index.css";
import { NewTabPage } from "./newtab/NewTabPage";
import { useArcalistStore } from "./store/useArcalistStore";
import { OnboardingScreen } from "./components/Onboarding/OnboardingScreen";

function App() {
  const initialize = useArcalistStore((state) => state.initialize);
  const user = useArcalistStore((state) => state.user);
  const hydrated = useArcalistStore((state) => state.hydrated);
  const authReady = useArcalistStore((state) => state.authReady);

  useEffect(() => {
    const boot = async () => {
      // Always initialize the store first
      await initialize();
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
  if (!hydrated || !authReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-slate-500 text-sm">Loading Arcalist...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <OnboardingScreen onComplete={() => {}} />;
  }

  return <NewTabPage />;
}

export default App;
