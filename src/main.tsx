import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import 'react-toastify/dist/ReactToastify.css'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeContext'
import { SettingsProvider } from './context/SettingsContext'
import { ToastContainer } from 'react-toastify'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <SettingsProvider>
        <App />
        <ToastContainer position="top-right" autoClose={3000} pauseOnHover theme="colored" />
      </SettingsProvider>
    </ThemeProvider>
  </StrictMode>,
)
