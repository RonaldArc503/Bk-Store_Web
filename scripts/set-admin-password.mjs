/**
 * Actualiza la contraseña del administrador principal en Firebase Auth y RTDB.
 * Uso:
 *   node scripts/set-admin-password.mjs
 *
 * Variables opcionales:
 *   ADMIN_EMAIL, ADMIN_OLD_PASSWORD, ADMIN_NEW_PASSWORD
 */

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, updatePassword } from 'firebase/auth'
import { getDatabase, ref, update, get } from 'firebase/database'
import { webcrypto } from 'node:crypto'

const firebaseConfig = {
  apiKey: 'AIzaSyCYwUKZkiNYH4gtwLG-VIRqf1P1NXH90NY',
  authDomain: 'shopbikinistore.firebaseapp.com',
  databaseURL: 'https://shopbikinistore-default-rtdb.firebaseio.com',
  projectId: 'shopbikinistore',
  storageBucket: 'shopbikinistore.firebasestorage.app',
  messagingSenderId: '1025416534253',
  appId: '1:1025416534253:web:744ca97ce62085a3f414e4',
}

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@bikinistore.com').trim().toLowerCase()
const ADMIN_OLD_PASSWORD = process.env.ADMIN_OLD_PASSWORD || 'BkStore2026!Segura9'
const ADMIN_NEW_PASSWORD = process.env.ADMIN_NEW_PASSWORD || 'BKStore2026$'
const ADMIN_USER_ID = 'admin'

const DEFAULT_ITERATIONS = 100000

const toHex = (input) =>
  Array.from(new Uint8Array(input))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

async function hashPassword(password) {
  const encoder = new TextEncoder()
  const keyMaterial = await webcrypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )
  const salt = webcrypto.getRandomValues(new Uint8Array(16))
  const derivedBits = await webcrypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: DEFAULT_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  )
  return {
    hash: toHex(derivedBits),
    salt: toHex(salt),
    iterations: DEFAULT_ITERATIONS,
    algorithm: 'PBKDF2-SHA-256',
  }
}

async function main() {
  if (ADMIN_NEW_PASSWORD.length < 12) {
    throw new Error('La nueva contraseña debe tener al menos 12 caracteres')
  }

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getDatabase(app)

  console.log(`Iniciando sesión como ${ADMIN_EMAIL}...`)
  const credential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_OLD_PASSWORD)

  console.log('Actualizando contraseña en Firebase Auth...')
  await updatePassword(credential.user, ADMIN_NEW_PASSWORD)

  console.log('Actualizando hash en Realtime Database...')
  const password = await hashPassword(ADMIN_NEW_PASSWORD)
  const userRef = ref(db, `users/${ADMIN_USER_ID}`)
  const snapshot = await get(userRef)
  if (!snapshot.exists()) {
    throw new Error(`No existe users/${ADMIN_USER_ID} en la base de datos`)
  }

  await update(userRef, {
    passwordHash: password.hash,
    passwordSalt: password.salt,
    passwordAlgo: password.algorithm,
    passwordIterations: password.iterations,
    fechaActualizacion: new Date().toLocaleDateString('es-SV'),
  })

  console.log('Listo. Contraseña del administrador actualizada.')
}

main().catch((error) => {
  console.error('Error:', error?.message || error)
  process.exit(1)
})
