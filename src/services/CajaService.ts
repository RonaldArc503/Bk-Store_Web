import { ref, push, set, get, runTransaction, update } from 'firebase/database'
import { database } from '../app/firebase'

const CAJAS_PATH = 'cajas'

export const CajaService = {
  async openCaja(aperturaInfo: { monto: number; fecha: string; usuario: string; createdBy?: string }) {
    try {
      const cajasRef = ref(database, CAJAS_PATH)
      const newRef = push(cajasRef)
      const id = newRef.key || Math.random().toString(36).substr(2, 9)

      // Build apertura without undefined fields (Firebase rejects undefined values)
      const apertura: Record<string, any> = {
        monto: aperturaInfo.monto,
        fecha: aperturaInfo.fecha,
        usuario: aperturaInfo.usuario,
      }
      if (aperturaInfo.createdBy) {
        apertura.createdBy = aperturaInfo.createdBy
      }

      const caja = {
        id,
        apertura,
        totals: {
          efectivo: 0,
          transferencia: 0,
          qr: 0,
          totalVentas: 0,
        },
        status: 'open',
        createdAt: new Date().toISOString(),
      } as const

      await set(newRef, caja)

      try { localStorage.setItem('activeCajaId', id) } catch (e) { console.warn('localStorage not available') }

      return caja
    } catch (error) {
      console.error('Error opening caja:', error)
      throw error
    }
  },

  async getActiveCaja() {
    try {
      const id = typeof localStorage !== 'undefined' ? localStorage.getItem('activeCajaId') : null
      if (!id) return null

      const snap = await get(ref(database, `${CAJAS_PATH}/${id}`))
      if (!snap.exists()) return null
      return snap.val()
    } catch (error) {
      console.error('Error getting active caja:', error)
      return null
    }
  },

  async getCajaById(id: string) {
    const snap = await get(ref(database, `${CAJAS_PATH}/${id}`))
    if (!snap.exists()) return null
    return snap.val()
  },

  async addSaleToCaja(cajaId: string, sale: { orderId?: string; method: string; amount: number; items?: any[]; createdBy?: string }) {
    try {
      const totalsRef = ref(database, `${CAJAS_PATH}/${cajaId}/totals`)

      await runTransaction(totalsRef, (current) => {
        if (!current) {
          current = { efectivo: 0, transferencia: 0, qr: 0, totalVentas: 0 }
        }

        const amt = Number(sale.amount || 0)
        const method = sale.method || 'efectivo'
        current[method] = (current[method] || 0) + amt
        current.totalVentas = (current.totalVentas || 0) + amt

        return current
      })

      const movRef = ref(database, `${CAJAS_PATH}/${cajaId}/movimientos`)
      const newMovRef = push(movRef)
      const movimiento = {
        id: newMovRef.key || Math.random().toString(36).substr(2, 9),
        orderId: sale.orderId || null,
        method: sale.method,
        amount: sale.amount,
        items: sale.items || [],
        createdBy: sale.createdBy || null,
        createdAt: new Date().toISOString(),
      }

      await set(newMovRef, movimiento)
      return movimiento
    } catch (error) {
      console.error('Error adding sale to caja:', error)
      throw error
    }
  },

  async closeCaja(cajaId: string, cierreData?: any) {
    try {
      const cajaRef = ref(database, `${CAJAS_PATH}/${cajaId}`)
      await update(cajaRef, { status: 'closed', cierreData: cierreData || null, closedAt: new Date().toISOString() })
      try { localStorage.removeItem('activeCajaId') } catch (e) { console.warn('localStorage not available') }
      return true
    } catch (error) {
      console.error('Error closing caja:', error)
      throw error
    }
  },
}
