import React, { Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { initializeFormatProviders } from "./formats";
import { broadcastManager } from "./stores/broadcastStore";
import DragDropOverlay from "./components/DragDropOverlay";

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
  useEffect(() => {
    broadcastManager.initialize();

    return () => {
      // Optional: broadcastManager.cleanup(); if you want to close the channel
      // when the main app component unmounts, though usually not necessary
      // as channel closes when the browser tab closes.
    };
  }, []);

  return (
    <BrowserRouter>
      <DragDropOverlay />
      <Routes>
        {/* <Route
          path="/og-image"
          element={
            <Suspense fallback={<AppLoadingFallback />}>
              <OGWelcomeScreen />
            </Suspense>
          }
        /> */}
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
