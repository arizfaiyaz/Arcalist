import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import App from "../App.tsx";
import { applyThemeByIdFromCache } from "../lib/themeBootstrap";

applyThemeByIdFromCache();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
