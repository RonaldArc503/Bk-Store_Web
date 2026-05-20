import { get, onValue, ref, remove, set, update, type Unsubscribe } from 'firebase/database'
import { database } from '../app/firebase'
import {
  DEFAULT_SESSION_LIMITS,
  LOCAL_SESSION_KEY,
  SESSION_STALE_DAYS,
} from '../constants/sessionConfig'
import { getDeviceLabel } from '../utils/deviceLabel'
import type { UserRole } from '../types'

const SESSIONS_PATH = 'sesiones'
const LIMITS_PATH = 'config/sesionesLimites'

export type DeviceSessionRecord = {
  creadaEn: string
  ultimaActividad: string
  revocada?: boolean
  revocadaEn?: string
  deviceLabel: string
  rol: UserRole
}

type SessionEntry = DeviceSessionRecord & { sessionId: string }

const staleMs = () => SESSION_STALE_DAYS * 24 * 60 * 60 * 1000

function nowIso() {
  return new Date().toISOString()
}

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

export function getLocalSessionId(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(LOCAL_SESSION_KEY)
}

export function getOrCreateLocalSessionId(): string {
  const existing = getLocalSessionId()
  if (existing) return existing
  const id = createSessionId()
  localStorage.setItem(LOCAL_SESSION_KEY, id)
  return id
}

export function clearLocalSessionId() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(LOCAL_SESSION_KEY)
}

function isActiveSession(record: DeviceSessionRecord | null | undefined): boolean {
  if (!record || record.revocada) return false
  const last = new Date(record.ultimaActividad || record.creadaEn || 0).getTime()
  if (Number.isNaN(last)) return false
  return Date.now() - last <= staleMs()
}

async function getLimitForRole(rol: UserRole): Promise<number> {
  try {
    const snap = await get(ref(database, LIMITS_PATH))
    if (snap.exists()) {
      const limits = snap.val() as Partial<Record<UserRole, number>>
      const configured = Number(limits[rol])
      if (Number.isFinite(configured) && configured >= 1) {
        return Math.floor(configured)
      }
    }
  } catch (err) {
    console.warn('No se pudieron leer límites de sesión, usando valores por defecto', err)
  }
  return DEFAULT_SESSION_LIMITS[rol] ?? 1
}

async function listSessions(authUid: string): Promise<SessionEntry[]> {
  const snap = await get(ref(database, `${SESSIONS_PATH}/${authUid}`))
  if (!snap.exists()) return []

  const raw = snap.val() as Record<string, DeviceSessionRecord>
  return Object.entries(raw).map(([sessionId, data]) => ({
    sessionId,
    ...data,
  }))
}

function sortOldestFirst(sessions: SessionEntry[]) {
  return [...sessions].sort((a, b) => {
    const ta = new Date(a.creadaEn || 0).getTime()
    const tb = new Date(b.creadaEn || 0).getTime()
    return ta - tb
  })
}

async function revokeSession(authUid: string, sessionId: string) {
  await remove(ref(database, `${SESSIONS_PATH}/${authUid}/${sessionId}`))
}

async function cleanupStaleSessions(authUid: string, sessions: SessionEntry[]) {
  const stale = sessions.filter((s) => !isActiveSession(s))
  await Promise.all(stale.map((s) => revokeSession(authUid, s.sessionId)))
}

/**
 * Registra o renueva la sesión del dispositivo actual.
 * Si se supera el límite del rol, revoca la(s) sesión(es) más antigua(s).
 */
export async function ensureActiveSession(authUid: string, rol: UserRole): Promise<string> {
  const sessionId = getOrCreateLocalSessionId()
  const limit = await getLimitForRole(rol)
  const all = await listSessions(authUid)
  await cleanupStaleSessions(authUid, all)

  const refreshed = await listSessions(authUid)
  const active = refreshed.filter((s) => isActiveSession(s))
  const current = active.find((s) => s.sessionId === sessionId)
  const others = active.filter((s) => s.sessionId !== sessionId)

  const toRevokeCount = Math.max(0, others.length - limit + 1)
  if (toRevokeCount > 0) {
    const victims = sortOldestFirst(others).slice(0, toRevokeCount)
    await Promise.all(victims.map((s) => revokeSession(authUid, s.sessionId)))
  }

  const timestamp = nowIso()
  const payload: DeviceSessionRecord = {
    creadaEn: current?.creadaEn ?? timestamp,
    ultimaActividad: timestamp,
    revocada: false,
    deviceLabel: getDeviceLabel(),
    rol,
  }

  await set(ref(database, `${SESSIONS_PATH}/${authUid}/${sessionId}`), payload)
  return sessionId
}

export async function touchSession(authUid: string, sessionId: string) {
  await update(ref(database, `${SESSIONS_PATH}/${authUid}/${sessionId}`), {
    ultimaActividad: nowIso(),
  })
}

export async function revokeCurrentSession(authUid: string) {
  const sessionId = getLocalSessionId()
  if (!sessionId) return
  try {
    await revokeSession(authUid, sessionId)
  } catch (err) {
    console.warn('Error revocando sesión local', err)
  }
  clearLocalSessionId()
}

export function watchSession(
  authUid: string,
  sessionId: string,
  onRevoked: () => void,
): Unsubscribe {
  return onValue(ref(database, `${SESSIONS_PATH}/${authUid}/${sessionId}`), (snap) => {
    if (!snap.exists()) {
      onRevoked()
      return
    }
    const data = snap.val() as DeviceSessionRecord
    if (data.revocada) {
      onRevoked()
    }
  })
}
