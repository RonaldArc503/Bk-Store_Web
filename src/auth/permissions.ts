import type { UserRole } from '../types'

export type AccessLevel = 'none' | 'view' | 'full'
export type PosAccessLevel = 'none' | 'full'
export type ModuleKey =
  | 'dashboard'
  | 'pos'
  | 'corte'
  | 'corteReopen'
  | 'inventory'
  | 'reports'
  | 'users'
  | 'configuracion'

export type ConfigSectionKey =
  | 'notifications'
  | 'interfaz'
  | 'inventory'
  | 'printing'
  | 'data'

export interface UserPermissions {
  modules: {
    dashboard: boolean
    pos: PosAccessLevel
    corte: AccessLevel
    corteReopen: AccessLevel
    inventory: AccessLevel
    reports: boolean
    users: boolean
    configuracion: boolean
  }
  configSections: {
    notifications: boolean
    interfaz: boolean
    inventory: boolean
    printing: boolean
    data: boolean
  }
}

const FULL_PERMISSIONS: UserPermissions = {
  modules: {
    dashboard: true,
    pos: 'full',
    corte: 'full',
    corteReopen: 'full',
    inventory: 'full',
    reports: true,
    users: true,
    configuracion: true,
  },
  configSections: {
    notifications: true,
    interfaz: true,
    inventory: true,
    printing: true,
    data: true,
  },
}

const ROLE_DEFAULTS: Record<UserRole, UserPermissions> = {
  Administrador: FULL_PERMISSIONS,
  Bodeguero: {
    modules: {
      dashboard: true,
      pos: 'none',
      corte: 'view',
      corteReopen: 'none',
      inventory: 'full',
      reports: true,
      users: false,
      configuracion: false,
    },
    configSections: {
      notifications: false,
      interfaz: false,
      inventory: false,
      printing: false,
      data: false,
    },
  },
  Caja: {
    modules: {
      dashboard: true,
      pos: 'full',
      corte: 'full',
      corteReopen: 'full',
      inventory: 'view',
      reports: false,
      users: false,
      configuracion: false,
    },
    configSections: {
      notifications: false,
      interfaz: false,
      inventory: false,
      printing: false,
      data: false,
    },
  },
  Vendedor: {
    modules: {
      dashboard: true,
      pos: 'full',
      corte: 'view',
      corteReopen: 'none',
      inventory: 'view',
      reports: false,
      users: false,
      configuracion: false,
    },
    configSections: {
      notifications: false,
      interfaz: false,
      inventory: false,
      printing: false,
      data: false,
    },
  },
}

function clonePermissions(input: UserPermissions): UserPermissions {
  return {
    modules: { ...input.modules },
    configSections: { ...input.configSections },
  }
}

export function getFullPermissions(): UserPermissions {
  return clonePermissions(FULL_PERMISSIONS)
}

export function getDefaultPermissionsByRole(role?: UserRole): UserPermissions {
  if (!role) return clonePermissions(ROLE_DEFAULTS.Vendedor)
  return clonePermissions(ROLE_DEFAULTS[role] || ROLE_DEFAULTS.Vendedor)
}

export function normalizePermissions(raw: unknown, role?: UserRole): UserPermissions {
  const base = role === 'Administrador'
    ? getFullPermissions()
    : getDefaultPermissionsByRole(role)

  if (!raw || typeof raw !== 'object') {
    return base
  }

  const source = raw as Partial<UserPermissions>
  const sourceModules = (source.modules || {}) as Partial<UserPermissions['modules']>
  const sourceSections = (source.configSections || {}) as Partial<UserPermissions['configSections']>

  const merged: UserPermissions = {
    modules: {
      dashboard: sourceModules.dashboard ?? base.modules.dashboard,
      pos: sourceModules.pos ?? base.modules.pos,
      corte: sourceModules.corte ?? base.modules.corte,
      corteReopen: sourceModules.corteReopen ?? base.modules.corteReopen,
      inventory: sourceModules.inventory ?? base.modules.inventory,
      reports: sourceModules.reports ?? base.modules.reports,
      users: sourceModules.users ?? base.modules.users,
      configuracion: sourceModules.configuracion ?? base.modules.configuracion,
    },
    configSections: {
      notifications: sourceSections.notifications ?? base.configSections.notifications,
      interfaz: sourceSections.interfaz ?? base.configSections.interfaz,
      inventory: sourceSections.inventory ?? base.configSections.inventory,
      printing: sourceSections.printing ?? base.configSections.printing,
      data: sourceSections.data ?? base.configSections.data,
    },
  }

  if (role === 'Administrador') {
    return getFullPermissions()
  }

  if (merged.modules.pos !== 'full') {
    merged.modules.pos = 'none'
  }

  const sanitizeAccess = (value: AccessLevel): AccessLevel => {
    if (value === 'full' || value === 'view') return value
    return 'none'
  }
  merged.modules.corte = sanitizeAccess(merged.modules.corte)
  merged.modules.corteReopen = sanitizeAccess(merged.modules.corteReopen)
  merged.modules.inventory = sanitizeAccess(merged.modules.inventory)
  merged.modules.users = false
  if (merged.modules.corte !== 'full') {
    merged.modules.corteReopen = 'none'
  }

  return merged
}

export function hasModulePermission(
  permissions: UserPermissions | null | undefined,
  moduleKey: ModuleKey,
  required: 'view' | 'full' = 'view',
): boolean {
  if (!permissions) return false

  const value = permissions.modules[moduleKey]
  if (moduleKey === 'dashboard' || moduleKey === 'reports' || moduleKey === 'users' || moduleKey === 'configuracion') {
    return Boolean(value)
  }
  if (moduleKey === 'pos') {
    return value === 'full'
  }

  if (required === 'full') {
    return value === 'full'
  }

  return value === 'view' || value === 'full'
}

export function hasConfigSectionPermission(
  permissions: UserPermissions | null | undefined,
  section: ConfigSectionKey,
): boolean {
  if (!permissions) return false
  if (!permissions.modules.configuracion) return false
  return permissions.configSections[section] === true
}
