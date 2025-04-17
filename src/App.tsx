import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import { initializeLanguageProviders } from './languages';

// Initialize language providers once when the app loads
initializeLanguageProviders();

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/:identifier?" element={<MainLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;