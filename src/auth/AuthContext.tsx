/**
 * Auth Context
 * Contexto global para autenticación y sesión
 */

import React, { createContext, useState, useCallback, type ReactNode } from 'react'

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (data: { user: User; token: string }) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

// Initialize token from localStorage
const initializeToken = (): { token: string | null; isAuthenticated: boolean } => {
  const savedToken = localStorage.getItem('token')
  return {
    token: savedToken || null,
    isAuthenticated: !!savedToken,
  }
}

function AuthProvider({ children }: AuthProviderProps) {
  const { token: initialToken, isAuthenticated: initialAuth } = initializeToken()
  const [user, setUserState] = useState<User | null>(null)
  const [token, setTokenState] = useState<string | null>(initialToken)
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth)

  const login = useCallback(({ user, token }: { user: User; token: string }) => {
    setUserState(user)
    setTokenState(token)
    setIsAuthenticated(true)
    localStorage.setItem('token', token)
  }, [])

  const logout = useCallback(() => {
    setUserState(null)
    setTokenState(null)
    setIsAuthenticated(false)
    localStorage.removeItem('token')
  }, [])

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    login,
    logout,
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
