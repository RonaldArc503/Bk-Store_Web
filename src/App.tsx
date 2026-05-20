import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Suspense, useEffect, useRef } from 'react'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Loader } from './components/Loader'
import { routes } from './app/routes'
import { useAuth } from './hooks/useAuth'
import { initializeDemoData, ensureDemoAuthAccounts } from './utils/initDemo'
import { useSettings } from './context/SettingsContext'
import { MaintenanceService } from './services/MaintenanceService'
import { toast } from 'react-toastify'

function AppContent() {
  const { isAuthenticated, authReady, hasModuleAccess } = useAuth()
  const { settings, updateBackupAutomation } = useSettings()
  const location = useLocation()
  const autoBackupRunningRef = useRef(false)

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

  useEffect(() => {
    if (!authReady || !isAuthenticated) return
    const cfg = settings.backupAutomation
    if (!cfg.enabled) return

    const runIfDue = async () => {
      if (autoBackupRunningRef.current) return

      const now = new Date()
      const y = now.getFullYear()
      const m = String(now.getMonth() + 1).padStart(2, '0')
      const d = String(now.getDate()).padStart(2, '0')
      const runKey = `${cfg.scheduleType}-${y}-${m}-${d}`

      const isDue =
        cfg.scheduleType === 'monthly'
          ? now.getDate() === cfg.monthlyDay
          : now.getDay() === cfg.weeklyDay

      if (!isDue || cfg.lastRunKey === runKey) return

      autoBackupRunningRef.current = true
      const currentModule =
        routes.find((r) => r.private && (r.path === location.pathname || (r.path !== '/' && location.pathname.startsWith(r.path))))?.name ||
        'Modulo actual'

      toast.info(`[${currentModule}] Se descargara el backup automatico.`)
      try {
        if (cfg.format === 'xlsx') {
          await MaintenanceService.downloadFullBackupExcel(settings)
        } else {
          await MaintenanceService.downloadFullBackupJson(settings)
        }
        updateBackupAutomation({ lastRunKey: runKey })
        toast.success('Backup automatico descargado')
      } catch (error) {
        console.error('Automatic backup failed:', error)
        toast.error('No se pudo descargar el backup automatico')
      } finally {
        autoBackupRunningRef.current = false
      }
    }

    void runIfDue()
    const timer = window.setInterval(() => {
      void runIfDue()
    }, 60_000)

    return () => window.clearInterval(timer)
  }, [
    authReady,
    isAuthenticated,
    location.pathname,
    settings,
    settings.backupAutomation,
    updateBackupAutomation,
  ])

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
                    moduleKey={route.moduleKey}
                    requiredAccess={route.requiredAccess}
                    hasModuleAccess={hasModuleAccess}
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
