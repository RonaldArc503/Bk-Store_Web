import { get, ref, set } from 'firebase/database'
import { database } from '../app/firebase'

const BACKUP_AUTOMATION_PATH = 'settings/backupAutomation'

export interface BackupAutomationSyncPayload {
  enabled: boolean
  scheduleType: 'monthly' | 'weekly'
  monthlyDay: number
  weeklyDay: 0 | 1 | 2 | 3 | 4 | 5 | 6
  format: 'json' | 'xlsx'
  lastRunKey?: string
}

export const SettingsSyncService = {
  async getBackupAutomation(): Promise<Partial<BackupAutomationSyncPayload> | null> {
    try {
      const snapshot = await get(ref(database, BACKUP_AUTOMATION_PATH))
      if (!snapshot.exists()) return null
      const val = snapshot.val() as Partial<BackupAutomationSyncPayload>
      if (!val || typeof val !== 'object') return null
      return val
    } catch {
      return null
    }
  },

  async setBackupAutomation(payload: BackupAutomationSyncPayload): Promise<void> {
    await set(ref(database, BACKUP_AUTOMATION_PATH), payload)
  },
}

