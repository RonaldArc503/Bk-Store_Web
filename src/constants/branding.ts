import type { LucideIcon } from 'lucide-react'
import { Package, ShoppingBag, ShoppingCart, Shirt, Store } from 'lucide-react'
import type { StoreSettings } from '../context/SettingsContext'

export type BrandPresetIconId =
  | 'shopping-cart'
  | 'shopping-bag'
  | 'store'
  | 'package'
  | 'shirt'

export type BrandIconMode = 'preset' | 'custom'

export interface StoreBranding {
  appName: string
  subtitle: string
  iconMode: BrandIconMode
  presetIcon: BrandPresetIconId
  customImageUrl: string
}

export const DEFAULT_APP_NAME = 'Bikini Store'
export const DEFAULT_SUBTITLE = 'Sistema de Inventario y Punto de Venta'
export const MAX_BRAND_IMAGE_BYTES = 5 * 1024 * 1024

export const DEFAULT_BRANDING: StoreBranding = {
  appName: DEFAULT_APP_NAME,
  subtitle: DEFAULT_SUBTITLE,
  iconMode: 'preset',
  presetIcon: 'shopping-cart',
  customImageUrl: '',
}

export const BRAND_PRESET_OPTIONS: Array<{ id: BrandPresetIconId; label: string; icon: LucideIcon }> = [
  { id: 'shopping-cart', label: 'Carrito', icon: ShoppingCart },
  { id: 'shopping-bag', label: 'Bolsa', icon: ShoppingBag },
  { id: 'store', label: 'Tienda', icon: Store },
  { id: 'package', label: 'Paquete', icon: Package },
  { id: 'shirt', label: 'Ropa', icon: Shirt },
]

const PRESET_ICON_MAP: Record<BrandPresetIconId, LucideIcon> = {
  'shopping-cart': ShoppingCart,
  'shopping-bag': ShoppingBag,
  store: Store,
  package: Package,
  shirt: Shirt,
}

export function normalizeBranding(raw: unknown): StoreBranding {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Partial<StoreBranding>
  const presetIcon = BRAND_PRESET_OPTIONS.some((opt) => opt.id === source.presetIcon)
    ? (source.presetIcon as BrandPresetIconId)
    : DEFAULT_BRANDING.presetIcon

  return {
    appName: typeof source.appName === 'string' && source.appName.trim()
      ? source.appName.trim()
      : DEFAULT_APP_NAME,
    subtitle: typeof source.subtitle === 'string' ? source.subtitle.trim() : DEFAULT_SUBTITLE,
    iconMode: source.iconMode === 'custom' ? 'custom' : 'preset',
    presetIcon,
    customImageUrl: typeof source.customImageUrl === 'string' ? source.customImageUrl.trim() : '',
  }
}

export function getResolvedBranding(settings: StoreSettings): StoreBranding {
  return normalizeBranding(settings.branding)
}

export function getPresetIconComponent(id: BrandPresetIconId): LucideIcon {
  return PRESET_ICON_MAP[id] ?? ShoppingCart
}
