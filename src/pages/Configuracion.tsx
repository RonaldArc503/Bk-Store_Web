import {
  Settings,
  Sun,
  Moon,
  Banknote,
  Bell,
  BellOff,
  Package,
  Printer,
  RotateCcw,
  Database,
  Menu,
  ChevronUp,
  ChevronDown,
  Pencil,
  Check,
  X,
  Sparkles,
  Upload,
} from 'lucide-react'
import { Sidebar } from '../components/Sidebar'
import { AppBrandMark } from '../components/AppBrandLogo'
import { useTheme } from '../context/ThemeContext'
import { useSettings, type InventoryCatalogItem, type StoreSettings } from '../context/SettingsContext'
import { BRAND_PRESET_OPTIONS, MAX_BRAND_IMAGE_BYTES, getResolvedBranding } from '../constants/branding'
import { BrandingService } from '../services/BrandingService'
import { useAuth } from '../hooks/useAuth'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { MaintenanceService } from '../services/MaintenanceService'
import { ProductService } from '../services/ProductService'
import { PAPER_SIZE_OPTIONS, type PaperSize } from '../utils/printPaperSize'
import { getBrowserPrintHint, printTestTicket } from '../services/TicketPrintService'
import type { Producto } from '../types/product'

/* --- Toggle switch reutilizable --- */

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
        checked ? 'bg-lime-600' : 'bg-gray-200 dark:bg-gray-600'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-6' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

/* --- Select reutilizable --- */

function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="block w-full max-w-[200px] rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent transition-colors cursor-pointer"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

/* --- Card wrapper --- */

function SettingCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      {children}
    </div>
  )
}

function SettingRow({
  icon,
  title,
  description,
  children,
  border = true,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
  border?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 p-5 ${
        border ? 'border-b border-gray-50 dark:border-gray-800 last:border-b-0' : ''
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon}
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function SettingsSection({
  icon,
  title,
  defaultOpen = true,
  children,
}: {
  icon: React.ReactNode
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between mb-3"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            {title}
          </h2>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? children : null}
    </div>
  )
}

/* --- Secciones --- */

function ThemeSection() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <SettingsSection
      icon={isDark ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
      title="Apariencia"
    >
      <SettingCard>
        <SettingRow
          icon={isDark ? <Moon className="w-5 h-5 shrink-0 text-indigo-300" /> : <Sun className="w-5 h-5 shrink-0 text-amber-500" />}
          title="Tema"
          description={isDark ? 'Modo oscuro activado' : 'Modo claro activado'}
          border={false}
        >
          <Toggle checked={isDark} onChange={toggleTheme} label="Cambiar tema" />
        </SettingRow>

      </SettingCard>
    </SettingsSection>
  )
}

function NotificationsSection() {
  const { settings, updateNotifications } = useSettings()
  const { notifications } = settings
  const anyActive = notifications.lowStock || notifications.sales || notifications.cashRegister

  return (
    <SettingsSection
      icon={anyActive ? <Bell className="w-4 h-4 text-orange-500 dark:text-orange-400" /> : <BellOff className="w-4 h-4 text-gray-400" />}
      title="Notificaciones"
    >
      <SettingCard>
        <SettingRow icon={<Package className="w-5 h-5 shrink-0 text-red-500 dark:text-red-400" />} title="Alertas de stock bajo" description="Avisar cuando un producto tenga poco inventario">
          <Toggle checked={notifications.lowStock} onChange={(v) => updateNotifications({ lowStock: v })} label="Alertas de stock bajo" />
        </SettingRow>
        <SettingRow icon={<Banknote className="w-5 h-5 shrink-0 text-lime-500 dark:text-lime-400" />} title="Notificaciones de ventas" description="Recibir aviso al completar cada venta">
          <Toggle checked={notifications.sales} onChange={(v) => updateNotifications({ sales: v })} label="Notificaciones de ventas" />
        </SettingRow>
        <SettingRow icon={<Bell className="w-5 h-5 shrink-0 text-orange-500 dark:text-orange-400" />} title="Recordatorio de corte" description="Recordar hacer el corte de caja al final del día" border={false}>
          <Toggle checked={notifications.cashRegister} onChange={(v) => updateNotifications({ cashRegister: v })} label="Recordatorio de corte de caja" />
        </SettingRow>

      </SettingCard>
    </SettingsSection>
  )
}

