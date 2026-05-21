import { get, ref, remove, set } from 'firebase/database'
import { database } from '../app/firebase'
import * as XLSX from 'xlsx'

const DELETE_BATCH_SIZE = 25

const RESET_PATHS = [
  'orders',
  'cajas',
  'cortes',
  'cortesByDate',
  'inventario',
  'productos',
  'movimientos',
  'devoluciones',
  'userActiveCaja',
]

const BACKUP_PATHS = [
  'users',
  'usersByEmail',
  'userAuthIndex',
  'orders',
  'cajas',
  'cortes',
  'cortesByDate',
  'inventario',
  'productos',
  'movimientos',
  'devoluciones',
  'userActiveCaja',
  'settings',
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

async function readPath(path: string): Promise<unknown> {
  const snap = await get(ref(database, path))
  return snap.exists() ? snap.val() : null
}

/**
 * Borra un nodo de RTDB respetando reglas que solo permiten .write en hijos ($id).
 * No usar set(path, null) en la raíz del módulo — Firebase lo rechaza.
 */
async function clearDatabasePath(path: string): Promise<number> {
  const nodeRef = ref(database, path)
  const snap = await get(nodeRef)
  if (!snap.exists()) return 0

  const value = snap.val()
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const keys = Object.keys(value as Record<string, unknown>)
    for (let i = 0; i < keys.length; i += DELETE_BATCH_SIZE) {
      const chunk = keys.slice(i, i + DELETE_BATCH_SIZE)
      await Promise.all(
        chunk.map((key) => remove(ref(database, `${path}/${key}`))),
      )
    }
    return keys.length
  }

  await remove(nodeRef)
  return 1
}

async function writeDatabasePath(path: string, value: unknown): Promise<void> {
  if (value == null) {
    await clearDatabasePath(path)
    return
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>)
    for (let i = 0; i < entries.length; i += DELETE_BATCH_SIZE) {
      const chunk = entries.slice(i, i + DELETE_BATCH_SIZE)
      await Promise.all(
        chunk.map(([key, child]) =>
          set(ref(database, `${path}/${key}`), child ?? null),
        ),
      )
    }
    return
  }

  await set(ref(database, path), value)
}

export const MaintenanceService = {
  async clearDataExceptUsers(): Promise<{ deletedByPath: Record<string, number> }> {
    const deletedByPath: Record<string, number> = {}
    try {
      for (const path of RESET_PATHS) {
        deletedByPath[path] = await clearDatabasePath(path)
      }
      return { deletedByPath }
    } catch (error) {
      console.error('Error clearing data except users:', error)
      const msg =
        error instanceof Error
          ? error.message
          : 'No se pudo borrar. Verifica que tu usuario sea Administrador o tenga permiso de Datos en Configuración.'
      throw new Error(msg)
    }
  },

  async createFullBackup(settingsSnapshot?: unknown): Promise<FullBackupPayload> {
    try {
      const entries = await Promise.all(
        BACKUP_PATHS.map(async (path) => [path, await readPath(path)] as const),
      )
      const dbData: Record<string, unknown> = {}
      for (const [path, value] of entries) {
        if (value != null) dbData[path] = value
      }

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

  buildBackupFileName(ext: 'json' | 'xlsx', date = new Date()) {
    const day = date
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toLowerCase()
      .replace(/[^a-z]/g, '')
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    const ss = String(date.getSeconds()).padStart(2, '0')
    return `bk-store-backup-${day}-${y}-${m}-${d}-${hh}-${mm}-${ss}.${ext}`
  },

  triggerDownload(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  },

  flattenForSheet(value: unknown): Record<string, unknown>[] {
    if (Array.isArray(value)) {
      return value.map((item, idx) => ({
        index: idx + 1,
        ...(typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : { value: item }),
      }))
    }

    if (value && typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>).map(([key, item]) => ({
        key,
        ...(typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : { value: item }),
      }))
    }

    return [{ value }]
  },

  async downloadFullBackupJson(settingsSnapshot?: unknown, fileName?: string) {
    const backup = await this.createFullBackup(settingsSnapshot)
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json;charset=utf-8',
    })
    this.triggerDownload(blob, fileName || this.buildBackupFileName('json'))
    return backup
  },

  async downloadFullBackupExcel(settingsSnapshot?: unknown, fileName?: string) {
    const backup = await this.createFullBackup(settingsSnapshot)
    const wb = XLSX.utils.book_new()
    const orderedKeys = Object.keys(backup.database || {}).sort((a, b) => a.localeCompare(b))

    const resumen = [
      { campo: 'fuente', valor: backup.meta.source },
      { campo: 'version', valor: backup.meta.version },
      { campo: 'exportado_en', valor: backup.meta.exportedAt },
      { campo: 'modulos', valor: orderedKeys.length },
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), 'Resumen')

    for (const key of orderedKeys) {
      const rows = this.flattenForSheet((backup.database as Record<string, unknown>)[key])
      const sheetName = key.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 31) || 'data'
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheetName)
    }

    const localRows = this.flattenForSheet(backup.local?.settings || {})
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(localRows), 'config_local')
    XLSX.writeFile(wb, fileName || this.buildBackupFileName('xlsx'))
    return backup
  },

  async restoreFullBackup(payload: FullBackupPayload) {
    try {
      if (!payload || typeof payload !== 'object') {
        throw new Error('Formato de respaldo inválido')
      }
      if (!payload.database || typeof payload.database !== 'object') {
        throw new Error('El respaldo no contiene datos de base de datos')
      }

      for (const [path, value] of Object.entries(payload.database)) {
        await writeDatabasePath(path, value ?? null)
      }
    } catch (error) {
      console.error('Error restoring full backup:', error)
      throw error instanceof Error ? error : new Error('Error al restaurar respaldo')
    }
  },
}
