/**
 * User Service
 * Gestión de usuarios del sistema con Firebase Realtime Database
 */

import {
  ref,
  set,
  get,
  remove,
  onValue,
} from "firebase/database"
import { database } from "../app/firebase"
import type { SystemUser, CreateUserInput, UpdateUserInput } from '../types/index'

const USERS_PATH = 'users'

export const UserService = {
  /**
   * Obtener todos los usuarios desde Firebase
   */
  async getUsers(): Promise<SystemUser[]> {
    try {
      const usersRef = ref(database, USERS_PATH)
      const snapshot = await get(usersRef)

      if (!snapshot.exists()) {
        return []
      }

      const data = snapshot.val()
      return Object.values(data) as SystemUser[]
    } catch (error) {
      console.error('Error fetching users:', error)
      throw new Error('Error al obtener usuarios')
    }
  },

  /**
   * Obtener usuario por ID
   */
  async getUserById(id: string): Promise<SystemUser | null> {
    try {
      const userRef = ref(database, `${USERS_PATH}/${id}`)
      const snapshot = await get(userRef)

      if (!snapshot.exists()) {
        return null
      }

      return snapshot.val() as SystemUser
    } catch (error) {
      console.error('Error fetching user:', error)
      throw new Error('Error al obtener usuario')
    }
  },

  /**
   * Obtener usuario por nombre de usuario
   */
  async getUserByUsername(usuario: string): Promise<SystemUser | null> {
    try {
      const users = await this.getUsers()
      return users.find(u => u.usuario === usuario) || null
    } catch (error) {
      console.error('Error fetching user by username:', error)
      throw new Error('Error al obtener usuario')
    }
  },

  /**
   * Crear nuevo usuario
   */
  async createUser(input: CreateUserInput): Promise<SystemUser> {
    try {
      // Verificar que el usuario no exista
      const existingUser = await this.getUserByUsername(input.usuario)
      if (existingUser) {
        throw new Error('El nombre de usuario ya existe')
      }

      const id = input.usuario // Usar el nombre de usuario como ID
      const now = new Date().toISOString().split('T')[0]

      const newUser: SystemUser = {
        id,
        usuario: input.usuario,
        nombreCompleto: input.nombreCompleto,
        rol: input.rol,
        email: input.email || '',
        estado: 'Activo',
        fechaCreacion: now,
        fechaActualizacion: now,
      }

      const userRef = ref(database, `${USERS_PATH}/${id}`)
      // En una aplicación real, deberías hash la contraseña
      // Por ahora, la guardamos directamente (NO RECOMENDADO EN PRODUCCIÓN)
      await set(userRef, {
        ...newUser,
        contraseña: input.contraseña, // IMPORTANTE: Hash esta en producción
      })

      return newUser
    } catch (error) {
      console.error('Error creating user:', error)
      throw error instanceof Error ? error : new Error('Error al crear usuario')
    }
  },

  /**
   * Actualizar usuario
   */
  async updateUser(input: UpdateUserInput): Promise<SystemUser> {
    try {
      const userRef = ref(database, `${USERS_PATH}/${input.id}`)
      const snapshot = await get(userRef)

      if (!snapshot.exists()) {
        throw new Error('Usuario no encontrado')
      }

      const currentUser = snapshot.val() as SystemUser
      const now = new Date().toISOString().split('T')[0]

      const updatedUser: SystemUser = {
        ...currentUser,
        nombreCompleto: input.nombreCompleto ?? currentUser.nombreCompleto,
        rol: input.rol ?? currentUser.rol,
        estado: input.estado ?? currentUser.estado,
        email: input.email ?? currentUser.email,
        fechaActualizacion: now,
      }

      await set(userRef, updatedUser)
      return updatedUser
    } catch (error) {
      console.error('Error updating user:', error)
      throw error instanceof Error ? error : new Error('Error al actualizar usuario')
    }
  },

  /**
   * Cambiar estado de usuario
   */
  async toggleUserStatus(id: string): Promise<SystemUser> {
    try {
      const userRef = ref(database, `${USERS_PATH}/${id}`)
      const snapshot = await get(userRef)

      if (!snapshot.exists()) {
        throw new Error('Usuario no encontrado')
      }

      const currentUser = snapshot.val() as SystemUser
      const newStatus = currentUser.estado === 'Activo' ? 'Inactivo' : 'Activo'

      const updatedUser: SystemUser = {
        ...currentUser,
        estado: newStatus,
        fechaActualizacion: new Date().toISOString().split('T')[0],
      }

      await set(userRef, updatedUser)
      return updatedUser
    } catch (error) {
      console.error('Error toggling user status:', error)
      throw error instanceof Error ? error : new Error('Error al cambiar estado del usuario')
    }
  },

  /**
   * Eliminar usuario
   */
  async deleteUser(id: string): Promise<void> {
    try {
      const userRef = ref(database, `${USERS_PATH}/${id}`)
      await remove(userRef)
    } catch (error) {
      console.error('Error deleting user:', error)
      throw new Error('Error al eliminar usuario')
    }
  },

  /**
   * Obtener estadísticas de usuarios
   */
  async getUserStats() {
    try {
      const users = await this.getUsers()
      const activeUsers = users.filter(u => u.estado === 'Activo').length
      const inactiveUsers = users.filter(u => u.estado === 'Inactivo').length

      return {
        totalUsuarios: users.length,
        usuariosActivos: activeUsers,
        usuariosInactivos: inactiveUsers,
        usersByRole: this.groupUsersByRole(users),
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      throw new Error('Error al obtener estadísticas')
    }
  },

  /**
   * Agrupar usuarios por rol
   */
  groupUsersByRole(users: SystemUser[]) {
    return {
      administrador: users.filter(u => u.rol === 'Administrador').length,
      bodeguero: users.filter(u => u.rol === 'Bodeguero').length,
      caja: users.filter(u => u.rol === 'Caja').length,
      vendedor: users.filter(u => u.rol === 'Vendedor').length,
    }
  },

  /**
   * Suscribirse a cambios en tiempo real (opcional)
   */
  onUsersChange(callback: (users: SystemUser[]) => void): () => void {
    const usersRef = ref(database, USERS_PATH)

    const unsubscribe = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        const users = Object.values(data) as SystemUser[]
        callback(users)
      } else {
        callback([])
      }
    })

    return unsubscribe
  },
}
