import { ref, push, set, get, update, remove, increment } from 'firebase/database'
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
          tarjeta: 0,
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
      const snapAll = await get(ref(database, CAJAS_PATH))
      if (!snapAll.exists()) return null
      const data = snapAll.val()
      const cajas = Object.values(data) as any[]
      const openCajas = cajas
        .filter((c) => c?.status === 'open')
        .sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime())

      if (openCajas.length === 0) return null

      // If we have a userId, try to read mapping first.
      if (userId) {
        try {
          const mapSnap = await get(ref(database, `${USER_ACTIVE_PATH}/${userId}`))
          const mappedId = mapSnap.exists() ? mapSnap.val() : null
          if (mappedId) {
            const mapped = openCajas.find((c) => c?.id === mappedId)
            if (mapped) return mapped

            try {
              await remove(ref(database, `${USER_ACTIVE_PATH}/${userId}`))
            } catch (cleanupError) {
              console.warn('Error removing stale active caja mapping', cleanupError)
            }
          }
        } catch (err) {
          console.warn('Error reading user active caja mapping', err)
        }

        // Preferred fallback: open caja created by this user.
        const ownOpenCaja = openCajas.find((c) => c?.apertura?.createdBy === userId)
        if (ownOpenCaja) return ownOpenCaja
      }

      // Final fallback: return latest global open caja.
      return openCajas[0] || null
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
      const cajaRef = ref(database, `${CAJAS_PATH}/${cajaId}`)
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

      const amt = Number(sale.amount || 0)
      const method = sale.method || 'efectivo'
      const updates: Record<string, any> = {
        [`totals/${method}`]: increment(amt),
        'totals/totalVentas': increment(amt),
        [`movimientos/${movimiento.id}`]: movimiento,
      }

      await update(cajaRef, updates)
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

  async reopenCaja(cajaId: string) {
    try {
      const cajaRef = ref(database, `${CAJAS_PATH}/${cajaId}`)
      const snap = await get(cajaRef)
      if (!snap.exists()) {
        throw new Error('Caja no encontrada')
      }

      const caja = snap.val()
      if (caja?.status !== 'closed') {
        return caja
      }

      await update(cajaRef, {
        status: 'open',
        cierreData: null,
        closedAt: null,
        reopenedAt: new Date().toISOString(),
      })

      const createdBy = caja.apertura?.createdBy
      if (createdBy) {
        await set(ref(database, `${USER_ACTIVE_PATH}/${createdBy}`), cajaId)
      }

      const reopenedSnap = await get(cajaRef)
      return reopenedSnap.exists() ? reopenedSnap.val() : { ...caja, status: 'open' }
    } catch (error) {
      console.error('Error reopening caja:', error)
      throw error
    }
  },

  async addRetiro(cajaId: string, retiro: { id: number; monto: number; motivo: string }) {
    try {
      const retiroRef = ref(database, `${CAJAS_PATH}/${cajaId}/remesas/${retiro.id}`)
      await set(retiroRef, { ...retiro, createdAt: new Date().toISOString() })
      return retiro
    } catch (error) {
      console.error('Error adding retiro:', error)
      throw error
    }
  },

  async removeRetiro(cajaId: string, retiroId: number) {
    try {
      await remove(ref(database, `${CAJAS_PATH}/${cajaId}/remesas/${retiroId}`))
    } catch (error) {
      console.error('Error removing retiro:', error)
      throw error
    }
  },

  async getRetiros(cajaId: string): Promise<{ id: number; monto: number; motivo: string }[]> {
    try {
      const snap = await get(ref(database, `${CAJAS_PATH}/${cajaId}/remesas`))
      if (!snap.exists()) return []
      const data = snap.val() as Record<string, any>
      return Object.values(data).sort((a: any, b: any) =>
        (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
      )
    } catch (error) {
      console.error('Error getting retiros:', error)
      return []
    }
  },

  async getAllCajas(): Promise<any[]> {
    try {
      const snap = await get(ref(database, CAJAS_PATH))
      if (!snap.exists()) return []
      const data = snap.val() as Record<string, any>
      const list = Object.entries(data).map(([key, val]) => ({
        ...val,
        id: val.id || key,
      }))
      list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      return list
    } catch (error) {
      console.error('Error getting all cajas:', error)
      return []
    }
  },
}
