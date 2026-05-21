import { useEffect, useMemo, useState } from 'react'
import { Shield, X } from 'lucide-react'
import type { SystemUser } from '../types'
import { UserService } from '../services/UserService'
import {
  normalizePermissions,
  type UserPermissions,
} from '../auth/permissions'

interface UserPermissionsModalProps {
  isOpen: boolean
  user: SystemUser | null
  onClose: () => void
  onSaved: (permissions: UserPermissions) => void
}

function RadioOption({
  value,
  checked,
  label,
  onChange,
}: {
  value: string
  checked: boolean
  label: string
  onChange: (value: string) => void
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
      <input
        type="radio"
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="h-4 w-4 text-lime-600 border-gray-300 focus:ring-lime-500"
      />
      {label}
    </label>
  )
}

export function UserPermissionsModal({
  isOpen,
  user,
  onClose,
  onSaved,
}: UserPermissionsModalProps) {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isAdmin = user?.rol === 'Administrador'

  useEffect(() => {
    if (!isOpen || !user) return
    setPermissions(normalizePermissions(user.permissions, user.rol))
    setError('')
  }, [isOpen, user])

  const canRenderForm = useMemo(
    () => Boolean(isOpen && user && permissions),
    [isOpen, user, permissions],
  )

  if (!isOpen || !user) return null

  const updatePermissions = (next: UserPermissions) => {
    setPermissions(next)
  }

  const handleSave = async () => {
    if (!permissions) return
    setSaving(true)
    setError('')
    try {
      const updated = await UserService.updateUserPermissions(user.id, permissions)
      onSaved(updated)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar permisos')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[92vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Permisos de Usuario</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {user.usuario} · {user.nombreCompleto}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {!canRenderForm ? (
          <div className="p-6 text-sm text-gray-500 dark:text-gray-400">Cargando permisos...</div>
        ) : (
          <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {isAdmin && (
              <div className="rounded-lg border border-lime-200 bg-lime-50 text-lime-700 dark:border-lime-900/60 dark:bg-lime-950/40 dark:text-lime-300 px-4 py-3 text-sm flex items-start gap-2">
                <Shield className="w-4 h-4 mt-0.5 shrink-0" />
                El administrador siempre tiene acceso completo por defecto.
              </div>
            )}

            {permissions && (
              <>
                <section className="space-y-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                    Modulos
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Dashboard</p>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={permissions.modules.dashboard}
                          disabled={isAdmin}
                          onChange={(e) =>
                            updatePermissions({
                              ...permissions,
                              modules: { ...permissions.modules, dashboard: e.target.checked },
                            })
                          }
                        />
                        Visible
                      </label>
                    </div>

                    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Punto de Venta</p>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={permissions.modules.pos === 'full'}
                          disabled={isAdmin}
                          onChange={(e) =>
                            updatePermissions({
                              ...permissions,
                              modules: { ...permissions.modules, pos: e.target.checked ? 'full' : 'none' },
                            })
                          }
                        />
                        Acceso completo
                      </label>
                    </div>

                    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Corte de Caja</p>
                      <div className="flex flex-wrap gap-4">
                        <RadioOption
                          value="full"
                          label="Acceso completo"
                          checked={permissions.modules.corte === 'full'}
                          onChange={(value) =>
                            updatePermissions({
                              ...permissions,
                              modules: { ...permissions.modules, corte: value as 'none' | 'view' | 'full' },
                            })
                          }
                        />
                        <RadioOption
                          value="view"
                          label="Solo vista"
                          checked={permissions.modules.corte === 'view'}
                          onChange={(value) =>
                            updatePermissions({
                              ...permissions,
                              modules: { ...permissions.modules, corte: value as 'none' | 'view' | 'full' },
                            })
                          }
                        />
                        <RadioOption
                          value="none"
                          label="Sin acceso"
                          checked={permissions.modules.corte === 'none'}
                          onChange={(value) =>
                            updatePermissions({
                              ...permissions,
                              modules: { ...permissions.modules, corte: value as 'none' | 'view' | 'full' },
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Reabrir Caja</p>
                      <div className="flex flex-wrap gap-4">
                        <RadioOption
                          value="full"
                          label="Acceso completo"
                          checked={permissions.modules.corteReopen === 'full'}
                          onChange={(value) =>
                            updatePermissions({
                              ...permissions,
                              modules: { ...permissions.modules, corteReopen: value as 'none' | 'view' | 'full' },
                            })
                          }
                        />
                        <RadioOption
                          value="view"
                          label="Solo vista"
                          checked={permissions.modules.corteReopen === 'view'}
                          onChange={(value) =>
                            updatePermissions({
                              ...permissions,
                              modules: { ...permissions.modules, corteReopen: value as 'none' | 'view' | 'full' },
                            })
                          }
                        />
                        <RadioOption
                          value="none"
                          label="Sin acceso"
                          checked={permissions.modules.corteReopen === 'none'}
                          onChange={(value) =>
                            updatePermissions({
                              ...permissions,
                              modules: { ...permissions.modules, corteReopen: value as 'none' | 'view' | 'full' },
                            })
                          }
                        />
                      </div>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Permite reabrir caja cerrada solo en el mismo dia.
                      </p>
                    </div>

                    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Inventario</p>
                      <div className="flex flex-wrap gap-4">
                        <RadioOption
                          value="full"
                          label="Acceso completo"
                          checked={permissions.modules.inventory === 'full'}
                          onChange={(value) =>
                            updatePermissions({
                              ...permissions,
                              modules: { ...permissions.modules, inventory: value as 'none' | 'view' | 'full' },
                            })
                          }
                        />
                        <RadioOption
                          value="view"
                          label="Solo vista"
                          checked={permissions.modules.inventory === 'view'}
                          onChange={(value) =>
                            updatePermissions({
                              ...permissions,
                              modules: { ...permissions.modules, inventory: value as 'none' | 'view' | 'full' },
                            })
                          }
                        />
                        <RadioOption
                          value="none"
                          label="Sin acceso"
                          checked={permissions.modules.inventory === 'none'}
                          onChange={(value) =>
                            updatePermissions({
                              ...permissions,
                              modules: { ...permissions.modules, inventory: value as 'none' | 'view' | 'full' },
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Reportes</p>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={permissions.modules.reports}
                          disabled={isAdmin}
                          onChange={(e) =>
                            updatePermissions({
                              ...permissions,
                              modules: { ...permissions.modules, reports: e.target.checked },
                            })
                          }
                        />
                        Habilitar acceso total
                      </label>
                    </div>

                    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 md:col-span-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Configuracion</p>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={permissions.modules.configuracion}
                          disabled={isAdmin}
                          onChange={(e) =>
                            updatePermissions({
                              ...permissions,
                              modules: { ...permissions.modules, configuracion: e.target.checked },
                            })
                          }
                        />
                        Mostrar modulo
                      </label>

                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { key: 'notifications', label: 'Notificaciones' },
                          { key: 'interfaz', label: 'Interfaz' },
                          { key: 'inventory', label: 'Inventario' },
                          { key: 'printing', label: 'Impresion' },
                        ].map((section) => (
                          <label
                            key={section.key}
                            className={`inline-flex items-center gap-2 text-sm ${
                              !permissions.modules.configuracion ? 'opacity-50' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={permissions.configSections[section.key as keyof UserPermissions['configSections']]}
                              disabled={isAdmin || !permissions.modules.configuracion}
                              onChange={(e) =>
                                updatePermissions({
                                  ...permissions,
                                  configSections: {
                                    ...permissions.configSections,
                                    [section.key]: e.target.checked,
                                  },
                                })
                              }
                            />
                            {section.label}
                          </label>
                        ))}
                      </div>
                      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                        La seccion Datos (backups, importar y limpiar sistema) solo esta disponible para Administrador.
                      </p>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        )}

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              void handleSave()
            }}
            disabled={saving || !permissions}
            className="px-4 py-2 rounded-lg bg-lime-600 hover:bg-lime-700 text-white transition disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar permisos'}
          </button>
        </div>
      </div>
    </div>
  )
}
