/**
 * User Management Page
 * CRUD completo de usuarios del sistema
 */

import { useState, useEffect } from 'react'
import { Users, Plus, Edit2, Power, Trash2, Search } from 'lucide-react'
import { Sidebar } from '../components/Sidebar'
import { UserModal } from '../components/UserModal'
import { UserService } from '../services/UserService'
import type { SystemUser } from '../types/index'

export default function UserManagementPage() {
  const [users, setUsers] = useState<SystemUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<SystemUser[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [stats, setStats] = useState({
    totalUsuarios: 0,
    usuariosActivos: 0,
    usuariosInactivos: 0,
    usersByRole: { administrador: 0, bodeguero: 0, caja: 0, vendedor: 0 },
  })

  // Cargar usuarios
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [usersData, statsData] = await Promise.all([
        UserService.getUsers(),
        UserService.getUserStats(),
      ])
      setUsers(usersData)
      setFilteredUsers(usersData)
      setStats(statsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Buscar usuarios
  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setFilteredUsers(users)
    } else {
      const lowerQuery = query.toLowerCase()
      const results = users.filter(
        (u) =>
          u.usuario.toLowerCase().includes(lowerQuery) ||
          u.nombreCompleto.toLowerCase().includes(lowerQuery) ||
          u.rol.toLowerCase().includes(lowerQuery)
      )
      setFilteredUsers(results)
    }
  }

  // Crear usuario
  const handleCreateUser = (user: SystemUser) => {
    setUsers([...users, user])
    setFilteredUsers([...filteredUsers, user])
    loadData() // Actualizar stats
  }

  // Actualizar usuario
  const handleUpdateUser = (updatedUser: SystemUser) => {
    setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUser : u)))
    setFilteredUsers(
      filteredUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u))
    )
    setEditingUser(null)
    loadData() // Actualizar stats
  }

  // Cambiar estado
  const handleToggleStatus = async (id: string) => {
    try {
      const updatedUser = await UserService.toggleUserStatus(id)
      handleUpdateUser(updatedUser)
    } catch (error) {
      console.error('Error toggling status:', error)
    }
  }

  // Eliminar usuario
  const handleDeleteUser = async (id: string) => {
    setDeleteLoading(true)
    try {
      await UserService.deleteUser(id)
      setUsers(users.filter((u) => u.id !== id))
      setFilteredUsers(filteredUsers.filter((u) => u.id !== id))
      setDeleteConfirm(null)
      loadData() // Actualizar stats
    } catch (error) {
      console.error('Error deleting user:', error)
    } finally {
      setDeleteLoading(false)
    }
  }

  // Abrir modal para editar
  const handleEditClick = (user: SystemUser) => {
    setEditingUser(user)
    setIsModalOpen(true)
  }

  // Cerrar modal
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingUser(null)
  }

  // Manejar éxito del modal
  const handleModalSuccess = (user: SystemUser) => {
    if (editingUser) {
      handleUpdateUser(user)
    } else {
      handleCreateUser(user)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col md:flex-row">
      <Sidebar activeItem="usuarios" />

      <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 overflow-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Usuarios</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Administre los usuarios del sistema y sus permisos</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Usuarios */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950/40 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total de Usuarios</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsuarios}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">En el sistema</p>
          </div>

          {/* Activos */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-950/40 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Usuarios Activos</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.usuariosActivos}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Disponibles</p>
          </div>

          {/* Inactivos */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-950/40 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Usuarios Inactivos</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.usuariosInactivos}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Deshabilitados</p>
          </div>

          {/* Administradores */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-950/40 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Administradores</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.usersByRole.administrador}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Con permisos</p>
          </div>
        </div>

        {/* Search and Create */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar usuario..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
            />
          </div>
          <button
            onClick={() => {
              setEditingUser(null)
              setIsModalOpen(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            Crear Usuario
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Usuarios Registrados
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Total de {stats.totalUsuarios} usuario(s) en el sistema
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Cargando usuarios...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                      Nombre Completo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                      Fecha de Creación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{user.usuario}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                        {user.nombreCompleto}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
                          {user.rol}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400 text-sm">
                        {user.fechaCreacion}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            user.estado === 'Activo'
                              ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300'
                              : 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300'
                          }`}
                        >
                          {user.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditClick(user)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {user.usuario !== 'admin' && (
                            <>
                              <button
                                onClick={() => handleToggleStatus(user.id)}
                                className={`p-2 rounded-lg transition ${
                                  user.estado === 'Activo'
                                    ? 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40'
                                    : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/40'
                                }`}
                                title={user.estado === 'Activo' ? 'Desactivar' : 'Activar'}
                              >
                                <Power className="w-4 h-4" />
                              </button>
                              {deleteConfirm === user.id ? (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    disabled={deleteLoading}
                                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded disabled:opacity-50"
                                  >
                                    {deleteLoading ? 'Eliminando...' : 'Sí'}
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(user.id)}
                                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal */}
        <UserModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSuccess={handleModalSuccess}
          editingUser={editingUser}
        />
      </main>
    </div>
  )
}
