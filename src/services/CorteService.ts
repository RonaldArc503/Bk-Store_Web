import { ref, push, set, get, query, orderByChild } from 'firebase/database'
import { database } from '../app/firebase'

const CORTES_PATH = 'cortes'

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
  }
  totalVentas: number
  remesas: { id: number; monto: number; motivo?: string }[]
  totalRemesas: number
  efectivoContado: number
  transferenciasContado: number
  qrContado: number
  esperadoEfectivo: number
  notas: string
  createdBy: string | null
  createdAt: string
}

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const CorteService = {
  async saveCorte(corte: any) {
    const cortesRef = ref(database, CORTES_PATH)
    const newRef = push(cortesRef)
    const id = newRef.key!
    const record = { ...corte, id, dateKey: toDateKey(new Date()) }
    await set(newRef, record)
    return { id, corte: record }
  },

  async getCorteById(id: string) {
    const snap = await get(ref(database, `${CORTES_PATH}/${id}`))
    if (!snap.exists()) return null
    return snap.val() as CorteRecord
  },

  async getTodayCorte(): Promise<CorteRecord | null> {
    const today = toDateKey(new Date())
    const snap = await get(ref(database, CORTES_PATH))
    if (!snap.exists()) return null
    const data = snap.val() as Record<string, any>
    for (const key of Object.keys(data)) {
      const c = data[key]
      const cDateKey = c.dateKey || (c.createdAt ? toDateKey(new Date(c.createdAt)) : null)
      if (cDateKey === today) return { ...c, id: c.id || key } as CorteRecord
    }
    return null
  },

  async hasTodayCorte(): Promise<boolean> {
    const corte = await this.getTodayCorte()
    return corte !== null
  },

  async getAllCortes(): Promise<CorteRecord[]> {
    const snap = await get(query(ref(database, CORTES_PATH), orderByChild('createdAt')))
    if (!snap.exists()) return []
    const data = snap.val() as Record<string, any>
    const list: CorteRecord[] = Object.entries(data).map(([key, val]) => ({
      ...val,
      id: val.id || key,
    }))
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return list
  },
}
