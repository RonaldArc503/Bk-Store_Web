import { ref, push, set, get, runTransaction, remove } from 'firebase/database'
import { database } from '../app/firebase'

const CORTES_PATH = 'cortes'
const CORTES_BY_DATE_PATH = 'cortesByDate'

export interface CorteRecord {
  id: string
  aperturaInfo: {
    monto: number
    fecha: string
    usuario: string
  }
  ventasDia: {
    efectivo: number
    transferencia: number
    qr: number
    tarjeta: number
  }
  totalVentas: number
  remesas: { id: number; monto: number; motivo?: string }[]
  totalRemesas: number
  abonos?: { id: number; monto: number; motivo?: string }[]
  totalAbonos?: number
  efectivoContado: number
  transferenciasContado: number
  qrContado: number
  tarjetaContado: number
  esperadoEfectivo: number
  notas: string
  createdBy: string | null
  createdAt: string
  dateKey?: string
}

type SaveCorteInput = Omit<CorteRecord, 'id'>

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const CorteService = {
  async saveCorte(corte: SaveCorteInput) {
    const cortesRef = ref(database, CORTES_PATH)
    const newRef = push(cortesRef)
    const id = newRef.key
    if (!id) {
      throw new Error('No se pudo generar el identificador del corte')
    }

    const createdAt = corte.createdAt || new Date().toISOString()
    const dateKey = toDateKey(new Date(createdAt))
    const dayLockRef = ref(database, `${CORTES_BY_DATE_PATH}/${dateKey}`)

    const txResult = await runTransaction(dayLockRef, (current) => {
      if (current) return
      return { id, createdAt }
    })

    if (!txResult.committed) {
      const duplicateError = new Error('Ya existe un cierre de caja para este dia')
      ;(duplicateError as Error & { code?: string }).code = 'CLOSE_ALREADY_EXISTS'
      throw duplicateError
    }

    const record = { ...corte, id, dateKey, createdAt }

    try {
      await set(newRef, record)
      return { id, corte: record }
    } catch (error) {
      const lockSnap = await get(dayLockRef)
      const lock = lockSnap.exists() ? lockSnap.val() as { id?: string } : null
      if (lock?.id === id) {
        await remove(dayLockRef)
      }
      throw error
    }
  },

  async getCorteById(id: string) {
    const snap = await get(ref(database, `${CORTES_PATH}/${id}`))
    if (!snap.exists()) return null
    return snap.val() as CorteRecord
  },

  async getTodayCorte(): Promise<CorteRecord | null> {
    const today = toDateKey(new Date())

    const dayLockSnap = await get(ref(database, `${CORTES_BY_DATE_PATH}/${today}`))
    if (dayLockSnap.exists()) {
      const dayLock = dayLockSnap.val() as { id?: string }
      if (dayLock.id) {
        const current = await this.getCorteById(dayLock.id)
        if (current) return current
      }
    }

    const snap = await get(ref(database, CORTES_PATH))
    if (!snap.exists()) return null
    const data = snap.val() as Record<string, any>
    const matches: CorteRecord[] = []
    for (const [key, c] of Object.entries(data)) {
      const cDateKey = c.dateKey || (c.createdAt ? toDateKey(new Date(c.createdAt)) : null)
      if (cDateKey === today) {
        matches.push({ ...c, id: c.id || key } as CorteRecord)
      }
    }
    if (matches.length === 0) return null
    matches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return matches[0]
  },

  async hasTodayCorte(): Promise<boolean> {
    const corte = await this.getTodayCorte()
    return corte !== null
  },

  /** Último cierre registrado antes del día calendario actual (para apertura automática). */
  async getPreviousCorteForApertura(): Promise<CorteRecord | null> {
    const today = toDateKey(new Date())
    const cortes = await this.getAllCortes()
    for (const corte of cortes) {
      const key = corte.dateKey || (corte.createdAt ? toDateKey(new Date(corte.createdAt)) : '')
      if (key && key < today) return corte
    }
    return null
  },

  async getAllCortes(): Promise<CorteRecord[]> {
    try {
      const snap = await get(ref(database, CORTES_PATH))
      if (!snap.exists()) return []
      const data = snap.val() as Record<string, any>
      const list: CorteRecord[] = Object.entries(data).map(([key, val]) => ({
        ...val,
        id: val.id || key,
      }))
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      return list
    } catch (error) {
      console.error('Error getting all cortes:', error)
      return []
    }
  },

  async deleteCorteForReopen(corteId: string): Promise<void> {
    const corteRef = ref(database, `${CORTES_PATH}/${corteId}`)
    const corteSnap = await get(corteRef)
    if (!corteSnap.exists()) return

    const corte = corteSnap.val() as Partial<CorteRecord> & { dateKey?: string }
    const dateKey =
      corte.dateKey ||
      (corte.createdAt ? toDateKey(new Date(corte.createdAt)) : toDateKey(new Date()))
    const dayLockRef = ref(database, `${CORTES_BY_DATE_PATH}/${dateKey}`)

    await remove(corteRef)

    const lockSnap = await get(dayLockRef)
    if (!lockSnap.exists()) return
    const lock = lockSnap.val() as { id?: string }
    if (lock?.id === corteId) {
      await remove(dayLockRef)
    }
  },
}
