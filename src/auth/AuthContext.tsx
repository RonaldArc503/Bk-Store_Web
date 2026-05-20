/**
 * Auth Context
 * Contexto global para autenticación y sesión
 */

import React, { createContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { onIdTokenChanged, signOut } from 'firebase/auth'
import { toast } from 'react-toastify'
import { auth } from '../app/firebase'
import { UserService } from '../services/UserService'
import {
  clearLocalSessionId,
  ensureActiveSession,
  revokeCurrentSession,
  touchSession,
  watchSession,
} from '../services/SessionService'
import { SESSION_HEARTBEAT_MS } from '../constants/sessionConfig'
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

  const sessionWatchRef = useRef<(() => void) | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const signingOutRef = useRef(false)

  const clearSessionRuntime = useCallback(() => {
    if (sessionWatchRef.current) {
      sessionWatchRef.current()
      sessionWatchRef.current = null
    }
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
    sessionIdRef.current = null
  }, [])

  const forceSessionLogout = useCallback(async (message?: string) => {
    if (signingOutRef.current) return
    signingOutRef.current = true
    clearSessionRuntime()
    clearLocalSessionId()
    setUserState(null)
    setSystemUser(null)
    setPermissions(null)
    setTokenState(null)
    setIsAuthenticated(false)
    localStorage.removeItem('token')
    try {
      await signOut(auth)
    } catch (err) {
      console.error('Error al cerrar sesión forzada', err)
    }
    if (message) {
      toast.info(message, { autoClose: 6000 })
    }
    signingOutRef.current = false
  }, [clearSessionRuntime])

  const setupDeviceSession = useCallback(
    async (authUid: string, rol: SystemUser['rol']) => {
      clearSessionRuntime()
      const sessionId = await ensureActiveSession(authUid, rol)
      sessionIdRef.current = sessionId

      sessionWatchRef.current = watchSession(authUid, sessionId, () => {
        void forceSessionLogout(
          'Tu sesión se cerró porque iniciaste sesión en otro dispositivo (límite de dispositivos alcanzado).',
        )
      })

      heartbeatRef.current = setInterval(() => {
        const sid = sessionIdRef.current
        if (!sid) return
        void touchSession(authUid, sid).catch((err) => {
          console.warn('Heartbeat de sesión falló', err)
        })
      }, SESSION_HEARTBEAT_MS)
    },
    [clearSessionRuntime, forceSessionLogout],
  )

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
        clearSessionRuntime()

        if (firebaseUser) {
          try {
            const currentToken = await firebaseUser.getIdToken()
            if (!mounted) return

            const resolvedSystemUser = await UserService.resolveUserByAuth(
              firebaseUser.uid,
              firebaseUser.email,
            )
            if (!mounted) return

            const isActiveUser =
              Boolean(resolvedSystemUser) && resolvedSystemUser!.estado === 'Activo'

            if (!isActiveUser) {
              await forceSessionLogout()
              if (mounted) setAuthReady(true)
              return
            }

            const resolvedPermissions = normalizePermissions(
              resolvedSystemUser!.permissions,
              resolvedSystemUser!.rol,
            )

            await setupDeviceSession(firebaseUser.uid, resolvedSystemUser!.rol)
            if (!mounted) return

            setUserState({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
            })
            setSystemUser(resolvedSystemUser)
            setPermissions(resolvedPermissions)
            setTokenState(currentToken)
            setIsAuthenticated(true)
            localStorage.setItem('token', currentToken)

            unsubscribePermissions = UserService.onUserPermissionsChange(
              resolvedSystemUser!.id,
              resolvedSystemUser!.rol,
              (nextPermissions, nextUser) => {
                if (!mounted) return
                setPermissions(nextPermissions)
                if (nextUser) {
                  setSystemUser(nextUser)
                  setIsAuthenticated(nextUser.estado === 'Activo')
                  if (nextUser.estado !== 'Activo') {
                    void forceSessionLogout('Tu cuenta fue desactivada.')
                  }
                }
              },
            )
          } catch (err) {
            console.error('Error configurando sesión de dispositivo', err)
            await forceSessionLogout(
              'No se pudo registrar la sesión en este dispositivo. Intenta de nuevo.',
            )
          }
        } else {
          clearSessionRuntime()
          clearLocalSessionId()
          setUserState(null)
          setSystemUser(null)
          setPermissions(null)
          setTokenState(null)
          setIsAuthenticated(false)
          localStorage.removeItem('token')
        }
        if (mounted) setAuthReady(true)
      },
      (error) => {
        console.error('Auth state error:', error)
        if (!mounted) return
        void forceSessionLogout()
        if (mounted) setAuthReady(true)
      },
    )

    return () => {
      mounted = false
      if (unsubscribePermissions) {
        unsubscribePermissions()
      }
      clearSessionRuntime()
      unsubscribe()
    }
  }, [clearSessionRuntime, forceSessionLogout, setupDeviceSession])

  const login = useCallback(({ user, token }: { user: User; token: string }) => {
    setUserState(user)
    setTokenState(token)
    setIsAuthenticated(true)
    localStorage.setItem('token', token)
    setAuthReady(true)
  }, [])

  const logout = useCallback(() => {
    const uid = user?.uid
    clearSessionRuntime()
    if (uid) {
      void revokeCurrentSession(uid)
    } else {
      clearLocalSessionId()
    }
    void signOut(auth)
    setUserState(null)
    setSystemUser(null)
    setPermissions(null)
    setTokenState(null)
    setIsAuthenticated(false)
    localStorage.removeItem('token')
  }, [user?.uid, clearSessionRuntime])

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
