import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { initializeLanguageProviders } from './languages';
import { useAIStore } from './stores/aiStore';

// Initialize language providers once when the app loads
initializeLanguageProviders();

const MainLayout = React.lazy(() => import('./components/Layout/MainLayout'));

const AppLoadingFallback = () => (
  <div className="h-screen w-screen flex flex-col justify-center items-center bg-gray-900 text-gray-300">
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-300 mb-4"></div>
    <p>Loading tabs...</p>
  </div>
);

function App() {

  const initializeAI = useAIStore(state => state.initializeModel); // Get the initializer action

  useEffect(() => {
    // Initialize AI model when the App mounts
    console.log("[AI Store] Triggering initial model load...");
    initializeAI().catch(err => {
        console.error("Failed to initialize AI on app mount:", err);
        // Optionally show a global error message to the user
    });
  }, [initializeAI]); // Dependency array includes the action


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
