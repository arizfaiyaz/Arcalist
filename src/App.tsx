import "./App.css";
import "./index.css";
import { SharedPageView } from "./components/sharing/SharedPageView";
import { AuthGate } from "./components/auth/AuthGate";

function App() {
  const shareMatch = window.location.pathname.match(/^\/share\/([^/]+)/);
  const shareToken = shareMatch?.[1] ?? null;

  if (shareToken) {
    return <SharedPageView token={decodeURIComponent(shareToken)} />;
  }

  return <AuthGate />;
}

export default App;
