import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Suspense } from 'react'
import { AuthProvider } from './auth/AuthContext'
import { CartProvider } from './context/CartContext'
import { Navbar } from './components/Navbar'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Loader } from './components/Loader'
import { routes } from './app/routes'
import { useAuth } from './hooks/useAuth'

function AppLayout() {
  const location = useLocation()
  const hideNavbar = location.pathname === '/' || location.pathname.startsWith('/dashboard') || location.pathname === '/login'

  return hideNavbar ? null : <Navbar />
}

function AppContent() {
  const { isAuthenticated } = useAuth()

  return (
    <Router>
      <div className="min-h-screen bg-white">
        <AppLayout />
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
    </Router>
  )
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  )
}

export default App
