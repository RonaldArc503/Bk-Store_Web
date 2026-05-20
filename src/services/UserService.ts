/**
 * User Service
 * Gestión de usuarios del sistema con Firebase Realtime Database
 */

import {
  ref,
  set,
  update,
  get,
  remove,
  onValue,
} from "firebase/database"
import { database } from "../app/firebase"
import type { SystemUser, CreateUserInput, UpdateUserInput } from '../types/index'
import { hashPassword, verifyPassword } from '../utils/password'
import {
  getDefaultPermissionsByRole,
  getFullPermissions,
  normalizePermissions,
  type UserPermissions,
} from '../auth/permissions'

const USERS_PATH = 'users'
const AUTH_INDEX_PATH = 'userAuthIndex'

async function writeUserAuthIndex(uid: string, user: SystemUser, permissions?: UserPermissions): Promise<void> {
  const normalized = normalizePermissions(permissions ?? user.permissions, user.rol)
  await set(ref(database, `${AUTH_INDEX_PATH}/${uid}`), {
    userId: user.id,
    role: user.rol,
    estado: user.estado,
    permissions: normalized,
  })
}

async function syncAuthIndexEntriesForUser(user: SystemUser, permissions?: UserPermissions): Promise<void> {
  const authIndexSnapshot = await get(ref(database, AUTH_INDEX_PATH))
  if (!authIndexSnapshot.exists()) return

  const index = authIndexSnapshot.val() as Record<string, { userId?: string }>
  const matchingUids = Object.entries(index)
    .filter(([, value]) => value?.userId === user.id)
    .map(([uid]) => uid)

  await Promise.all(matchingUids.map((uid) => writeUserAuthIndex(uid, user, permissions)))
}

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
   * Obtener usuario por email
   */
  async getUserByEmail(email: string): Promise<SystemUser | null> {
    try {
      const users = await this.getUsers()
      const normalized = email.trim().toLowerCase()
      return users.find(u => (u.email || '').trim().toLowerCase() === normalized) || null
    } catch (error) {
      console.error('Error fetching user by email:', error)
      throw new Error('Error al obtener usuario')
    }
  },

  /**
   * Resolver usuario del sistema a partir de Firebase Auth.
   * Mantiene índice userAuthIndex/<uid> para validaciones y reglas.
   */
  async resolveUserByAuth(uid: string, email: string | null): Promise<SystemUser | null> {
    try {
      const indexSnapshot = await get(ref(database, `${AUTH_INDEX_PATH}/${uid}`))
      if (indexSnapshot.exists()) {
        const indexVal = indexSnapshot.val() as { userId?: string }
        if (indexVal?.userId) {
          const indexedUser = await this.getUserById(indexVal.userId)
          if (indexedUser) {
            const permissions = normalizePermissions(indexedUser.permissions, indexedUser.rol)
            await writeUserAuthIndex(uid, indexedUser, permissions)
            return { ...indexedUser, permissions }
          }
        }
      }

      if (email) {
        const byEmail = await this.getUserByEmail(email)
        if (byEmail) {
          const permissions = normalizePermissions(byEmail.permissions, byEmail.rol)
          await update(ref(database, `${USERS_PATH}/${byEmail.id}`), { permissions })
          await writeUserAuthIndex(uid, byEmail, permissions)
          return { ...byEmail, permissions }
        }
      }

      const byUid = await this.getUserById(uid)
      if (byUid) {
        const permissions = normalizePermissions(byUid.permissions, byUid.rol)
        await update(ref(database, `${USERS_PATH}/${byUid.id}`), { permissions })
        await writeUserAuthIndex(uid, byUid, permissions)
        return { ...byUid, permissions }
      }

      return null
    } catch (error) {
      console.error('Error resolving auth user:', error)
      return null
    }
  },

  /**
   * Verificar credenciales contra RTDB (hash + salt)
   */
  async verifyUserCredentials(email: string, password: string): Promise<SystemUser | null> {
    try {
      const user = await this.getUserByEmail(email)
      if (!user) return null

      const userRef = ref(database, `${USERS_PATH}/${user.id}`)
      const snapshot = await get(userRef)
      if (!snapshot.exists()) return null

      const data = snapshot.val() as Record<string, any>
      const hash = data?.passwordHash
      const salt = data?.passwordSalt
      const iterations = Number(data?.passwordIterations || 0)
      if (!hash || !salt || !iterations) return null

      const ok = await verifyPassword(password, hash, salt, iterations)
      return ok ? user : null
    } catch (error) {
      console.error('Error verifying user credentials:', error)
      return null
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
        permissions: input.rol === 'Administrador'
          ? getFullPermissions()
          : getDefaultPermissionsByRole(input.rol),
        email: input.email || '',
        estado: 'Activo',
        fechaCreacion: now,
        fechaActualizacion: now,
      }

      const userRef = ref(database, `${USERS_PATH}/${id}`)
      const password = await hashPassword(input.contraseña)
      await set(userRef, {
        ...newUser,
        passwordHash: password.hash,
        passwordSalt: password.salt,
        passwordAlgo: password.algorithm,
        passwordIterations: password.iterations,
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
      const nextRole = input.rol ?? currentUser.rol
      const currentPermissions = normalizePermissions(currentUser.permissions, currentUser.rol)
      const nextPermissions = nextRole === 'Administrador'
        ? getFullPermissions()
        : (input.rol ? normalizePermissions(currentPermissions, nextRole) : currentPermissions)

      const updatedUser: SystemUser = {
        ...currentUser,
        nombreCompleto: input.nombreCompleto ?? currentUser.nombreCompleto,
        rol: nextRole,
        estado: input.estado ?? currentUser.estado,
        email: input.email ?? currentUser.email,
        permissions: nextPermissions,
        fechaActualizacion: now,
      }

      await update(userRef, {
        nombreCompleto: updatedUser.nombreCompleto,
        rol: updatedUser.rol,
        estado: updatedUser.estado,
        email: updatedUser.email,
        permissions: updatedUser.permissions,
        fechaActualizacion: updatedUser.fechaActualizacion,
      })
      await syncAuthIndexEntriesForUser(updatedUser, nextPermissions)
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
      const permissions = normalizePermissions(currentUser.permissions, currentUser.rol)

      const updatedUser: SystemUser = {
        ...currentUser,
        estado: newStatus,
        permissions,
        fechaActualizacion: new Date().toISOString().split('T')[0],
      }

      await update(userRef, {
        estado: updatedUser.estado,
        permissions: updatedUser.permissions,
        fechaActualizacion: updatedUser.fechaActualizacion,
      })
      await syncAuthIndexEntriesForUser(updatedUser, permissions)
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
      const snapshot = await get(userRef)
      if (!snapshot.exists()) {
        throw new Error('Usuario no encontrado')
      }

      try {
        const usersByAuthSnapshot = await get(ref(database, AUTH_INDEX_PATH))
        if (usersByAuthSnapshot.exists()) {
          const authIndex = usersByAuthSnapshot.val() as Record<string, { userId?: string }>
          const matchedUids = Object.entries(authIndex)
            .filter(([, value]) => value?.userId === id)
            .map(([uid]) => uid)
          await Promise.all(
            matchedUids.map((uid) => remove(ref(database, `${AUTH_INDEX_PATH}/${uid}`))),
          )
        }
      } catch (indexError) {
        console.warn('No se pudo limpiar userAuthIndex:', indexError)
      }

      await remove(userRef)
    } catch (error) {
      console.error('Error deleting user:', error)
      throw error instanceof Error ? error : new Error('Error al eliminar usuario')
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

  async getUserPermissions(userId: string, role?: SystemUser['rol']): Promise<UserPermissions> {
    const snapshot = await get(ref(database, `${USERS_PATH}/${userId}/permissions`))
    const raw = snapshot.exists() ? snapshot.val() : undefined
    return normalizePermissions(raw, role)
  },

  async updateUserPermissions(userId: string, permissions: UserPermissions): Promise<UserPermissions> {
    const user = await this.getUserById(userId)
    if (!user) {
      throw new Error('Usuario no encontrado')
    }

    const normalized = user.rol === 'Administrador'
      ? getFullPermissions()
      : normalizePermissions(permissions, user.rol)

    await update(ref(database, `${USERS_PATH}/${userId}`), {
      permissions: normalized,
      fechaActualizacion: new Date().toISOString().split('T')[0],
    })

    await syncAuthIndexEntriesForUser(user, normalized)

    return normalized
  },

  onUserPermissionsChange(
    userId: string,
    role: SystemUser['rol'],
    callback: (permissions: UserPermissions, user: SystemUser | null) => void,
  ): () => void {
    const userRef = ref(database, `${USERS_PATH}/${userId}`)
    const unsubscribe = onValue(userRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback(normalizePermissions(undefined, role), null)
        return
      }

      const user = snapshot.val() as SystemUser
      callback(normalizePermissions(user.permissions, user.rol || role), user)
    })

    return unsubscribe
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
