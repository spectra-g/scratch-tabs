import React, { Suspense, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { initializeFormatProviders } from "./formats";
import { broadcastManager } from "./stores/broadcastStore";
import { useThemeStore } from "./stores/themeStore";
import { useRootStore } from "./stores/rootStore";
import { shareService } from "./services/shareService";
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

/**
 * Handler for share URLs (hash-based: #/s/v1/type/metadata/content)
 * Uses hash routing to ensure content never reaches server logs (privacy-focused)
 * Decompresses content and creates a new tab
 */
const ShareURLHandler: React.FC = () => {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double execution
    if (hasProcessed.current) {
      return;
    }

    const processShareUrl = async () => {
      // Check if there's a hash-based share URL
      const hash = window.location.hash;

      // Remove the leading # if present
      const hashPath = hash.startsWith('#') ? hash.substring(1) : hash;

      if (!hashPath || !hashPath.startsWith('/s/')) {
        return; // Not a share URL
      }

      hasProcessed.current = true;

      // Parse the share URL from hash
      const parsed = shareService.parseShareUrl(hashPath);

      if (!parsed) {
        // Clear invalid hash and navigate home
        window.location.hash = '';
        navigate("/", { replace: true });
        return;
      }

      try {
        // Decompress the content
        const decompressedContent = shareService.decompress(parsed.compressed);

        if (!decompressedContent) {
          window.location.hash = '';
          navigate("/", { replace: true });
          return;
        }

        // Apply format-specific trimming if metadata indicates it
        const finalContent = shareService.applyFormatTrim(
          parsed.type,
          decompressedContent,
          parsed.metadata
        );

        // Clear the hash (removes content from URL)
        window.location.hash = '';

        // Navigate to MainLayout with content in state
        navigate("/", {
          replace: true,
          state: {
            pendingShare: {
              title: `Shared ${parsed.type}`,
              content: finalContent,
              language: parsed.type,
              languageLocked: true
            }
          }
        });
      } catch (error) {
        console.error("Error processing share URL:", error);
        window.location.hash = '';
        navigate("/", { replace: true });
      }
    };

    processShareUrl();
  }, [navigate]);

  return null; // No UI needed, just processes hash on mount
};

function App() {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);

  useEffect(() => {
    broadcastManager.initialize();
    useThemeStore.getState().initializeTheme();

    return () => {
      // Optional: broadcastManager.cleanup(); if you want to close the channel
      // when the main app component unmounts, though usually not necessary
      // as channel closes when the browser tab closes.
    };
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
