/**
 * User Modal Component
 * Modal para crear y editar usuarios
 */

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { SystemUser, CreateUserInput, UserRole } from '../types/index'
import { UserService } from '../services/UserService'

interface UserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (user: SystemUser) => void
  editingUser?: SystemUser | null
}

const userRoles: UserRole[] = ['Administrador', 'Bodeguero', 'Caja', 'Vendedor']

export function UserModal({ isOpen, onClose, onSuccess, editingUser }: UserModalProps) {
  const [formData, setFormData] = useState<CreateUserInput>({
    usuario: '',
    nombreCompleto: '',
    contraseña: '',
    rol: 'Caja',
    email: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editingUser) {
      setFormData({
        usuario: editingUser.usuario,
        nombreCompleto: editingUser.nombreCompleto,
        contraseña: '', // No mostrar contraseña en edición
        rol: editingUser.rol,
        email: editingUser.email || '',
      })
    } else {
      setFormData({
        usuario: '',
        nombreCompleto: '',
        contraseña: '',
        rol: 'Caja',
        email: '',
      })
    }
    setError('')
  }, [editingUser, isOpen])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const validateForm = (): boolean => {
    if (!formData.usuario.trim()) {
      setError('El nombre de usuario es requerido')
      return false
    }
    if (!formData.nombreCompleto.trim()) {
      setError('El nombre completo es requerido')
      return false
    }
    if (!editingUser && !formData.contraseña) {
      setError('La contraseña es requerida para nuevos usuarios')
      return false
    }
    if (formData.contraseña && formData.contraseña.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) return

    setLoading(true)
    try {
      let user: SystemUser

      if (editingUser) {
        user = await UserService.updateUser({
          id: editingUser.id,
          nombreCompleto: formData.nombreCompleto,
          rol: formData.rol,
          email: formData.email || undefined,
        })
      } else {
        user = await UserService.createUser(formData)
      }

      onSuccess(user)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el usuario')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Usuario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de usuario
            </label>
            <input
              type="text"
              name="usuario"
              value={formData.usuario}
              onChange={handleInputChange}
              disabled={!!editingUser}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              placeholder="usuario"
            />
          </div>

          {/* Nombre Completo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre completo del usuario
            </label>
            <input
              type="text"
              name="nombreCompleto"
              value={formData.nombreCompleto}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre Completo"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico (opcional)
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="correo@ejemplo.com"
            />
          </div>

          {/* Rol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol
            </label>
            <select
              name="rol"
              value={formData.rol}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {userRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {/* Contraseña */}
          {!editingUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                name="contraseña"
                value={formData.contraseña}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
          )}

          {editingUser && (
            <p className="text-xs text-gray-500">
              Para cambiar la contraseña, utiliza la función de "Cambiar contraseña"
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Guardando...' : editingUser ? 'Actualizar' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
