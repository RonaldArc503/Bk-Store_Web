import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { CatalogService } from '../services/CatalogService'
import { SettingsSyncService } from '../services/SettingsSyncService'
import { BrandingService } from '../services/BrandingService'
import { DEFAULT_BRANDING, normalizeBranding, type StoreBranding } from '../constants/branding'
import type { PaperSize } from '../utils/printPaperSize'

export interface InventoryCatalogItem {
  id: string
  label: string
}

export interface StoreSettings {
  // Stable IDs for catalog-driven dropdowns (tipo/material) to avoid casing/accents drift.
  // Products still store the human label for display, but can also store the ID for consistency.
  inventoryCatalogVersion?: 1
  language: 'es' | 'en'
  notifications: {
    lowStock: boolean
    sales: boolean
    cashRegister: boolean
  }
  inventory: {
    lowStockThreshold: number
    // Admin-configured catalog metadata used in InventoryModal dropdowns.
    productTypes: InventoryCatalogItem[]
    materials: InventoryCatalogItem[]
  }
  printing: {
    autoPrint: boolean
    paperSize: PaperSize
  }
  ui: {
    sidebarCollapsed: boolean
  }
  branding: StoreBranding
  backupAutomation: {
    enabled: boolean
    scheduleType: 'monthly' | 'weekly'
    monthlyDay: number
    weeklyDay: 0 | 1 | 2 | 3 | 4 | 5 | 6
    format: 'json' | 'xlsx'
    lastRunKey?: string
  }
}

const STORAGE_KEY = 'bk-store-settings'

const defaultSettings: StoreSettings = {
  inventoryCatalogVersion: 1,
  language: 'es',
  notifications: {
    lowStock: true,
    sales: false,
    cashRegister: true,
  },
  inventory: {
    lowStockThreshold: 5,
    // Start empty so the admin defines their own catalog options in Configuracion.
    productTypes: [],
    materials: [],
  },
  printing: {
    autoPrint: false,
    paperSize: '80mm',
  },
  ui: {
    sidebarCollapsed: false,
  },
  branding: { ...DEFAULT_BRANDING },
  backupAutomation: {
    enabled: false,
    scheduleType: 'monthly',
    monthlyDay: 30,
    weeklyDay: 5,
    format: 'json',
    lastRunKey: '',
  },
}

function normalizeCatalogLabel(v: string): string {
  return v.trim().replace(/\s+/g, ' ')
}

function slugifyCatalogId(label: string): string {
  // Basic, stable-ish slug for IDs. Keeps ASCII so it's safe in keys/URLs.
  const base = normalizeCatalogLabel(label)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'item'
}

function toCatalogItems(input: unknown): InventoryCatalogItem[] {
  if (!Array.isArray(input)) return []
  if (input.length === 0) return []

  const first = input[0] as unknown
  if (typeof first === 'string') {
    const seen = new Set<string>()
    const out: InventoryCatalogItem[] = []
    for (const raw of input as string[]) {
      const label = normalizeCatalogLabel(raw)
      if (!label) continue
      const key = label.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ id: slugifyCatalogId(label), label })
    }
    return out
  }

  if (typeof first === 'object' && first !== null) {
    const seen = new Set<string>()
    const out: InventoryCatalogItem[] = []
    for (const it of input as any[]) {
      const id = typeof it?.id === 'string' ? it.id : ''
      const label = typeof it?.label === 'string' ? normalizeCatalogLabel(it.label) : ''
      if (!label) continue
      const key = (id || label).toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ id: id || slugifyCatalogId(label), label })
    }
    return out
  }

  return []
}

