import { ref, set } from 'firebase/database'
import { database } from '../app/firebase'

const RESET_PATHS = [
  'orders',
  'cajas',
  'cortes',
  'inventario',
  'productos',
  'movimientos',
  'userActiveCaja',
]

export const MaintenanceService = {
  async clearDataExceptUsers() {
    try {
      await Promise.all(RESET_PATHS.map((path) => set(ref(database, path), null)))
    } catch (error) {
      console.error('Error clearing data except users:', error)
      throw error instanceof Error ? error : new Error('Error al borrar datos')
    }
  },
}
