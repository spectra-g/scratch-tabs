import MainLayout from './components/Layout/MainLayout';
import { initializeLanguageProviders } from './languages'; // Or './services/languageService'

// Initialize language providers once when the app loads
initializeLanguageProviders();

function App() {
  return <MainLayout/>;
}

export default App;