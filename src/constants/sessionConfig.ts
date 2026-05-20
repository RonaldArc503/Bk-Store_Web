import type { UserRole } from '../types'

export const LOCAL_SESSION_KEY = 'bk-session-id'

/** Días sin actividad para considerar una sesión expirada. */
export const SESSION_STALE_DAYS = 30

export const SESSION_HEARTBEAT_MS = 3 * 60 * 1000

/** Máximo de dispositivos simultáneos por rol (se puede sobreescribir en Firebase). */
export const DEFAULT_SESSION_LIMITS: Record<UserRole, number> = {
  Administrador: 2,
  Vendedor: 2,
  Bodeguero: 1,
  Caja: 1,
}
