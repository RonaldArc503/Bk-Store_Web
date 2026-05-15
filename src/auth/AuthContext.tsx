/**
 * Auth Context
 * Contexto global para autenticación y sesión
 */

import React, { createContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { onIdTokenChanged, signOut } from 'firebase/auth'
import { auth } from '../app/firebase'
import { UserService } from '../services/UserService'
import type { SystemUser } from '../types'
import {
  hasConfigSectionPermission,
  hasModulePermission,
  normalizePermissions,
  type ConfigSectionKey,
  type ModuleKey,
  type UserPermissions,
} from './permissions'

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthContextType {
  user: User | null
  systemUser: SystemUser | null
  permissions: UserPermissions | null
  token: string | null
  isAuthenticated: boolean
  authReady: boolean
  login: (data: { user: User; token: string }) => void
  logout: () => void
  hasModuleAccess: (moduleKey: ModuleKey, required?: 'view' | 'full') => boolean
  hasConfigSectionAccess: (section: ConfigSectionKey) => boolean
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUserState] = useState<User | null>(null)
  const [systemUser, setSystemUser] = useState<SystemUser | null>(null)
  const [permissions, setPermissions] = useState<UserPermissions | null>(null)
  const [token, setTokenState] = useState<string | null>(localStorage.getItem('token'))
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    let mounted = true
    let unsubscribePermissions: (() => void) | null = null
    const unsubscribe = onIdTokenChanged(
      auth,
      async (firebaseUser) => {
        if (!mounted) return

        if (unsubscribePermissions) {
          unsubscribePermissions()
          unsubscribePermissions = null
        }

        if (firebaseUser) {
          const currentToken = await firebaseUser.getIdToken()
          if (!mounted) return

          const resolvedSystemUser = await UserService.resolveUserByAuth(firebaseUser.uid, firebaseUser.email)
          if (!mounted) return

          const resolvedPermissions = normalizePermissions(
            resolvedSystemUser?.permissions,
            resolvedSystemUser?.rol,
          )

          setUserState({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
          })
          setSystemUser(resolvedSystemUser)
          setPermissions(resolvedPermissions)
          setTokenState(currentToken)
          setIsAuthenticated(Boolean(resolvedSystemUser && resolvedSystemUser.estado === 'Activo'))
          localStorage.setItem('token', currentToken)

          if (resolvedSystemUser?.id) {
            unsubscribePermissions = UserService.onUserPermissionsChange(
              resolvedSystemUser.id,
              resolvedSystemUser.rol,
              (nextPermissions, nextUser) => {
                if (!mounted) return
                setPermissions(nextPermissions)
                if (nextUser) {
                  setSystemUser(nextUser)
                  setIsAuthenticated(nextUser.estado === 'Activo')
                }
              },
            )
          }
        } else {
          setUserState(null)
          setSystemUser(null)
          setPermissions(null)
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
        setSystemUser(null)
        setPermissions(null)
        setTokenState(null)
        setIsAuthenticated(false)
        localStorage.removeItem('token')
        setAuthReady(true)
      }
    )

    return () => {
      mounted = false
      if (unsubscribePermissions) {
        unsubscribePermissions()
      }
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
    setSystemUser(null)
    setPermissions(null)
    setTokenState(null)
    setIsAuthenticated(false)
    localStorage.removeItem('token')
  }, [])

  const hasModuleAccess = useCallback(
    (moduleKey: ModuleKey, required: 'view' | 'full' = 'view') =>
      hasModulePermission(permissions, moduleKey, required),
    [permissions],
  )

  const hasConfigSectionAccess = useCallback(
    (section: ConfigSectionKey) => hasConfigSectionPermission(permissions, section),
    [permissions],
  )

  const value: AuthContextType = {
    user,
    systemUser,
    permissions,
    token,
    isAuthenticated,
    authReady,
    login,
    logout,
    hasModuleAccess,
    hasConfigSectionAccess,
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