function InventorySection() {
  const { settings, updateInventory, updateInventoryCatalog } = useSettings()
  const [localThreshold, setLocalThreshold] = useState(String(settings.inventory.lowStockThreshold))
  const [newProductType, setNewProductType] = useState('')
  const [newMaterial, setNewMaterial] = useState('')

  const productTypes = settings.inventory.productTypes || []
  const materials = settings.inventory.materials || []

  const [productos, setProductos] = useState<Producto[]>([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const list = await ProductService.getProductos()
        if (!alive) return
        setProductos(list)
      } catch {
        // Non-blocking: catalog editing still works without counts.
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const normalizeListValue = (v: string) => v.trim().replace(/\s+/g, ' ')
  const normalizeKey = (v: string) =>
    normalizeListValue(v)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

  const slugifyId = (label: string) =>
    normalizeKey(label)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item'

  const usage = useMemo(() => {
    const typeCount = new Map<string, number>()
    const materialCount = new Map<string, number>()
    for (const p of productos) {
      if (p.tipo) {
        const k = normalizeKey(p.tipo)
        typeCount.set(k, (typeCount.get(k) || 0) + 1)
      }
      if (p.material) {
        const k = normalizeKey(p.material)
        materialCount.set(k, (materialCount.get(k) || 0) + 1)
      }
    }
    return { typeCount, materialCount }
  }, [productos])

  const addToList = (key: 'productTypes' | 'materials', raw: string) => {
    const value = normalizeListValue(raw)
    if (!value) return

    const current = (settings.inventory[key] || []) as InventoryCatalogItem[]
    const exists = current.some((x) => normalizeKey(x.label) === normalizeKey(value))
    if (exists) return

    let id = slugifyId(value)
    if (current.some((x) => x.id === id)) {
      id = `${id}-${Math.random().toString(36).slice(2, 6)}`
    }
    updateInventoryCatalog(key, [...current, { id, label: value }])
  }

  const removeFromList = (key: 'productTypes' | 'materials', id: string) => {
    const current = (settings.inventory[key] || []) as InventoryCatalogItem[]
    const item = current.find((x) => x.id === id)
    if (!item) return

    const usedCount =
      key === 'productTypes'
        ? usage.typeCount.get(normalizeKey(item.label)) || 0
        : usage.materialCount.get(normalizeKey(item.label)) || 0

    if (usedCount > 0) {
      toast.error(`No se puede eliminar: se usa en ${usedCount} producto(s).`)
      return
    }

    updateInventoryCatalog(key, current.filter((x) => x.id !== id))
  }

  const moveItem = (key: 'productTypes' | 'materials', index: number, dir: -1 | 1) => {
    const current = (settings.inventory[key] || []) as InventoryCatalogItem[]
    const nextIndex = index + dir
    if (nextIndex < 0 || nextIndex >= current.length) return
    const next = [...current]
    const [it] = next.splice(index, 1)
    next.splice(nextIndex, 0, it)
    updateInventoryCatalog(key, next)
  }

  const [editing, setEditing] = useState<{ key: 'productTypes' | 'materials'; id: string } | null>(null)
  const [editingText, setEditingText] = useState('')

  const startEdit = (key: 'productTypes' | 'materials', item: InventoryCatalogItem) => {
    setEditing({ key, id: item.id })
    setEditingText(item.label)
  }

  const cancelEdit = () => {
    setEditing(null)
    setEditingText('')
  }

  const commitEdit = async () => {
    if (!editing) return
    const key = editing.key
    const current = (settings.inventory[key] || []) as InventoryCatalogItem[]
    const idx = current.findIndex((x) => x.id === editing.id)
    if (idx < 0) return cancelEdit()

    const nextLabel = normalizeListValue(editingText)
    if (!nextLabel) return

    const exists = current.some((x) => x.id !== editing.id && normalizeKey(x.label) === normalizeKey(nextLabel))
    if (exists) {
      toast.error('Ya existe una opcion con ese nombre.')
      return
    }

    const prevLabel = current[idx].label
    const next = current.map((x) => (x.id === editing.id ? { ...x, label: nextLabel } : x))
    updateInventoryCatalog(key, next)

    // Optional but useful: keep existing products consistent when renaming.
    const field = key === 'productTypes' ? 'tipo' : 'material'
    const affected = productos.filter((p) => normalizeKey((p as any)[field] || '') === normalizeKey(prevLabel))
    if (affected.length > 0) {
      try {
        for (const p of affected) {
          await ProductService.updateProducto({ id: p.id, [field]: nextLabel } as any)
        }
        setProductos((prev) =>
          prev.map((p) =>
            normalizeKey((p as any)[field] || '') === normalizeKey(prevLabel) ? ({ ...p, [field]: nextLabel } as any) : p
          ),
        )
      } catch {
        toast.error('No se pudieron actualizar los productos con el nuevo nombre.')
      }
    }

    cancelEdit()
  }

  const handleBlur = () => {
    const n = parseInt(localThreshold, 10)
    if (!isNaN(n) && n >= 0) {
      updateInventory({ lowStockThreshold: n })
    } else {
      setLocalThreshold(String(settings.inventory.lowStockThreshold))
    }
  }

  return (
    <SettingsSection icon={<Package className="w-4 h-4 text-violet-500 dark:text-violet-400" />} title="Inventario">
      <SettingCard>
        <SettingRow icon={<Package className="w-5 h-5 shrink-0 text-violet-500 dark:text-violet-400" />} title="Umbral de stock bajo" description="Cantidad mínima antes de considerar bajo" border={false}>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={999}
              value={localThreshold}
              onChange={(e) => setLocalThreshold(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
              className="w-20 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent transition-colors"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">unidades</span>
          </div>
        </SettingRow>

        <div className="border-t border-gray-50 dark:border-gray-800 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-violet-500 dark:text-violet-400" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">Catálogo: Tipo de prenda y material</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Estas opciones se usan al crear/editar productos en Inventario. El número entre paréntesis indica cuántos productos usan cada opción.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {/* ── TIPOS DE PRENDA ── */}
            {(
              () => {
                const items = productTypes
                return (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                        Tipos de prenda
                      </p>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {items.length} {items.length === 1 ? 'tipo' : 'tipos'}
                      </span>
                    </div>

                    {/* Input agregar */}
                    <div className="flex gap-2">
                      <input
                        value={newProductType}
                        onChange={(e) => setNewProductType(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addToList('productTypes', newProductType)
                            setNewProductType('')
                          }
                        }}
                        placeholder="Ej: Bikini, Short..."
                        className="flex-1 min-w-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => { addToList('productTypes', newProductType); setNewProductType('') }}
                        className="px-3 py-2 rounded-lg bg-lime-600 hover:bg-lime-700 text-white text-sm font-medium transition-colors whitespace-nowrap"
                      >
                        Agregar
                      </button>
                    </div>

                    {/* Lista siempre visible */}
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 overflow-hidden min-h-[72px] max-h-56 overflow-y-auto">
                      {items.length === 0 ? (
                        <div className="flex items-center justify-center py-5 px-3">
                          <p className="text-xs text-center text-amber-600 dark:text-amber-400">
                            Sin tipos configurados. Agrega al menos 1.
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                          {items.map((it: InventoryCatalogItem, idx: number) => {
                            const isEd = editing?.key === 'productTypes' && editing.id === it.id
                            const count = usage.typeCount.get(normalizeKey(it.label)) || 0
                            return (
                              <div key={it.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <div className="flex-1 min-w-0">
                                  {isEd ? (
                                    <input
                                      value={editingText}
                                      onChange={(e) => setEditingText(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') { e.preventDefault(); void commitEdit() }
                                        if (e.key === 'Escape') cancelEdit()
                                      }}
                                      className="w-full rounded-md border border-lime-400 dark:border-lime-600 bg-lime-50 dark:bg-lime-950/30 text-sm text-gray-900 dark:text-gray-100 px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-lime-500"
                                      autoFocus
                                    />
                                  ) : (
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="truncate text-sm text-gray-800 dark:text-gray-200">{it.label}</span>
                                      {count > 0 && (
                                        <span className="shrink-0 text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-full px-1.5 py-0.5">
                                          {count}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button type="button" onClick={() => moveItem('productTypes', idx, -1)} disabled={idx === 0}
                                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 text-gray-400 dark:text-gray-500" title="Subir">
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button type="button" onClick={() => moveItem('productTypes', idx, 1)} disabled={idx === items.length - 1}
                                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 text-gray-400 dark:text-gray-500" title="Bajar">
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>
                                  {!isEd ? (
                                    <button type="button" onClick={() => startEdit('productTypes', it)}
                                      className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-500 dark:text-blue-400" title="Editar">
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <>
                                      <button type="button" onClick={() => void commitEdit()}
                                        className="p-1 rounded hover:bg-lime-50 dark:hover:bg-lime-950/40 text-lime-600 dark:text-lime-400" title="Guardar">
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button type="button" onClick={cancelEdit}
                                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400" title="Cancelar">
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                  <button type="button" onClick={() => removeFromList('productTypes', it.id)} disabled={count > 0}
                                    className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 dark:text-red-400 disabled:opacity-30"
                                    title={count > 0 ? `En uso por ${count} producto(s)` : 'Eliminar'}>
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              }
            )()}

            {/* ── MATERIALES ── */}
            {(
              () => {
                const items = materials
                return (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                        Materiales
                      </p>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {items.length} {items.length === 1 ? 'material' : 'materiales'}
                      </span>
                    </div>

                    {/* Input agregar */}
                    <div className="flex gap-2">
                      <input
                        value={newMaterial}
                        onChange={(e) => setNewMaterial(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addToList('materials', newMaterial)
                            setNewMaterial('')
                          }
                        }}
                        placeholder="Ej: Algodón, Poliéster..."
                        className="flex-1 min-w-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => { addToList('materials', newMaterial); setNewMaterial('') }}
                        className="px-3 py-2 rounded-lg bg-lime-600 hover:bg-lime-700 text-white text-sm font-medium transition-colors whitespace-nowrap"
                      >
                        Agregar
                      </button>
                    </div>

                    {/* Lista siempre visible */}
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 overflow-hidden min-h-[72px] max-h-56 overflow-y-auto">
                      {items.length === 0 ? (
                        <div className="flex items-center justify-center py-5 px-3">
                          <p className="text-xs text-center text-amber-600 dark:text-amber-400">
                            Sin materiales configurados. Agrega al menos 1.
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                          {items.map((it: InventoryCatalogItem, idx: number) => {
                            const isEd = editing?.key === 'materials' && editing.id === it.id
                            const count = usage.materialCount.get(normalizeKey(it.label)) || 0
                            return (
                              <div key={it.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <div className="flex-1 min-w-0">
                                  {isEd ? (
                                    <input
                                      value={editingText}
                                      onChange={(e) => setEditingText(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') { e.preventDefault(); void commitEdit() }
                                        if (e.key === 'Escape') cancelEdit()
                                      }}
                                      className="w-full rounded-md border border-lime-400 dark:border-lime-600 bg-lime-50 dark:bg-lime-950/30 text-sm text-gray-900 dark:text-gray-100 px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-lime-500"
                                      autoFocus
                                    />
                                  ) : (
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="truncate text-sm text-gray-800 dark:text-gray-200">{it.label}</span>
                                      {count > 0 && (
                                        <span className="shrink-0 text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-full px-1.5 py-0.5">
                                          {count}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button type="button" onClick={() => moveItem('materials', idx, -1)} disabled={idx === 0}
                                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 text-gray-400 dark:text-gray-500" title="Subir">
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button type="button" onClick={() => moveItem('materials', idx, 1)} disabled={idx === items.length - 1}
                                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 text-gray-400 dark:text-gray-500" title="Bajar">
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>
                                  {!isEd ? (
                                    <button type="button" onClick={() => startEdit('materials', it)}
                                      className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-500 dark:text-blue-400" title="Editar">
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <>
                                      <button type="button" onClick={() => void commitEdit()}
                                        className="p-1 rounded hover:bg-lime-50 dark:hover:bg-lime-950/40 text-lime-600 dark:text-lime-400" title="Guardar">
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button type="button" onClick={cancelEdit}
                                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400" title="Cancelar">
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                  <button type="button" onClick={() => removeFromList('materials', it.id)} disabled={count > 0}
                                    className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 dark:text-red-400 disabled:opacity-30"
                                    title={count > 0 ? `En uso por ${count} producto(s)` : 'Eliminar'}>
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              }
            )()}
          </div>
        </div>
      </SettingCard>
    </SettingsSection>
  )
}

function PrintingSection() {
  const { settings, updatePrinting } = useSettings()
  const { printing } = settings
  const [testingPrint, setTestingPrint] = useState(false)

  const handleTestPrint = async () => {
    setTestingPrint(true)
    const toastId = toast.loading(`Enviando prueba a ${printing.printerName || 'POS-58'}...`)
    try {
      toast.info(getBrowserPrintHint(printing.paperSize, printing.printerName), { autoClose: 5000 })
      const result = await printTestTicket({
        paperSize: printing.paperSize,
        printerName: printing.printerName,
      })
      const okMsg =
        result.method === 'pdf'
          ? `Prueba PDF enviada a ${result.printer}.`
          : `Ticket enviado a ${result.printer}. Pulsa Imprimir en el dialogo.`
      toast.update(toastId, {
        render: okMsg,
        type: 'success',
        isLoading: false,
        autoClose: 6000,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo imprimir la prueba'
      toast.update(toastId, { render: message, type: 'error', isLoading: false, autoClose: 10000 })
    } finally {
      setTestingPrint(false)
    }
  }

  return (
    <SettingsSection icon={<Printer className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />} title="Impresión">
      <SettingCard>
        <SettingRow icon={<Printer className="w-5 h-5 shrink-0 text-cyan-500 dark:text-cyan-400" />} title="Imprimir ticket automático" description="Abre el dialogo de impresion al finalizar cada venta">
          <Toggle checked={printing.autoPrint} onChange={(v) => updatePrinting({ autoPrint: v })} label="Imprimir ticket automático" />
        </SettingRow>
        <SettingRow icon={<Printer className="w-5 h-5 shrink-0 text-cyan-500 dark:text-cyan-400" />} title="Tamaño de papel" description="PR-100 usa rollo de 58 mm (como indica la etiqueta de la ticketera)">
          <Select
            value={printing.paperSize}
            onChange={(v) => updatePrinting({ paperSize: v as PaperSize })}
            options={PAPER_SIZE_OPTIONS}
          />
        </SettingRow>
        <SettingRow
          icon={<Printer className="w-5 h-5 shrink-0 text-cyan-500 dark:text-cyan-400" />}
          title="Impresora POS-58"
          description="Nombre en Windows. Debe coincidir con la impresora predeterminada (POS-58)"
          border={false}
        >
          <input
            type="text"
            value={printing.printerName}
            onChange={(e) => updatePrinting({ printerName: e.target.value })}
            placeholder="POS-58"
            className="w-full sm:w-64 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
          />
        </SettingRow>
        <div className="mx-4 mb-4 rounded-xl border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/30 px-4 py-3 text-xs text-cyan-950 dark:text-cyan-100 space-y-2">
          <p className="font-semibold">Impresion en POS-58 (58 mm)</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>
              Deja <strong>POS-58</strong> como impresora predeterminada en Windows.
            </li>
            <li>Pulsa <strong>Imprimir ticket de prueba</strong> y confirma en el dialogo del navegador.</li>
            <li>Papel <strong>58 mm</strong>, sin encabezado ni pie de pagina.</li>
          </ol>
          <p className="text-amber-900 dark:text-amber-100 rounded-lg bg-amber-100/80 dark:bg-amber-950/40 px-3 py-2">
            <strong>No uses &quot;Emparejar&quot;.</strong> Eso solo sirve para puertos COM/Serial. Tu PR-100 esta
            instalada como impresora <strong>POS-58</strong> en Windows, por eso el navegador no encuentra dispositivos
            serial. Es normal.
          </p>
        </div>
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={() => void handleTestPrint()}
            disabled={testingPrint}
            className="px-4 py-2 text-sm rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-60"
          >
            {testingPrint ? 'Abriendo prueba…' : 'Imprimir ticket de prueba'}
          </button>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 w-full">
            {getBrowserPrintHint(printing.paperSize)}
          </p>
        </div>
      </SettingCard>
    </SettingsSection>
  )
}

function InterfaceSection() {
  const { settings, updateUI } = useSettings()
  const { ui } = settings

  return (
    <SettingsSection icon={<Menu className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />} title="Interfaz">
      <SettingCard>
        <SettingRow
          icon={<Menu className="w-5 h-5 shrink-0 text-emerald-500 dark:text-emerald-400" />}
          title="Menu compactado"
          description="Colapsa el menu lateral en escritorio"
          border={false}
        >
          <Toggle
            checked={ui.sidebarCollapsed}
            onChange={(v) => updateUI({ sidebarCollapsed: v })}
            label="Menu compactado"
          />
        </SettingRow>
      </SettingCard>
    </SettingsSection>
  )
}

function DataSection({
  onReset,
  onDownloadBackupJson,
  onDownloadBackupExcel,
  onImportBackupJson,
  loading,
  backupLoading,
  importLoading,
  backupAutomation,
  onUpdateBackupAutomation,
}: {
  onReset: () => void
  onDownloadBackupJson: () => void
  onDownloadBackupExcel: () => void
  onImportBackupJson: (file: File) => void
  loading: boolean
  backupLoading: boolean
  importLoading: boolean
  backupAutomation: StoreSettings['backupAutomation']
  onUpdateBackupAutomation: (patch: Partial<StoreSettings['backupAutomation']>) => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const weekOptions: { value: `${0 | 1 | 2 | 3 | 4 | 5 | 6}`; label: string }[] = [
    { value: '0', label: 'Domingo' },
    { value: '1', label: 'Lunes' },
    { value: '2', label: 'Martes' },
    { value: '3', label: 'Miercoles' },
    { value: '4', label: 'Jueves' },
    { value: '5', label: 'Viernes' },
    { value: '6', label: 'Sabado' },
  ]
  const monthlyDayOptions = Array.from({ length: 31 }, (_, i) => {
    const day = String(i + 1)
    return { value: day, label: day }
  })

  return (
    <SettingsSection icon={<Database className="w-4 h-4 text-red-500 dark:text-red-400" />} title="Datos">
      <SettingCard>
        <SettingRow
          icon={<Database className="w-5 h-5 shrink-0 text-emerald-500 dark:text-emerald-400" />}
          title="Descargar backup completo"
          description="Exporta todos los datos del sistema en JSON o Excel."
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDownloadBackupJson}
              disabled={backupLoading || importLoading}
              className="px-3 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition disabled:opacity-50"
            >
              {backupLoading ? 'Generando...' : 'JSON'}
            </button>
            <button
              type="button"
              onClick={onDownloadBackupExcel}
              disabled={backupLoading || importLoading}
              className="px-3 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition disabled:opacity-50"
            >
              {backupLoading ? 'Generando...' : 'Excel'}
            </button>
          </div>
        </SettingRow>
        <SettingRow
          icon={<Database className="w-5 h-5 shrink-0 text-sky-500 dark:text-sky-400" />}
          title="Importar backup JSON"
          description="Restaura toda la base de datos y configuraciones locales desde un respaldo."
        >
          <div>
            <input
              ref={inputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onImportBackupJson(file)
                e.currentTarget.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={backupLoading || importLoading}
              className="px-3 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition disabled:opacity-50"
            >
              {importLoading ? 'Importando...' : 'Importar JSON'}
            </button>
          </div>
        </SettingRow>
        <SettingRow
          icon={<Database className="w-5 h-5 shrink-0 text-violet-500 dark:text-violet-400" />}
          title="Backup automatico"
          description="Programa descargas automaticas mensuales o semanales. Opcional."
        >
          <div className="w-full md:w-[420px] space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">Activar programacion</span>
              <Toggle
                checked={backupAutomation.enabled}
                onChange={(v) => onUpdateBackupAutomation({ enabled: v })}
                label="Activar backup automatico"
              />
            </div>
            {backupAutomation.enabled && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Select
                    value={backupAutomation.scheduleType}
                    onChange={(v) =>
                      onUpdateBackupAutomation({
                        scheduleType: v as 'monthly' | 'weekly',
                      })
                    }
                    options={[
                      { value: 'monthly', label: 'Mensual' },
                      { value: 'weekly', label: 'Semanal' },
                    ]}
                  />
                  <Select
                    value={backupAutomation.format}
                    onChange={(v) =>
                      onUpdateBackupAutomation({
                        format: v as 'json' | 'xlsx',
                      })
                    }
                    options={[
                      { value: 'json', label: 'Formato JSON' },
                      { value: 'xlsx', label: 'Formato Excel' },
                    ]}
                  />
                </div>
                {backupAutomation.scheduleType === 'monthly' ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Dia del mes</span>
                    <Select
                      value={String(backupAutomation.monthlyDay)}
                      onChange={(v) =>
                        onUpdateBackupAutomation({
                          monthlyDay: Math.min(31, Math.max(1, Number(v) || 1)),
                        })
                      }
                      options={monthlyDayOptions}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Dia de la semana</span>
                    <Select
                      value={String(backupAutomation.weeklyDay) as `${0 | 1 | 2 | 3 | 4 | 5 | 6}`}
                      onChange={(v) =>
                        onUpdateBackupAutomation({
                          weeklyDay: Number(v) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
                        })
                      }
                      options={weekOptions}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </SettingRow>
        <SettingRow
          icon={<Database className="w-5 h-5 shrink-0 text-red-500 dark:text-red-400" />}
          title="Limpiar sistema"
          description="Elimina ventas, cajas, cortes, inventario, devoluciones y movimientos. Conserva usuarios y accesos."
          border={false}
        >
          <button
            type="button"
            onClick={onReset}
            disabled={loading}
            className="px-3 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Limpiando...' : 'Limpiar sistema'}
          </button>
        </SettingRow>
      </SettingCard>
    </SettingsSection>
  )
}

function BrandingSection() {
  const { settings, updateBranding } = useSettings()
  const branding = getResolvedBranding(settings)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona un archivo de imagen valido')
      return
    }
    if (file.size > MAX_BRAND_IMAGE_BYTES) {
      toast.error('La imagen no puede superar 5 MB')
      return
    }

    setUploading(true)
    try {
      if (branding.customImageUrl) {
        await BrandingService.deleteBrandImageByUrl(branding.customImageUrl)
      }
      const url = await BrandingService.uploadBrandImage(file)
      updateBranding({ iconMode: 'custom', customImageUrl: url })
      toast.success('Logo actualizado')
    } catch (error) {
      console.error(error)
      toast.error('No se pudo subir la imagen')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <SettingsSection
      icon={<Sparkles className="w-4 h-4 text-lime-600 dark:text-lime-400" />}
      title="Marca del sistema"
    >
      <SettingCard>
        <div className="p-5 border-b border-gray-50 dark:border-gray-800">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">Vista previa</p>
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-4">
            <AppBrandMark
              titleClassName="font-bold text-gray-900 dark:text-white"
              subtitleClassName="text-xs text-gray-500 dark:text-gray-400 mt-0.5"
            />
          </div>
        </div>

        <div className="p-5 space-y-4 border-b border-gray-50 dark:border-gray-800">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1.5">
              Nombre del sistema
            </label>
            <input
              type="text"
              value={branding.appName}
              onChange={(e) => updateBranding({ appName: e.target.value })}
              maxLength={60}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-lime-500"
              placeholder="Nombre de tu tienda"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1.5">
              Subtitulo
            </label>
            <input
              type="text"
              value={branding.subtitle}
              onChange={(e) => updateBranding({ subtitle: e.target.value })}
              maxLength={120}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-lime-500"
              placeholder="Sistema de Inventario y Punto de Venta"
            />
          </div>
        </div>

        <div className="p-5 space-y-4 border-b border-gray-50 dark:border-gray-800">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Iconos por defecto</p>
            <div className="grid grid-cols-5 gap-2">
              {BRAND_PRESET_OPTIONS.map((option) => {
                const Icon = option.icon
                const selected = branding.iconMode === 'preset' && branding.presetIcon === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => updateBranding({ iconMode: 'preset', presetIcon: option.id })}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition ${
                      selected
                        ? 'border-lime-500 bg-lime-50 dark:bg-lime-950/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-lime-300 dark:hover:border-lime-700'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-lime-500 to-lime-600 dark:from-lime-600 dark:to-lime-700 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[10px] text-gray-600 dark:text-gray-300">{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Imagen personalizada</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              PNG, JPG o WEBP. Maximo 5 MB. Se muestra en login, menu e impresiones.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleImageUpload(file)
              }}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-lime-600 hover:bg-lime-700 text-white transition disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Subiendo...' : 'Subir imagen'}
              </button>
              {branding.iconMode === 'custom' && branding.customImageUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    void BrandingService.deleteBrandImageByUrl(branding.customImageUrl)
                    updateBranding({ iconMode: 'preset', customImageUrl: '' })
                  }}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Quitar imagen
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </SettingCard>
    </SettingsSection>
  )
}

/* --- Pagina principal --- */

export default function ConfiguracionPage() {
  const { settings, resetSettings, lastSavedAt, updateBackupAutomation } = useSettings()
  const { hasConfigSectionAccess, systemUser } = useAuth()
  const [showReset, setShowReset] = useState(false)
  const [clearSystemStep, setClearSystemStep] = useState<'none' | 'review' | 'final'>('none')
  const [clearSystemAck, setClearSystemAck] = useState(false)
  const [clearSystemPhrase, setClearSystemPhrase] = useState('')
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false)
  const [isDataResetLoading, setIsDataResetLoading] = useState(false)
  const [isBackupLoading, setIsBackupLoading] = useState(false)
  const [isImportLoading, setIsImportLoading] = useState(false)
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null)
  const [savedPulse, setSavedPulse] = useState(false)
  const canViewNotifications = hasConfigSectionAccess('notifications')
  const canViewInterface = hasConfigSectionAccess('interfaz')
  const canViewInventory = hasConfigSectionAccess('inventory')
  const canViewPrinting = hasConfigSectionAccess('printing')
  const canViewData = hasConfigSectionAccess('data')
  const canViewBranding = systemUser?.rol === 'Administrador'
  const hasVisibleSections =
    canViewNotifications || canViewInterface || canViewInventory || canViewPrinting || canViewData || canViewBranding

  useEffect(() => {
    setSavedPulse(true)
    const t = setTimeout(() => setSavedPulse(false), 1500)
    return () => clearTimeout(t)
  }, [lastSavedAt])

  const handleReset = () => {
    resetSettings()
    setShowReset(false)
  }

  const resetClearSystemConfirm = () => {
    setClearSystemStep('none')
    setClearSystemAck(false)
    setClearSystemPhrase('')
  }

  const handleClearData = async () => {
    if (isDataResetLoading) return
    setIsDataResetLoading(true)
    try {
      const result = await MaintenanceService.clearDataExceptUsers()
      const total = Object.values(result.deletedByPath).reduce((s, n) => s + n, 0)
      toast.success(
        total > 0
          ? `Sistema limpiado (${total} registros eliminados). Los usuarios se conservaron.`
          : 'No había datos operativos que eliminar. Los usuarios se conservaron.',
      )
      resetClearSystemConfirm()
    } catch (err) {
      console.error(err)
      const msg =
        err instanceof Error ? err.message : 'Error al limpiar el sistema'
      toast.error(msg)
    } finally {
      setIsDataResetLoading(false)
    }
  }

  const handleDownloadBackupJson = async () => {
    if (isBackupLoading || isImportLoading) return
    setIsBackupLoading(true)
    try {
      await MaintenanceService.downloadFullBackupJson(settings)
      toast.success('Backup JSON descargado')
    } catch (error) {
      console.error(error)
      toast.error('No se pudo descargar el backup JSON')
    } finally {
      setIsBackupLoading(false)
    }
  }

  const handleDownloadBackupExcel = async () => {
    if (isBackupLoading || isImportLoading) return
    setIsBackupLoading(true)
    try {
      await MaintenanceService.downloadFullBackupExcel(settings)
      toast.success('Backup Excel descargado')
    } catch (error) {
      console.error(error)
      toast.error('No se pudo descargar el backup Excel')
    } finally {
      setIsBackupLoading(false)
    }
  }

  const handleImportBackupJson = async (file: File) => {
    if (isBackupLoading || isImportLoading) return
    setIsImportLoading(true)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as any
      if (!parsed?.database || typeof parsed.database !== 'object') {
        throw new Error('Formato inválido: falta el bloque database')
      }

      await MaintenanceService.restoreFullBackup(parsed)

      if (parsed?.local?.settings) {
        localStorage.setItem('bk-store-settings', JSON.stringify(parsed.local.settings))
      }

      toast.success('Backup importado correctamente. Recargando...')
      setTimeout(() => window.location.reload(), 700)
    } catch (error) {
      console.error(error)
      toast.error('No se pudo importar el backup JSON')
    } finally {
      setIsImportLoading(false)
    }
  }

  return (
    <div className="min-h-screen app-page-bg text-gray-900 dark:text-gray-100 flex flex-col md:flex-row">
      <Sidebar activeItem="configuracion" />

      <main className="flex-1 overflow-auto md:p-8 p-4 pt-20 md:pt-0">
        <div className="max-w-2xl">
          <div className="flex items-start gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-lime-100 dark:bg-lime-950/50 flex items-center justify-center">
              <Settings className="w-7 h-7 text-lime-600 dark:text-lime-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Configuración</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Preferencias del sistema</p>
            </div>
            <div className="flex items-center gap-2">
              {savedPulse && (
                <span className="text-xs text-gray-500 dark:text-gray-400">Guardado</span>
              )}
            </div>
          </div>

          <div className="space-y-8">
            {!hasVisibleSections && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-700 dark:text-amber-300">
                No tienes secciones habilitadas en Configuracion.
              </div>
            )}
            {canViewBranding && <BrandingSection />}
            {canViewInterface && (
              <>
                <ThemeSection />
                <InterfaceSection />
              </>
            )}
            {canViewNotifications && <NotificationsSection />}
            {canViewInventory && <InventorySection />}
            {canViewPrinting && <PrintingSection />}
            {canViewData && (
              <DataSection
                onReset={() => {
                  setClearSystemAck(false)
                  setClearSystemPhrase('')
                  setClearSystemStep('review')
                }}
                onDownloadBackupJson={() => {
                  void handleDownloadBackupJson()
                }}
                onDownloadBackupExcel={() => {
                  void handleDownloadBackupExcel()
                }}
                onImportBackupJson={(file) => {
                  setPendingImportFile(file)
                  setIsImportConfirmOpen(true)
                }}
                loading={isDataResetLoading}
                backupLoading={isBackupLoading}
                importLoading={isImportLoading}
                backupAutomation={settings.backupAutomation}
                onUpdateBackupAutomation={updateBackupAutomation}
              />
            )}
          </div>

          {canViewData && (
            <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-800">
              {!showReset ? (
                <button
                  type="button"
                  onClick={() => setShowReset(true)}
                  className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restablecer valores predeterminados
                </button>
              ) : (
                <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl p-4">
                  <p className="text-sm text-red-600 dark:text-red-400 flex-1">
                    ¿Estás seguro? Esto restablecerá todas las preferencias (excepto el tema).
                  </p>
                  <button type="button" onClick={handleReset} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors">
                    Confirmar
                  </button>
                  <button type="button" onClick={() => setShowReset(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors">
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <ConfirmDialog
          isOpen={clearSystemStep === 'review'}
          title="Paso 1 de 2 — Limpiar sistema"
          description={
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <p>
                Esta acción <strong>borra toda la información operativa</strong> del sistema.
                No se puede deshacer.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-400">
                <li>Ventas y órdenes</li>
                <li>Cajas, cortes y devoluciones</li>
                <li>Inventario, productos y movimientos de stock</li>
                <li>Historial de caja activa por usuario</li>
              </ul>
              <p className="text-emerald-700 dark:text-emerald-400 text-xs">
                Se conservan: usuarios, roles, permisos e índice de acceso.
              </p>
              <p className="text-amber-700 dark:text-amber-400 text-xs">
                Recomendación: descarga un backup antes de continuar.
              </p>
            </div>
          }
          confirmLabel="Continuar al paso final"
          cancelLabel="Cancelar"
          danger
          onCancel={resetClearSystemConfirm}
          onConfirm={() => {
            setClearSystemAck(false)
            setClearSystemPhrase('')
            setClearSystemStep('final')
          }}
        />
        <ConfirmDialog
          isOpen={clearSystemStep === 'final'}
          title="Paso 2 de 2 — Confirmar limpieza"
          description={
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200">
                <p className="font-semibold">Se eliminará toda la información del sistema.</p>
                <p className="mt-1 text-xs opacity-90">
                  Ventas, inventario, cajas, cortes y movimientos quedarán en blanco.
                </p>
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={clearSystemAck}
                  onChange={(e) => setClearSystemAck(e.target.checked)}
                  className="mt-1 rounded border-gray-300"
                />
                <span>
                  Entiendo que esta acción es <strong>irreversible</strong> y deseo limpiar el sistema.
                </span>
              </label>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Escribe <span className="font-mono font-bold text-red-600 dark:text-red-400">LIMPIAR</span> para confirmar
                </label>
                <input
                  type="text"
                  value={clearSystemPhrase}
                  onChange={(e) => setClearSystemPhrase(e.target.value.toUpperCase())}
                  placeholder="LIMPIAR"
                  autoComplete="off"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono text-sm uppercase"
                />
              </div>
            </div>
          }
          confirmLabel={isDataResetLoading ? 'Limpiando...' : 'Limpiar sistema'}
          cancelLabel="Volver"
          danger
          confirmDisabled={
            isDataResetLoading ||
            !clearSystemAck ||
            clearSystemPhrase.trim() !== 'LIMPIAR'
          }
          onCancel={() => setClearSystemStep('review')}
          onConfirm={() => {
            void handleClearData()
          }}
        />
        <ConfirmDialog
          isOpen={isImportConfirmOpen}
          title="Importar backup JSON"
          description="Esta acción sobrescribirá todos los datos actuales del sistema. ¿Deseas continuar?"
          confirmLabel="Sí, importar backup"
          cancelLabel="Cancelar"
          danger
          onCancel={() => {
            setIsImportConfirmOpen(false)
            setPendingImportFile(null)
          }}
          onConfirm={() => {
            const file = pendingImportFile
            setIsImportConfirmOpen(false)
            setPendingImportFile(null)
            if (file) {
              void handleImportBackupJson(file)
            }
          }}
        />
      </main>
    </div>
  )
}


