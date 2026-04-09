/**
 * useAuth Hook
 * Hook personalizado para acceso al contexto de autenticación
 */

import { useAuth as useAuthContext } from '../auth/AuthContext'

export function useAuth() {
  return useAuthContext()
}
