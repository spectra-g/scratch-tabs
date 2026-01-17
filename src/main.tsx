import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Initialize pipeline system (registers core categories)
import "./services/pipeline/init";

import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
