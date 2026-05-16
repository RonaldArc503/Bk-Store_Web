import { ref, push, set, get } from 'firebase/database'
import { database } from '../app/firebase'

const DEVOLUCIONES_PATH = 'devoluciones'

export interface DevolucionItem {
  productId: string
  nombre: string
  cantidad: number
  precioUnitario: number
  subtotal: number
}

export interface Devolucion {
  id: string
  ventaOriginalId: string
  fecha: string
  empleado: string
  empleadoRol: string
  motivo: string
  items: DevolucionItem[]
  totalDevuelto: number
  tipo: 'total' | 'parcial'
}

export const DevolucionService = {
  async crearDevolucion(data: Omit<Devolucion, 'id'>): Promise<Devolucion> {
    const devRef = push(ref(database, DEVOLUCIONES_PATH))
    const devolucion: Devolucion = { ...data, id: devRef.key! }
    await set(devRef, devolucion)
    return devolucion
  },

  async getDevolucionesByVenta(ventaId: string): Promise<Devolucion[]> {
    try {
      const snap = await get(ref(database, DEVOLUCIONES_PATH))
      if (!snap.exists()) return []
      const all = snap.val() as Record<string, Devolucion>
      return Object.values(all).filter((d) => d.ventaOriginalId === ventaId)
    } catch (error) {
      console.error('Error fetching devoluciones:', error)
      return []
    }
  },

  async getAllDevoluciones(): Promise<Devolucion[]> {
    try {
      const snap = await get(ref(database, DEVOLUCIONES_PATH))
      if (!snap.exists()) return []
      const all = snap.val() as Record<string, Devolucion>
      return Object.values(all).sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      )
    } catch (error) {
      console.error('Error fetching all devoluciones:', error)
      return []
    }
  },
}
