import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Suspense, useEffect } from 'react'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Loader } from './components/Loader'
import { routes } from './app/routes'
import { useAuth } from './hooks/useAuth'
import { initializeDemoData, ensureDemoAuthAccounts } from './utils/initDemo'

function AppContent() {
  const { isAuthenticated, authReady } = useAuth()

  // Demo en RTDB + cuentas en Firebase Auth (el login usa Auth)
  useEffect(() => {
    void (async () => {
      const env = import.meta.env as { DEV?: boolean; VITE_ENABLE_DEMO?: string; VITE_ENABLE_DEMO_AUTH?: string }
      const enableDemo = Boolean(env.DEV) && env.VITE_ENABLE_DEMO === 'true'

      if (!enableDemo) return

      await initializeDemoData()

      // Crear cuentas en Firebase Auth solo si la variable Vite VITE_ENABLE_DEMO_AUTH está activada.
      // Esto evita intentos automáticos de signup en entornos donde la API Key/Auth no está configurada.
      try {
        const enableDemoAuth = env.VITE_ENABLE_DEMO_AUTH === 'true'
        if (enableDemoAuth) {
          await ensureDemoAuthAccounts()
        }
      } catch (e) {
        console.warn('Skipping demo auth account creation:', e)
      }
    })()
  }, [])

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Suspense fallback={<Loader />}>
        <Routes>
          {routes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={
                route.private ? (
                  <ProtectedRoute
                    isPrivate={route.private}
                    isAuthenticated={isAuthenticated}
                    authReady={authReady}
                    element={<route.component />}
                  />
                ) : (
                  <route.component />
                )
              }
            />
          ))}
        </Routes>
      </Suspense>
    </div>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  )
}

export default App
