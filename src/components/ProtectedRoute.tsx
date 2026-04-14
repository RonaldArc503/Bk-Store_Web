/**
 * Protected Route
 * Middleware para proteger rutas privadas
 */

import React from 'react'
import { Navigate } from 'react-router-dom'

interface ProtectedRouteProps {
  isPrivate: boolean
  isAuthenticated: boolean
  element: React.ReactElement
}

/**
 * Componente para proteger rutas
 */
export function ProtectedRoute({
  isPrivate,
  isAuthenticated,
  element
}: ProtectedRouteProps) {
  if (isPrivate && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return element
}
