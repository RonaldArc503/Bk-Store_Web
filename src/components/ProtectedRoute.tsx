/**
 * Protected Route
 * Middleware para proteger rutas privadas
 */

import React from 'react'
import { Navigate } from 'react-router-dom'
import { Loader } from './Loader'

interface ProtectedRouteProps {
  isPrivate: boolean
  isAuthenticated: boolean
  authReady?: boolean
  element: React.ReactElement
}

/**
 * Componente para proteger rutas
 */
export function ProtectedRoute({
  isPrivate,
  isAuthenticated,
  authReady,
  element
}: ProtectedRouteProps) {
  if (isPrivate && authReady === false) {
    return <Loader />
  }

  if (isPrivate && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return element
}
