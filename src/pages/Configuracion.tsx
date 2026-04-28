import {
  Settings,
  Sun,
  Moon,
  Globe,
  Banknote,
  Bell,
  BellOff,
  Package,
  Printer,
  RotateCcw,
} from 'lucide-react'
import { Sidebar } from '../components/Sidebar'
import { useTheme } from '../context/ThemeContext'
import { useSettings, type StoreSettings } from '../context/SettingsContext'
import { useState } from 'react'

/* ─── Toggle switch reutilizable ─── */

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

/* ─── Select reutilizable ─── */

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

/* ─── Card wrapper ─── */

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

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
        {title}
      </h2>
    </div>
  )
}

/* ─── Secciones ─── */

function ThemeSection() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div>
      <SectionTitle
        icon={isDark ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
        title="Apariencia"
      />
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
    </div>
  )
}

function LanguageSection() {
  const { settings, updateSettings } = useSettings()
  const languageOptions: { value: StoreSettings['language']; label: string }[] = [
    { value: 'es', label: 'Español' },
    { value: 'en', label: 'English' },
  ]

  return (
    <div>
      <SectionTitle icon={<Globe className="w-4 h-4 text-blue-500 dark:text-blue-400" />} title="Regional" />
      <SettingCard>
        <SettingRow
          icon={<Globe className="w-5 h-5 shrink-0 text-blue-500 dark:text-blue-400" />}
          title="Idioma"
          description="Idioma de la interfaz"
        >
          <Select value={settings.language} onChange={(v) => updateSettings({ language: v })} options={languageOptions} />
        </SettingRow>
        <SettingRow
          icon={<Banknote className="w-5 h-5 shrink-0 text-emerald-500 dark:text-emerald-400" />}
          title="Moneda"
          description="Formato de precios en el sistema"
          border={false}
        >
          <Select
            value={settings.currency}
            onChange={(v) => updateSettings({ currency: v })}
            options={[
              { value: 'MXN', label: '$ MXN - Peso Mexicano' },
              { value: 'USD', label: '$ USD - Dólar' },
              { value: 'EUR', label: '€ EUR - Euro' },
            ]}
          />
        </SettingRow>
      </SettingCard>
    </div>
  )
}

function NotificationsSection() {
  const { settings, updateNotifications } = useSettings()
  const { notifications } = settings
  const anyActive = notifications.lowStock || notifications.sales || notifications.cashRegister

  return (
    <div>
      <SectionTitle
        icon={anyActive ? <Bell className="w-4 h-4 text-orange-500 dark:text-orange-400" /> : <BellOff className="w-4 h-4 text-gray-400" />}
        title="Notificaciones"
      />
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
    </div>
  )
}

function InventorySection() {
  const { settings, updateInventory } = useSettings()
  const [localThreshold, setLocalThreshold] = useState(String(settings.inventory.lowStockThreshold))

  const handleBlur = () => {
    const n = parseInt(localThreshold, 10)
    if (!isNaN(n) && n >= 0) {
      updateInventory({ lowStockThreshold: n })
    } else {
      setLocalThreshold(String(settings.inventory.lowStockThreshold))
    }
  }

  return (
    <div>
      <SectionTitle icon={<Package className="w-4 h-4 text-violet-500 dark:text-violet-400" />} title="Inventario" />
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
      </SettingCard>
    </div>
  )
}

function PrintingSection() {
  const { settings, updatePrinting } = useSettings()
  const { printing } = settings

  return (
    <div>
      <SectionTitle icon={<Printer className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />} title="Impresión" />
      <SettingCard>
        <SettingRow icon={<Printer className="w-5 h-5 shrink-0 text-cyan-500 dark:text-cyan-400" />} title="Imprimir ticket automático" description="Imprimir al finalizar cada venta">
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
    </div>
  )
}

/* ─── Página principal ─── */

export default function ConfiguracionPage() {
  const { resetSettings } = useSettings()
  const [showReset, setShowReset] = useState(false)

  const handleReset = () => {
    resetSettings()
    setShowReset(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col md:flex-row">
      <Sidebar activeItem="configuracion" />

      <main className="flex-1 overflow-auto md:p-8 p-4 pt-20 md:pt-0">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-lime-100 dark:bg-lime-950/50 flex items-center justify-center">
              <Settings className="w-7 h-7 text-lime-600 dark:text-lime-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Configuración</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Preferencias del sistema</p>
            </div>
          </div>

          <div className="space-y-8">
            <ThemeSection />
            <LanguageSection />
            <NotificationsSection />
            <InventorySection />
            <PrintingSection />
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
      </main>
    </div>
  )
}