function loadSettings(): StoreSettings {
  if (typeof window === 'undefined') return defaultSettings
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultSettings
    const parsed = JSON.parse(raw) as Partial<StoreSettings>
    const parsedInventory = (parsed.inventory || {}) as any
    const mergedInventory = { ...defaultSettings.inventory, ...parsedInventory } as any
    const productTypes = toCatalogItems(mergedInventory.productTypes)
    const materials = toCatalogItems(mergedInventory.materials)
    return {
      ...defaultSettings,
      ...parsed,
      notifications: { ...defaultSettings.notifications, ...(parsed.notifications || {}) },
      inventoryCatalogVersion: 1,
      inventory: { ...mergedInventory, productTypes, materials },
      printing: { ...defaultSettings.printing, ...(parsed.printing || {}) },
      ui: { ...defaultSettings.ui, ...(parsed.ui || {}) },
      branding: normalizeBranding(parsed.branding ?? defaultSettings.branding),
      backupAutomation: {
        ...defaultSettings.backupAutomation,
        ...((parsed as { backupAutomation?: Partial<StoreSettings['backupAutomation']> }).backupAutomation || {}),
      },
    }
  } catch {
    return defaultSettings
  }
}

function persist(s: StoreSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

interface SettingsContextValue {
  settings: StoreSettings
  lastSavedAt: number
  canUndo: boolean
  updateSettings: (patch: Partial<StoreSettings>) => void
  updateNotifications: (patch: Partial<StoreSettings['notifications']>) => void
  updateInventory: (patch: Partial<StoreSettings['inventory']>) => void
  updateInventoryCatalog: (key: 'productTypes' | 'materials', next: InventoryCatalogItem[]) => void
  updatePrinting: (patch: Partial<StoreSettings['printing']>) => void
  updateUI: (patch: Partial<StoreSettings['ui']>) => void
  updateBranding: (patch: Partial<StoreBranding>) => void
  updateBackupAutomation: (patch: Partial<StoreSettings['backupAutomation']>) => void
  undoLastChange: () => void
  resetSettings: () => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(loadSettings)
  const [lastSavedAt, setLastSavedAt] = useState<number>(() => Date.now())
  const [undoSnapshot, setUndoSnapshot] = useState<StoreSettings | null>(null)
  const canUndo = undoSnapshot !== null

  // On mount, load shared settings from Firebase and override localStorage if Firebase has data.
  useEffect(() => {
    setLastSavedAt(Date.now())
    ;(async () => {
      try {
        const [remoteCatalog, remoteBackupAutomation, remoteBranding] = await Promise.all([
          CatalogService.getCatalog(),
          SettingsSyncService.getBackupAutomation(),
          BrandingService.getBranding(),
        ])

        if (!remoteCatalog && !remoteBackupAutomation && !remoteBranding) return

        setSettings((prev) => {
          const next: StoreSettings = {
            ...prev,
            inventory: {
              ...prev.inventory,
              productTypes:
                remoteCatalog && remoteCatalog.productTypes.length > 0
                  ? remoteCatalog.productTypes
                  : prev.inventory.productTypes,
              materials:
                remoteCatalog && remoteCatalog.materials.length > 0
                  ? remoteCatalog.materials
                  : prev.inventory.materials,
            },
            branding: remoteBranding ? { ...prev.branding, ...remoteBranding } : prev.branding,
            backupAutomation: remoteBackupAutomation
              ? {
                  ...prev.backupAutomation,
                  ...remoteBackupAutomation,
                  monthlyDay: Math.min(
                    31,
                    Math.max(
                      1,
                      Number(
                        remoteBackupAutomation.monthlyDay ?? prev.backupAutomation.monthlyDay,
                      ),
                    ),
                  ),
                  weeklyDay: Math.min(
                    6,
                    Math.max(
                      0,
                      Number(
                        remoteBackupAutomation.weeklyDay ?? prev.backupAutomation.weeklyDay,
                      ),
                    ),
                  ) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
                }
              : prev.backupAutomation,
          }
          persist(next)
          return next
        })
      } catch {
        // Firebase unavailable — keep localStorage data
      }
    })()
  }, [])

  const updateSettings = useCallback((patch: Partial<StoreSettings>) => {
    setSettings((prev) => {
      setUndoSnapshot(prev)
      const next = { ...prev, ...patch }
      persist(next)
      setLastSavedAt(Date.now())
      return next
    })
  }, [])

  const updateNotifications = useCallback(
    (patch: Partial<StoreSettings['notifications']>) => {
      setSettings((prev) => {
        setUndoSnapshot(prev)
        const next = { ...prev, notifications: { ...prev.notifications, ...patch } }
        persist(next)
        setLastSavedAt(Date.now())
        return next
      })
    },
    [],
  )

  const updateInventory = useCallback(
    (patch: Partial<StoreSettings['inventory']>) => {
      setSettings((prev) => {
        setUndoSnapshot(prev)
        const next = { ...prev, inventory: { ...prev.inventory, ...patch } }
        persist(next)
        setLastSavedAt(Date.now())
        return next
      })
    },
    [],
  )

  const updateInventoryCatalog = useCallback(
    (key: 'productTypes' | 'materials', nextList: InventoryCatalogItem[]) => {
      setSettings((prev) => {
        setUndoSnapshot(prev)
        const next = { ...prev, inventory: { ...prev.inventory, [key]: nextList } }
        persist(next)
        setLastSavedAt(Date.now())
        // Sync to Firebase in the background (non-blocking)
        CatalogService.updateKey(key, nextList).catch(() => {})
        return next
      })
    },
    [],
  )

  const updatePrinting = useCallback(
    (patch: Partial<StoreSettings['printing']>) => {
      setSettings((prev) => {
        setUndoSnapshot(prev)
        const next = { ...prev, printing: { ...prev.printing, ...patch } }
        persist(next)
        setLastSavedAt(Date.now())
        return next
      })
    },
    [],
  )

  const updateUI = useCallback(
    (patch: Partial<StoreSettings['ui']>) => {
      setSettings((prev) => {
        setUndoSnapshot(prev)
        const next = { ...prev, ui: { ...prev.ui, ...patch } }
        persist(next)
        setLastSavedAt(Date.now())
        return next
      })
    },
    [],
  )

  const updateBranding = useCallback(
    (patch: Partial<StoreBranding>) => {
      setSettings((prev) => {
        setUndoSnapshot(prev)
        const nextBranding = normalizeBranding({ ...prev.branding, ...patch })
        const next = { ...prev, branding: nextBranding }
        persist(next)
        setLastSavedAt(Date.now())
        BrandingService.setBranding(nextBranding).catch(() => {})
        return next
      })
    },
    [],
  )

  const updateBackupAutomation = useCallback(
    (patch: Partial<StoreSettings['backupAutomation']>) => {
      setSettings((prev) => {
        setUndoSnapshot(prev)
        const next = { ...prev, backupAutomation: { ...prev.backupAutomation, ...patch } }
        persist(next)
        setLastSavedAt(Date.now())
        SettingsSyncService.setBackupAutomation(next.backupAutomation).catch(() => {})
        return next
      })
    },
    [],
  )

  const undoLastChange = useCallback(() => {
    setSettings((prev) => {
      if (!undoSnapshot) return prev
      const next = undoSnapshot
      setUndoSnapshot(null)
      persist(next)
      setLastSavedAt(Date.now())
      return next
    })
  }, [undoSnapshot])

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings)
    setUndoSnapshot(null)
    persist(defaultSettings)
    setLastSavedAt(Date.now())
    CatalogService.setCatalog({ productTypes: [], materials: [] }).catch(() => {})
    SettingsSyncService.setBackupAutomation(defaultSettings.backupAutomation).catch(() => {})
    BrandingService.setBranding(defaultSettings.branding).catch(() => {})
  }, [])

  return (
    <SettingsContext.Provider
      value={{
        settings,
        lastSavedAt,
        canUndo,
        updateSettings,
        updateNotifications,
        updateInventory,
        updateInventoryCatalog,
        updatePrinting,
        updateUI,
        updateBranding,
        updateBackupAutomation,
        undoLastChange,
        resetSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings debe usarse dentro de SettingsProvider')
  return ctx
}
