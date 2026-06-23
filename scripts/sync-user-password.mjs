/**
 * Actualiza contraseña en RTDB y Firebase Auth (solo cliente Firebase).
 * Uso: node scripts/sync-user-password.mjs Caja1 "Caja2026"
 */

import { webcrypto } from 'node:crypto'
import { initializeApp as initClientApp, getApps as getClientApps } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { getDatabase, ref, update, get } from 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIzaSyCYwUKZkiNYH4gtwLG-VIRqf1P1NXH90NY',
  authDomain: 'shopbikinistore.firebaseapp.com',
  databaseURL: 'https://shopbikinistore-default-rtdb.firebaseio.com',
  projectId: 'shopbikinistore',
  storageBucket: 'shopbikinistore.firebasestorage.app',
  messagingSenderId: '1025416534253',
  appId: '1:1025416534253:web:744ca97ce62085a3f414e4',
}

const ADMIN_EMAIL = 'admin@bikinistore.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'BKStore2026$'
const SECONDARY_APP = 'BkStorePasswordSync'
const DEFAULT_ITERATIONS = 100000

const userId = process.argv[2]?.trim()
const newPassword = process.argv[3]

if (!userId || !newPassword) {
  console.error('Uso: node scripts/sync-user-password.mjs <userId> "<contraseña>"')
  process.exit(1)
}

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
    ['deriveBits'],
  )
  const salt = webcrypto.getRandomValues(new Uint8Array(16))
  const saltBuffer = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength)
  const derivedBits = await webcrypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBuffer, iterations: DEFAULT_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  return {
    hash: toHex(derivedBits),
    salt: toHex(salt),
    iterations: DEFAULT_ITERATIONS,
    algorithm: 'PBKDF2-SHA-256',
  }
}

function getSecondaryAuth() {
  const existing = getClientApps().find((a) => a.name === SECONDARY_APP)
  const app = existing ?? initClientApp(firebaseConfig, SECONDARY_APP)
  return getAuth(app)
}

async function syncAuthWithClientSdk(email, password) {
  const secondary = getSecondaryAuth()
  try {
    await createUserWithEmailAndPassword(secondary, email, password)
    console.log(`Firebase Auth: cuenta creada para ${email}`)
    return
  } catch (error) {
    const code = error?.code || ''
    if (code !== 'auth/email-already-in-use') throw error
  }

  try {
    await signInWithEmailAndPassword(secondary, email, password)
    console.log(`Firebase Auth: contraseña ya correcta para ${email}`)
  } catch {
    throw new Error(
      `Firebase Auth aún tiene otra contraseña para ${email}. ` +
      'Elimine ese usuario en Firebase Console > Authentication > Usuarios y vuelva a ejecutar este script.',
    )
  } finally {
    await signOut(secondary).catch(() => {})
  }
}

async function main() {
  const passwordFields = await hashPassword(newPassword)
  const app = initClientApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getDatabase(app)

  console.log('Iniciando sesión como admin...')
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD)

  const userSnap = await get(ref(db, `users/${userId}`))
  if (!userSnap.exists()) throw new Error(`Usuario ${userId} no encontrado`)
  const email = String(userSnap.val().email || '').trim().toLowerCase()
  if (!email) throw new Error('El usuario no tiene correo')

  const now = new Date().toISOString().split('T')[0]
  await update(ref(db, `users/${userId}`), {
    passwordHash: passwordFields.hash,
    passwordSalt: passwordFields.salt,
    passwordAlgo: passwordFields.algorithm,
    passwordIterations: passwordFields.iterations,
    fechaActualizacion: now,
  })
  console.log(`RTDB actualizado para ${userId}`)

  await syncAuthWithClientSdk(email, newPassword)
  console.log(`Listo. Entrar con ${email} y contraseña: ${newPassword}`)
}

main().catch((error) => {
  console.error('Error:', error?.message || error)
  process.exit(1)
})
