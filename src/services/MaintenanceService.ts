import { get, ref, set } from 'firebase/database'
import { database } from '../app/firebase'

const RESET_PATHS = [
  'orders',
  'cajas',
  'cortes',
  'cortesByDate',
  'inventario',
  'productos',
  'movimientos',
  'userActiveCaja',
]

export type FullBackupPayload = {
  meta: {
    version: 1
    exportedAt: string
    source: string
  }
  database: Record<string, unknown>
  local: {
    settings?: unknown
  }
}

export const MaintenanceService = {
  async clearDataExceptUsers() {
    try {
      await Promise.all(RESET_PATHS.map((path) => set(ref(database, path), null)))
    } catch (error) {
      console.error('Error clearing data except users:', error)
      throw error instanceof Error ? error : new Error('Error al borrar datos')
    }
  },

  async createFullBackup(settingsSnapshot?: unknown): Promise<FullBackupPayload> {
    try {
      const snapshot = await get(ref(database))
      const dbData = (snapshot.val() || {}) as Record<string, unknown>
      return {
        meta: {
          version: 1,
          exportedAt: new Date().toISOString(),
          source: 'Bk-Store_Web',
        },
        database: dbData,
        local: {
          settings: settingsSnapshot,
        },
      }
    } catch (error) {
      console.error('Error creating full backup:', error)
      throw error instanceof Error ? error : new Error('Error al generar respaldo')
    }
  },

  async restoreFullBackup(payload: FullBackupPayload) {
    try {
      if (!payload || typeof payload !== 'object') {
        throw new Error('Formato de respaldo inválido')
      }
      if (!payload.database || typeof payload.database !== 'object') {
        throw new Error('El respaldo no contiene datos de base de datos')
      }
      await set(ref(database), payload.database)
    } catch (error) {
      console.error('Error restoring full backup:', error)
      throw error instanceof Error ? error : new Error('Error al restaurar respaldo')
    }
  },
}
