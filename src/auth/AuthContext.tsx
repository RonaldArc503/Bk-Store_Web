/**
 * Auth Context
 * Contexto global para autenticación y sesión
 */

import React, { createContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { onIdTokenChanged, signOut } from 'firebase/auth'
import { auth } from '../app/firebase'

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  authReady: boolean
  login: (data: { user: User; token: string }) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUserState] = useState<User | null>(null)
  const [token, setTokenState] = useState<string | null>(localStorage.getItem('token'))
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    let mounted = true
    const unsubscribe = onIdTokenChanged(
      auth,
      async (firebaseUser) => {
        if (!mounted) return

        if (firebaseUser) {
          const currentToken = await firebaseUser.getIdToken()
          if (!mounted) return
          setUserState({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
          })
          setTokenState(currentToken)
          setIsAuthenticated(true)
          localStorage.setItem('token', currentToken)
        } else {
          setUserState(null)
          setTokenState(null)
          setIsAuthenticated(false)
          localStorage.removeItem('token')
        }
        setAuthReady(true)
      },
      (error) => {
        console.error('Auth state error:', error)
        if (!mounted) return
        setUserState(null)
        setTokenState(null)
        setIsAuthenticated(false)
        localStorage.removeItem('token')
        setAuthReady(true)
      }
    )

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  const login = useCallback(({ user, token }: { user: User; token: string }) => {
    setUserState(user)
    setTokenState(token)
    setIsAuthenticated(true)
    localStorage.setItem('token', token)
    setAuthReady(true)
  }, [])

  const logout = useCallback(() => {
    void signOut(auth)
    setUserState(null)
    setTokenState(null)
    setIsAuthenticated(false)
    localStorage.removeItem('token')
  }, [])

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    authReady,
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
