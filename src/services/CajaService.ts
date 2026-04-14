import { ref, push, set, get, runTransaction, update, remove } from 'firebase/database'
import { database } from '../app/firebase'

const CAJAS_PATH = 'cajas'
const USER_ACTIVE_PATH = 'userActiveCaja'

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

      // If apertura includes a createdBy (user id), persist active caja mapping in Firebase
      if (aperturaInfo.createdBy) {
        try {
          await set(ref(database, `${USER_ACTIVE_PATH}/${aperturaInfo.createdBy}`), id)
        } catch (err) {
          console.warn('Could not persist active caja mapping in Firebase', err)
        }
      }

      return caja
    } catch (error) {
      console.error('Error opening caja:', error)
      throw error
    }
  },

  /**
   * Obtener la caja activa para un usuario. Si `userId` es provisto intenta
   * resolver la caja activa a partir del mapeo `userActiveCaja/<userId>`. Si no
   * existe, intenta buscar una caja con status 'open' creada por el usuario.
   * Si no se proporciona `userId`, devuelve la primera caja abierta encontrada.
   */
  async getActiveCaja(userId?: string) {
    try {
      // If we have a userId, try to read mapping first
      if (userId) {
        try {
          const mapSnap = await get(ref(database, `${USER_ACTIVE_PATH}/${userId}`))
          const mappedId = mapSnap.exists() ? mapSnap.val() : null
          if (mappedId) {
            const snap = await get(ref(database, `${CAJAS_PATH}/${mappedId}`))
            if (snap.exists()) return snap.val()
          }
        } catch (err) {
          console.warn('Error reading user active caja mapping', err)
        }
      }

      // Fallback: scan for any open caja (optionally created by userId)
      const snapAll = await get(ref(database, CAJAS_PATH))
      if (!snapAll.exists()) return null
      const data = snapAll.val()
      const cajas = Object.values(data) as any[]

      if (userId) {
        const found = cajas.find((c) => c.status === 'open' && c.apertura?.createdBy === userId)
        if (found) return found
      }

      // Generic fallback: return first open caja
      return cajas.find((c) => c.status === 'open') || null
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

      // Attempt to clear user-active mapping if present
      try {
        const snap = await get(cajaRef)
        if (snap.exists()) {
          const caja = snap.val()
          const createdBy = caja.apertura?.createdBy
          if (createdBy) {
            await remove(ref(database, `${USER_ACTIVE_PATH}/${createdBy}`))
          }
        }
      } catch (err) {
        console.warn('Error clearing user active caja mapping', err)
      }

      return true
    } catch (error) {
      console.error('Error closing caja:', error)
      throw error
    }
  },
}
