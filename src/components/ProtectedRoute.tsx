/**
 * Protected Route
 * Middleware para proteger rutas privadas
 */

import React from 'react'
import { Navigate } from 'react-router-dom'
import type { Route } from '../app/routes.tsx'

interface ProtectedRouteProps {
  route: Route
  isAuthenticated: boolean
  element: React.ReactElement
}

/**
 * Componente para proteger rutas
 */
export function ProtectedRoute({
  route,
  isAuthenticated,
  element
}: ProtectedRouteProps) {
  if (route.private && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return element
}

/**
 * Verificar si una ruta es accesible
 */
export function isRouteAccessible(route: Route, isAuthenticated: boolean): boolean {
  if (route.private && !isAuthenticated) {
    return false
  }
  return true
}
