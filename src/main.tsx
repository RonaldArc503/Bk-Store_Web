import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'react-toastify/dist/ReactToastify.css';
import './styles/index.css';
import './i18n'; // inicializa i18n
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';
import SettingsSync from './components/SettingsSync';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <ThemeProvider>
        <SettingsSync />
        <App />
      </ThemeProvider>
    </SettingsProvider>
  </StrictMode>,
);
