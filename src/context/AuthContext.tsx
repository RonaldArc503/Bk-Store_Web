/**
 * Auth Context
 * Contexto global para autenticación
 */

import React, { createContext, useState, useCallback, type ReactNode } from 'react'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (user: User) => void
  logout: () => void
  setUser: (user: User | null) => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUserState] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const login = useCallback((newUser: User) => {
    setUserState(newUser)
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(() => {
    setUserState(null)
    setIsAuthenticated(false)
  }, [])

  const setUser = useCallback((newUser: User | null) => {
    setUserState(newUser)
    setIsAuthenticated(!!newUser)
  }, [])

  const value: AuthContextType = {
    user,
    isAuthenticated,
    login,
    logout,
    setUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook para usar el contexto de autenticación
 */
export function useAuth(): AuthContextType {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}

export { AuthProvider }
