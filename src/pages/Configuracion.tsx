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
} from 'lucide-react'
import { Sidebar } from '../components/Sidebar'
import { useTheme } from '../context/ThemeContext'
import { useSettings, type InventoryCatalogItem } from '../context/SettingsContext'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { MaintenanceService } from '../services/MaintenanceService'
import { ProductService } from '../services/ProductService'
import type { Producto } from '../types/product'
import * as XLSX from 'xlsx'

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
  const [productosLoading, setProductosLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const list = await ProductService.getProductos()
        if (!alive) return
        setProductos(list)
      } catch {
        // Non-blocking: catalog editing still works without counts.
      } finally {
        if (alive) setProductosLoading(false)
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
            Estas opciones se usan al crear/editar productos en Inventario.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Tipos de prenda
              </p>
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
                  className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent transition-colors"
                />
                <button
                  type="button"
                  onClick={() => {
                    addToList('productTypes', newProductType)
                    setNewProductType('')
                  }}
                  className="px-3 py-2 rounded-lg bg-lime-600 hover:bg-lime-700 text-white text-sm font-medium transition-colors"
                >
                  Agregar
                </button>
              </div>
              {productTypes.length === 0 ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  No hay tipos configurados. Agrega al menos 1 para poder seleccionar en Inventario.
                </p>
              ) : (
                <div className="space-y-2">
                  {productTypes.map((it: InventoryCatalogItem, idx: number) => {
                    const isEditing = editing?.key === 'productTypes' && editing.id === it.id
                    const count = usage.typeCount.get(normalizeKey(it.label)) || 0
                    return (
                      <div
                        key={it.id}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
                      >
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <input
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  void commitEdit()
                                }
                                if (e.key === 'Escape') cancelEdit()
                              }}
                              className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                              aria-label="Renombrar tipo de prenda"
                              autoFocus
                            />
                          ) : (
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="truncate text-sm text-gray-900 dark:text-gray-100">{it.label}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">({count})</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveItem('productTypes', idx, -1)}
                            disabled={idx === 0}
                            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40"
                            aria-label="Subir"
                            title="Subir"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem('productTypes', idx, 1)}
                            disabled={idx === productTypes.length - 1}
                            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40"
                            aria-label="Bajar"
                            title="Bajar"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>

                          {!isEditing ? (
                            <button
                              type="button"
                              onClick={() => startEdit('productTypes', it)}
                              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                              aria-label="Editar"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => void commitEdit()}
                                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                                aria-label="Guardar"
                                title="Guardar"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                                aria-label="Cancelar"
                                title="Cancelar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => removeFromList('productTypes', it.id)}
                            className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400"
                            aria-label="Eliminar"
                            title={count > 0 ? 'No se puede eliminar (en uso)' : 'Eliminar'}
                            disabled={count > 0}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  {!productosLoading && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      El numero entre parentesis indica cuantos productos usan cada opcion.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Materiales
              </p>
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
                  className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent transition-colors"
                />
                <button
                  type="button"
                  onClick={() => {
                    addToList('materials', newMaterial)
                    setNewMaterial('')
                  }}
                  className="px-3 py-2 rounded-lg bg-lime-600 hover:bg-lime-700 text-white text-sm font-medium transition-colors"
                >
                  Agregar
                </button>
              </div>
              {materials.length === 0 ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  No hay materiales configurados. Agrega al menos 1 para poder seleccionar en Inventario.
                </p>
              ) : (
                <div className="space-y-2">
                  {materials.map((it: InventoryCatalogItem, idx: number) => {
                    const isEditing = editing?.key === 'materials' && editing.id === it.id
                    const count = usage.materialCount.get(normalizeKey(it.label)) || 0
                    return (
                      <div
                        key={it.id}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
                      >
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <input
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  void commitEdit()
                                }
                                if (e.key === 'Escape') cancelEdit()
                              }}
                              className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                              aria-label="Renombrar material"
                              autoFocus
                            />
                          ) : (
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="truncate text-sm text-gray-900 dark:text-gray-100">{it.label}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">({count})</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveItem('materials', idx, -1)}
                            disabled={idx === 0}
                            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40"
                            aria-label="Subir"
                            title="Subir"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem('materials', idx, 1)}
                            disabled={idx === materials.length - 1}
                            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40"
                            aria-label="Bajar"
                            title="Bajar"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>

                          {!isEditing ? (
                            <button
                              type="button"
                              onClick={() => startEdit('materials', it)}
                              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                              aria-label="Editar"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => void commitEdit()}
                                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                                aria-label="Guardar"
                                title="Guardar"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                                aria-label="Cancelar"
                                title="Cancelar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => removeFromList('materials', it.id)}
                            className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400"
                            aria-label="Eliminar"
                            title={count > 0 ? 'No se puede eliminar (en uso)' : 'Eliminar'}
                            disabled={count > 0}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  {!productosLoading && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      El numero entre parentesis indica cuantos productos usan cada opcion.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </SettingCard>
    </SettingsSection>
  )
}

function PrintingSection() {
  const { settings, updatePrinting } = useSettings()
  const { printing } = settings

  return (
    <SettingsSection icon={<Printer className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />} title="Impresión">
      <SettingCard>
        <SettingRow icon={<Printer className="w-5 h-5 shrink-0 text-cyan-500 dark:text-cyan-400" />} title="Imprimir ticket automático" description="Descargar PDF al finalizar cada venta">
          <Toggle checked={printing.autoPrint} onChange={(v) => updatePrinting({ autoPrint: v })} label="Imprimir ticket automático" />
        </SettingRow>
        <SettingRow icon={<Printer className="w-5 h-5 shrink-0 text-cyan-500 dark:text-cyan-400" />} title="Tamaño de papel" description="Ancho del rollo de la impresora térmica" border={false}>
          <Select
            value={printing.paperSize}
            onChange={(v) => updatePrinting({ paperSize: v })}
            options={[
              { value: '58mm', label: 'Térmico 58 mm' },
              { value: '80mm', label: 'Térmico 80 mm' },
              { value: 'letter', label: 'Carta' },
            ]}
          />
        </SettingRow>
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
}: {
  onReset: () => void
  onDownloadBackupJson: () => void
  onDownloadBackupExcel: () => void
  onImportBackupJson: (file: File) => void
  loading: boolean
  backupLoading: boolean
  importLoading: boolean
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)

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
          icon={<Database className="w-5 h-5 shrink-0 text-red-500 dark:text-red-400" />}
          title="Borrar datos de prueba"
          description="Elimina ventas, cajas, cortes, inventario y movimientos. Conserva usuarios."
          border={false}
        >
          <button
            type="button"
            onClick={onReset}
            disabled={loading}
            className="px-3 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Borrando...' : 'Borrar datos'}
          </button>
        </SettingRow>
      </SettingCard>
    </SettingsSection>
  )
}

/* --- Pagina principal --- */

export default function ConfiguracionPage() {
  const { settings, resetSettings, lastSavedAt, canUndo, undoLastChange } = useSettings()
  const [showReset, setShowReset] = useState(false)
  const [isDataResetOpen, setIsDataResetOpen] = useState(false)
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false)
  const [isDataResetLoading, setIsDataResetLoading] = useState(false)
  const [isBackupLoading, setIsBackupLoading] = useState(false)
  const [isImportLoading, setIsImportLoading] = useState(false)
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null)
  const [savedPulse, setSavedPulse] = useState(false)

  useEffect(() => {
    setSavedPulse(true)
    const t = setTimeout(() => setSavedPulse(false), 1500)
    return () => clearTimeout(t)
  }, [lastSavedAt])

  const handleReset = () => {
    resetSettings()
    setShowReset(false)
  }

  const handleClearData = async () => {
    if (isDataResetLoading) return
    setIsDataResetLoading(true)
    try {
      await MaintenanceService.clearDataExceptUsers()
      toast.success('Datos eliminados correctamente')
    } catch (err) {
      toast.error('Error al borrar datos')
    } finally {
      setIsDataResetLoading(false)
    }
  }

  const triggerDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const buildBackupFileName = (ext: 'json' | 'xlsx') => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    return `bk-store-backup-${stamp}.${ext}`
  }

  const handleDownloadBackupJson = async () => {
    if (isBackupLoading || isImportLoading) return
    setIsBackupLoading(true)
    try {
      const backup = await MaintenanceService.createFullBackup(settings)
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json;charset=utf-8',
      })
      triggerDownload(blob, buildBackupFileName('json'))
      toast.success('Backup JSON descargado')
    } catch (error) {
      console.error(error)
      toast.error('No se pudo descargar el backup JSON')
    } finally {
      setIsBackupLoading(false)
    }
  }

  const flattenForSheet = (value: unknown): Record<string, unknown>[] => {
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
  }

  const handleDownloadBackupExcel = async () => {
    if (isBackupLoading || isImportLoading) return
    setIsBackupLoading(true)
    try {
      const backup = await MaintenanceService.createFullBackup(settings)
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
        const rows = flattenForSheet((backup.database as Record<string, unknown>)[key])
        const sheetName = key.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 31) || 'data'
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheetName)
      }

      const localRows = flattenForSheet(backup.local?.settings || {})
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(localRows), 'config_local')
      XLSX.writeFile(wb, buildBackupFileName('xlsx'))
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col md:flex-row">
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
              {canUndo && (
                <button
                  type="button"
                  onClick={undoLastChange}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Deshacer
                </button>
              )}
            </div>
          </div>

          <div className="space-y-8">
            <ThemeSection />
            <NotificationsSection />
            <InterfaceSection />
            <InventorySection />
            <PrintingSection />
            <DataSection
              onReset={() => setIsDataResetOpen(true)}
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
            />
          </div>

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
        </div>

        <ConfirmDialog
          isOpen={isDataResetOpen}
          title="Borrar datos de prueba"
          description="Se eliminarán ventas, cajas, cortes, inventario y movimientos. Los usuarios se conservarán."
          confirmLabel="Borrar datos"
          cancelLabel="Cancelar"
          danger
          onCancel={() => setIsDataResetOpen(false)}
          onConfirm={() => {
            setIsDataResetOpen(false)
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


