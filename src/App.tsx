import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Suspense, useEffect } from 'react'
import { AuthProvider } from './auth/AuthContext'
import { CartProvider } from './context/CartContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Loader } from './components/Loader'
import { routes } from './app/routes'
import { useAuth } from './hooks/useAuth'
import { initializeDemoData } from './utils/initDemo'

function AppContent() {
  const { isAuthenticated } = useAuth()

  // Inicializar datos de demo en el primer renderizado
  useEffect(() => {
    initializeDemoData()
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <Suspense fallback={<Loader />}>
        <Routes>
          {routes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={
                route.private ? (
                  <ProtectedRoute
                    route={route}
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
