/**
 * Repara usuario Caja1: contraseña Caja2026 + vínculo Firebase Auth.
 * Uso: node scripts/fix-caja-user.mjs
 */

import { readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { webcrypto } from 'node:crypto'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getDatabase, ref, get, update, set } from 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIzaSyCYwUKZkiNYH4gtwLG-VIRqf1P1NXH90NY',
  authDomain: 'shopbikinistore.firebaseapp.com',
  databaseURL: 'https://shopbikinistore-default-rtdb.firebaseio.com',
  projectId: 'shopbikinistore',
  storageBucket: 'shopbikinistore.firebasestorage.app',
  messagingSenderId: '1025416534253',
  appId: '1:1025416534253:web:744ca97ce62085a3f414e4',
}

const USER_ID = 'Caja1'
const EMAIL = 'caja@bikinistore.com'
const PASSWORD = 'Caja2026'
const AUTH_UID = '1LKMwdtNFXaD2pNj7IHHaQeaiyx1'
const ADMIN_EMAIL = 'admin@bikinistore.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'BKStore2026$'

const CAJA_PERMISSIONS = {
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
}

async function hashPassword(password) {
  const encoder = new TextEncoder()
  const keyMaterial = await webcrypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  )
  const salt = webcrypto.getRandomValues(new Uint8Array(16))
  const saltBuffer = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength)
  const derivedBits = await webcrypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBuffer, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  const toHex = (input) =>
    Array.from(new Uint8Array(input))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  return {
    hash: toHex(derivedBits),
    salt: toHex(salt),
    iterations: 100000,
    algorithm: 'PBKDF2-SHA-256',
  }
}

function loadFirebaseCliToken() {
  const paths = [
    join(homedir(), '.config', 'configstore', 'firebase-tools.json'),
    join(process.env.APPDATA || '', 'configstore', 'firebase-tools.json'),
  ]
  for (const path of paths) {
    if (!existsSync(path)) continue
    const token = JSON.parse(readFileSync(path, 'utf8'))?.tokens?.access_token
    if (token) return token
  }
  return null
}

async function updateAuthPassword() {
  const token = loadFirebaseCliToken()
  if (!token) {
    console.warn('Sin Firebase CLI: no se actualizó Auth (ejecute firebase login)')
    return
  }
  const res = await fetch(
    'https://identitytoolkit.googleapis.com/v1/projects/shopbikinistore/accounts:update',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        localId: AUTH_UID,
        email: EMAIL,
        password: PASSWORD,
        returnSecureToken: false,
      }),
    },
  )
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data?.error?.message || `Auth update falló (${res.status})`)
  }
  console.log('Firebase Authentication: contraseña actualizada')
}

async function main() {
  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getDatabase(app)

  console.log('Conectando como admin...')
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD)

  const userSnap = await get(ref(db, `users/${USER_ID}`))
  if (!userSnap.exists()) throw new Error(`Usuario ${USER_ID} no encontrado`)

  const password = await hashPassword(PASSWORD)
  const now = new Date().toISOString().split('T')[0]

  await update(ref(db, `users/${USER_ID}`), {
    estado: 'Activo',
    email: EMAIL,
    passwordHash: password.hash,
    passwordSalt: password.salt,
    passwordAlgo: password.algorithm,
    passwordIterations: password.iterations,
    permissions: CAJA_PERMISSIONS,
    fechaActualizacion: now,
  })
  console.log('RTDB: contraseña y permisos actualizados')

  await set(ref(db, 'usersByEmail/caja@bikinistore,com'), { userId: USER_ID })
  console.log('Índice por correo verificado')

  await set(ref(db, `userAuthIndex/${AUTH_UID}`), {
    userId: USER_ID,
    role: 'Caja',
    estado: 'Activo',
    permissions: CAJA_PERMISSIONS,
  })
  console.log('Vínculo Auth ↔ sistema creado')

  await updateAuthPassword()
  console.log(`Listo. Entrar con ${EMAIL} / ${PASSWORD}`)
}

main().catch((error) => {
  console.error('Error:', error?.message || error)
  process.exit(1)
})
