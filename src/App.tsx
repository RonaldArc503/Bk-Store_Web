import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Suspense, useEffect } from 'react'
import { AuthProvider } from './auth/AuthContext'
import { CartProvider } from './context/CartContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Loader } from './components/Loader'
import { routes } from './app/routes'
import { useAuth } from './hooks/useAuth'
import { initializeDemoData, ensureDemoAuthAccounts } from './utils/initDemo'

function AppContent() {
  const { isAuthenticated } = useAuth()

  // Demo en RTDB + cuentas en Firebase Auth (el login usa Auth)
  useEffect(() => {
    void (async () => {
      await initializeDemoData()

      // Crear cuentas en Firebase Auth solo si la variable Vite VITE_ENABLE_DEMO_AUTH está activada.
      // Esto evita intentos automáticos de signup en entornos donde la API Key/Auth no está configurada.
      try {
        // import.meta.env.VITE_ENABLE_DEMO_AUTH se inyecta por Vite (cadena 'true' para activar)
        // También solo en modo desarrollo
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const enableDemoAuth = import.meta.env?.VITE_ENABLE_DEMO_AUTH === 'true' && import.meta.env?.DEV
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
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
