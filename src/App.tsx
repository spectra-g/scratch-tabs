import React, { Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { initializeFormatProviders } from "./formats";
import { broadcastManager } from "./stores/broadcastStore";
import { useThemeStore } from "./stores/themeStore";
import { ShareURLHandler } from "./components/Share/ShareURLHandler";
import DragDropOverlay from "./components/DragDropOverlay";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

// Initialize language providers once when the app loads
initializeFormatProviders();

const MainLayout = React.lazy(() => import("./components/Layout/MainLayout"));
// const OGWelcomeScreen = React.lazy(() => import('./components/Welcome/OGWelcomeScreen').then(module => ({ default: module.OGWelcomeScreen })));

const AppLoadingFallback = () => (
  <div className="app-loading-container">
    <div className="app-loading-spinner"></div>
    <p>Loading tabs...</p>
  </div>
);

function App() {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);

  useEffect(() => {
    broadcastManager.initialize();
    useThemeStore.getState().initializeTheme();
  }, []);

  useEffect(() => {
    monaco.editor.setTheme(isDarkMode ? "vs-dark" : "vs");
  }, [isDarkMode]);

  return (
    <BrowserRouter>
      <DragDropOverlay />
      {/* Hash-based share URL handler - runs on app load, never sends content to server */}
      <ShareURLHandler />
      <Routes>
        {/* <Route
          path="/og-image"
          element={
            <Suspense fallback={<AppLoadingFallback />}>
              <OGWelcomeScreen />
            </Suspense>
          }
        /> */}

        {/* Main layout - catch-all route */}
        <Route
          path="/:identifier?"
          element={
            <Suspense fallback={<AppLoadingFallback />}>
              <MainLayout />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
