/**
 * Demo Data Initialization
 * Script para inicializar datos de prueba en Firebase
 * Ideal para desarrollo y testing
 */

import { ref, set, get } from 'firebase/database'
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth, database } from '../app/firebase'
import type { SystemUser } from '../types/index'
import { hashPassword } from './password'
import { getDefaultPermissionsByRole, getFullPermissions } from '../auth/permissions'

const DEMO_PASSWORD = 'demo123456'
/** Solo se usa al crear la base de datos vacía por primera vez */
const ADMIN_SEED_PASSWORD = import.meta.env.VITE_ADMIN_SEED_PASSWORD || 'BKStore2026$'

function getSeedPassword(userId: string): string {
  return userId === 'admin' ? ADMIN_SEED_PASSWORD : DEMO_PASSWORD
}

const DEMO_USERS: SystemUser[] = [
  {
    id: 'admin',
    usuario: 'admin',
    nombreCompleto: 'Administrador Principal',
    rol: 'Administrador',
    permissions: getFullPermissions(),
    estado: 'Activo',
    email: 'admin@bikinistore.com',
    fechaCreacion: '8/4/2026',
    fechaActualizacion: '8/4/2026',
  },
  {
    id: 'bodeguero',
    usuario: 'bodeguero',
    nombreCompleto: 'Encargado de Bodega',
    rol: 'Bodeguero',
    permissions: getDefaultPermissionsByRole('Bodeguero'),
    estado: 'Activo',
    email: 'bodega@bikinistore.com',
    fechaCreacion: '8/4/2026',
    fechaActualizacion: '8/4/2026',
  },
  {
    id: 'caja',
    usuario: 'caja',
    nombreCompleto: 'Usuario de Caja',
    rol: 'Caja',
    permissions: getDefaultPermissionsByRole('Caja'),
    estado: 'Activo',
    email: 'caja@bikinistore.com',
    fechaCreacion: '8/4/2026',
    fechaActualizacion: '8/4/2026',
  },
  {
    id: 'vendedor',
    usuario: 'vendedor',
    nombreCompleto: 'Vendedor',
    rol: 'Vendedor',
    permissions: getDefaultPermissionsByRole('Vendedor'),
    estado: 'Activo',
    email: 'vendedor@bikinistore.com',
    fechaCreacion: '8/4/2026',
    fechaActualizacion: '8/4/2026',
  },
]

/**
 * Inicializar datos de demo
 * Se ejecuta automáticamente solo si no hay usuarios en la base de datos
 */
export async function initializeDemoData() {
  try {
    // Verificar si ya existen usuarios
    const usersRef = ref(database, 'users')
    const snapshot = await get(usersRef)

    if (snapshot.exists()) {
      console.log('Los usuarios ya iniciados, omitiendo inicialización de demo')
      return
    }

    console.log('Inicializando datos de demo...')

    // Crear usuarios de demo
    for (const user of DEMO_USERS) {
      const userRef = ref(database, `users/${user.id}`)
      const password = await hashPassword(getSeedPassword(user.id))
      await set(userRef, {
        ...user,
        passwordHash: password.hash,
        passwordSalt: password.salt,
        passwordAlgo: password.algorithm,
        passwordIterations: password.iterations,
      })
    }

    console.log('✅ Datos de demo inicializados correctamente')
  } catch (error) {
    console.error('Error inicializando datos de demo:', error)
  }
}

/**
 * Crea cuentas en Firebase Auth para los usuarios demo (el login usa Auth, no solo RTDB).
 * No altera la sesión si ya hay un usuario conectado en Firebase.
 */
export async function ensureDemoAuthAccounts() {
  if (auth.currentUser) return

  for (const user of DEMO_USERS) {
    const email = user.email?.trim()
    if (!email) continue
    try {
      await createUserWithEmailAndPassword(auth, email, getSeedPassword(user.id))
    } catch (e: unknown) {
      const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : ''
      if (code === 'auth/email-already-in-use') continue
      console.warn(`ensureDemoAuthAccounts: ${email}`, e)
    }
  }

  try {
    await signOut(auth)
  } catch {
    /* ignore */
  }
}

/**
 * Limpiar datos de demo
 * Elimina todos los usuarios de demostración
 */
export async function clearDemoData() {
  try {
    const usersRef = ref(database, 'users')
    await set(usersRef, null)
    console.log('✅ Datos limpiados')
  } catch (error) {
    console.error('Error limpiando datos:', error)
  }
}
