/**
 * Protected Route
 * Middleware para proteger rutas privadas
 */

import React from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Loader } from './Loader'
import { Sidebar } from './Sidebar'
import type { ModuleKey } from '../auth/permissions'

interface ProtectedRouteProps {
  isPrivate: boolean
  isAuthenticated: boolean
  authReady?: boolean
  moduleKey?: ModuleKey
  requiredAccess?: 'view' | 'full'
  hasModuleAccess?: (moduleKey: ModuleKey, required?: 'view' | 'full') => boolean
  element: React.ReactElement
}

/**
 * Componente para proteger rutas
 */
export function ProtectedRoute({
  isPrivate,
  isAuthenticated,
  authReady,
  moduleKey,
  requiredAccess,
  hasModuleAccess,
  element
}: ProtectedRouteProps) {
  const navigate = useNavigate()

  const moduleLinks: Array<{
    id: string
    label: string
    path: string
    moduleKey: ModuleKey
    requiredAccess?: 'view' | 'full'
  }> = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard', moduleKey: 'dashboard' },
    { id: 'pos', label: 'Punto de Venta', path: '/pos', moduleKey: 'pos', requiredAccess: 'full' },
    { id: 'corte', label: 'Corte de Caja', path: '/corte', moduleKey: 'corte', requiredAccess: 'view' },
    { id: 'inventario', label: 'Inventario', path: '/inventory', moduleKey: 'inventory', requiredAccess: 'view' },
    { id: 'reportes', label: 'Reportes', path: '/reports', moduleKey: 'reports' },
    { id: 'usuarios', label: 'Usuarios', path: '/users', moduleKey: 'users' },
    { id: 'configuracion', label: 'Configuracion', path: '/configuracion', moduleKey: 'configuracion' },
  ]

  if (isPrivate && authReady === false) {
    return <Loader />
  }

  if (isPrivate && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (
    isPrivate &&
    moduleKey &&
    hasModuleAccess &&
    !hasModuleAccess(moduleKey, requiredAccess || 'view')
  ) {
    const allowedModules = moduleLinks.filter((item) =>
      hasModuleAccess(item.moduleKey, item.requiredAccess || 'view'),
    )

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 md:flex">
        <Sidebar />
        <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8">
          <div className="max-w-2xl rounded-xl border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-gray-900 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Acceso restringido</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              No tienes permisos para acceder a este modulo.
            </p>

            {allowedModules.length > 0 ? (
              <>
                <p className="mt-5 text-sm text-gray-600 dark:text-gray-300">
                  Puedes ir a uno de tus modulos habilitados:
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {allowedModules.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.path)}
                      className="px-3 py-2 rounded-lg bg-lime-500 hover:bg-lime-600 text-white text-sm font-medium transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-5 text-sm text-gray-600 dark:text-gray-300">
                No hay modulos disponibles para tu usuario. Contacta al administrador.
              </p>
            )}
          </div>
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Tambien puedes usar el menu lateral para navegar.
          </p>
        </main>
      </div>
    )
  }

  return element
}
