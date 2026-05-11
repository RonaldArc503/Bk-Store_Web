import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'

export interface StoreSettings {
  language: 'es' | 'en'
  notifications: {
    lowStock: boolean
    sales: boolean
    cashRegister: boolean
  }
  inventory: {
    lowStockThreshold: number
    // Admin-configured catalog metadata used in InventoryModal dropdowns.
    productTypes: string[]
    materials: string[]
  }
  printing: {
    autoPrint: boolean
    paperSize: '58mm' | '80mm' | 'letter'
  }
  ui: {
    sidebarCollapsed: boolean
  }
}

const STORAGE_KEY = 'bk-store-settings'

const defaultSettings: StoreSettings = {
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
}

function loadSettings(): StoreSettings {
  if (typeof window === 'undefined') return defaultSettings
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultSettings
    const parsed = JSON.parse(raw) as Partial<StoreSettings>
    return {
      ...defaultSettings,
      ...parsed,
      notifications: { ...defaultSettings.notifications, ...(parsed.notifications || {}) },
      inventory: { ...defaultSettings.inventory, ...(parsed.inventory || {}) },
      printing: { ...defaultSettings.printing, ...(parsed.printing || {}) },
      ui: { ...defaultSettings.ui, ...(parsed.ui || {}) },
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
  updateSettings: (patch: Partial<StoreSettings>) => void
  updateNotifications: (patch: Partial<StoreSettings['notifications']>) => void
  updateInventory: (patch: Partial<StoreSettings['inventory']>) => void
  updatePrinting: (patch: Partial<StoreSettings['printing']>) => void
  updateUI: (patch: Partial<StoreSettings['ui']>) => void
  resetSettings: () => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(loadSettings)

  const updateSettings = useCallback((patch: Partial<StoreSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      persist(next)
      return next
    })
  }, [])

  const updateNotifications = useCallback(
    (patch: Partial<StoreSettings['notifications']>) => {
      setSettings((prev) => {
        const next = { ...prev, notifications: { ...prev.notifications, ...patch } }
        persist(next)
        return next
      })
    },
    [],
  )

  const updateInventory = useCallback(
    (patch: Partial<StoreSettings['inventory']>) => {
      setSettings((prev) => {
        const next = { ...prev, inventory: { ...prev.inventory, ...patch } }
        persist(next)
        return next
      })
    },
    [],
  )

  const updatePrinting = useCallback(
    (patch: Partial<StoreSettings['printing']>) => {
      setSettings((prev) => {
        const next = { ...prev, printing: { ...prev.printing, ...patch } }
        persist(next)
        return next
      })
    },
    [],
  )

  const updateUI = useCallback(
    (patch: Partial<StoreSettings['ui']>) => {
      setSettings((prev) => {
        const next = { ...prev, ui: { ...prev.ui, ...patch } }
        persist(next)
        return next
      })
    },
    [],
  )

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings)
    persist(defaultSettings)
  }, [])

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        updateNotifications,
        updateInventory,
        updatePrinting,
        updateUI,
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
