import { ref, push, set, get, update, remove, increment } from 'firebase/database'
import { database } from '../app/firebase'

const CAJAS_PATH = 'cajas'
const USER_ACTIVE_PATH = 'userActiveCaja'
const MIN_CAJA_OPENING_AMOUNT = 100

/** Clave YYYY-MM-DD en zona horaria local */
export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getCajaDayKey(caja: { apertura?: { fecha?: string }; createdAt?: string }): string {
  const iso = caja.apertura?.fecha || caja.createdAt || ''
  if (!iso) return ''
  try {
    return getLocalDateKey(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

export function isCajaFromToday(caja: { apertura?: { fecha?: string }; createdAt?: string }): boolean {
  return getCajaDayKey(caja) === getLocalDateKey()
}

export const CajaService = {
  async openCaja(aperturaInfo: {
    monto: number
    fecha: string
    usuario: string
    createdBy?: string
    auto?: boolean
  }) {
    try {
      const monto = Number(aperturaInfo.monto)
      if (!Number.isFinite(monto) || monto < MIN_CAJA_OPENING_AMOUNT) {
        throw new Error(`El monto de apertura debe ser de al menos $${MIN_CAJA_OPENING_AMOUNT.toFixed(2)}`)
      }

      const cajasRef = ref(database, CAJAS_PATH)
      const newRef = push(cajasRef)
      const id = newRef.key || Math.random().toString(36).substr(2, 9)

      // Build apertura without undefined fields (Firebase rejects undefined values)
      const apertura: Record<string, any> = {
        monto,
        fecha: aperturaInfo.fecha,
        usuario: aperturaInfo.usuario,
      }
      if (aperturaInfo.createdBy) {
        apertura.createdBy = aperturaInfo.createdBy
      }
      if (aperturaInfo.auto) {
        apertura.auto = true
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
   * Cierra cajas con status `open` cuyo día de apertura es anterior al día actual.
   * Evita que una caja vieja bloquee la apertura del día.
   */
  async closeStaleOpenCajas(): Promise<number> {
    const todayKey = getLocalDateKey()
    try {
      const snapAll = await get(ref(database, CAJAS_PATH))
      if (!snapAll.exists()) return 0
      const data = snapAll.val() as Record<string, any>
      let closed = 0

      for (const [key, caja] of Object.entries(data)) {
        if (caja?.status !== 'open') continue
        const dayKey = getCajaDayKey(caja)
        if (!dayKey || dayKey >= todayKey) continue

        await update(ref(database, `${CAJAS_PATH}/${key}`), {
          status: 'closed',
          closedAt: new Date().toISOString(),
          cierreData: { autoClosed: true, reason: 'stale_open_caja', staleDayKey: dayKey },
        })

        const createdBy = caja.apertura?.createdBy
        if (createdBy) {
          try {
            await remove(ref(database, `${USER_ACTIVE_PATH}/${createdBy}`))
          } catch (err) {
            console.warn('Error clearing stale userActiveCaja mapping', err)
          }
        }
        closed++
      }
      return closed
    } catch (error) {
      console.error('Error closing stale open cajas:', error)
      return 0
    }
  },

  /**
   * Caja abierta del día actual (zona horaria local). Ignora cajas `open` de días anteriores.
   */
  async getTodayOpenCaja(userId?: string) {
    try {
      const snapAll = await get(ref(database, CAJAS_PATH))
      if (!snapAll.exists()) return null
      const data = snapAll.val()
      const openCajas = (Object.values(data) as any[])
        .filter((c) => c?.status === 'open' && isCajaFromToday(c))
        .sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime())

      if (openCajas.length === 0) return null

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

        const ownOpenCaja = openCajas.find((c) => c?.apertura?.createdBy === userId)
        if (ownOpenCaja) return ownOpenCaja
      }

      return openCajas[0] || null
    } catch (error) {
      console.error('Error getting today open caja:', error)
      return null
    }
  },

  /** @deprecated Usar getTodayOpenCaja; solo devuelve caja abierta del día actual */
  async getActiveCaja(userId?: string) {
    return this.getTodayOpenCaja(userId)
  },

  async getCajaById(id: string) {
    const snap = await get(ref(database, `${CAJAS_PATH}/${id}`))
    if (!snap.exists()) return null
    return snap.val()
  },

  async addSaleToCaja(cajaId: string, sale: {
    orderId?: string
    method: string
    amount: number
    items?: any[]
    cashReceived?: number | null
    changeAmount?: number | null
    createdBy?: string
  }) {
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
        cashReceived: typeof sale.cashReceived === 'undefined' ? null : sale.cashReceived,
        changeAmount: typeof sale.changeAmount === 'undefined' ? null : sale.changeAmount,
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

  /** Busca en qué caja se registró la venta (por movimiento con orderId) */
  async findCajaIdByOrderId(orderId: string): Promise<string | null> {
    try {
      const cajas = await this.getAllCajas()
      for (const caja of cajas) {
        const movs = caja.movimientos
        if (!movs || typeof movs !== 'object') continue
        for (const mov of Object.values(movs) as any[]) {
          if (mov?.orderId === orderId && caja.id) return caja.id
        }
      }
      return null
    } catch (error) {
      console.error('Error finding caja by order:', error)
      return null
    }
  },

  /** Resta el monto devuelto de los totales de la caja (mismo método de pago de la venta) */
  async registrarDevolucionEnCaja(
    cajaId: string,
    data: {
      orderId: string
      devolucionId: string
      method: string
      amount: number
      createdBy?: string
    },
  ) {
    try {
      const cajaRef = ref(database, `${CAJAS_PATH}/${cajaId}`)
      const snap = await get(cajaRef)
      if (!snap.exists()) throw new Error('Caja no encontrada para registrar devolución')

      const caja = snap.val()
      if (caja?.status === 'closed') {
        throw new Error('No se puede ajustar una caja ya cerrada')
      }

      const amt = Math.abs(Number(data.amount || 0))
      if (amt <= 0) return null

      const method = data.method || 'efectivo'
      const movRef = ref(database, `${CAJAS_PATH}/${cajaId}/movimientos`)
      const newMovRef = push(movRef)
      const movimiento = {
        id: newMovRef.key || Math.random().toString(36).substr(2, 9),
        type: 'devolucion',
        orderId: data.orderId,
        devolucionId: data.devolucionId,
        method,
        amount: -amt,
        createdBy: data.createdBy || null,
        createdAt: new Date().toISOString(),
      }

      const updates: Record<string, any> = {
        [`totals/${method}`]: increment(-amt),
        'totals/totalVentas': increment(-amt),
        [`movimientos/${movimiento.id}`]: movimiento,
      }

      await update(cajaRef, updates)
      return movimiento
    } catch (error) {
      console.error('Error registering devolucion in caja:', error)
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
