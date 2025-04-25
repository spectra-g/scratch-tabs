import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { initializeLanguageProviders } from './languages';

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