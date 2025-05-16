import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { initializeLanguageProviders } from './languages';
import { useAIStore } from './stores/aiStore';
import { broadcastManager } from './stores/broadcastStore';

// Initialize language providers once when the app loads
initializeLanguageProviders();

const MainLayout = React.lazy(() => import('./components/Layout/MainLayout'));

const AppLoadingFallback = () => (
  <div className="app-loading-container">
    <div className="app-loading-spinner"></div>
    <p>Loading tabs...</p>
  </div>
);

function App() {

  const initializeAI = useAIStore(state => state.initializeModel); // Get the initializer action

  useEffect(() => {
    // Initialize AI model when the App mounts
    initializeAI().catch(err => {
        console.error("Failed to initialize AI on app mount:", err);
        // Optionally show a global error message to the user
    });
  }, [initializeAI]); // Dependency array includes the action
  
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
      <Routes>
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
