/**
 * Sincroniza contraseña en RTDB y Firebase Authentication (requiere cuenta de servicio).
 *
 * Uso:
 *   set GOOGLE_APPLICATION_CREDENTIALS=ruta\a\service-account.json
 *   node scripts/admin-set-user-password.mjs Caja1 "MiClaveNueva123"
 *
 * O con JSON en variable:
 *   set FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
 */

import { readFileSync, existsSync } from 'node:fs'
import { webcrypto } from 'node:crypto'
import admin from 'firebase-admin'

const PROJECT_ID = 'shopbikinistore'
const DATABASE_URL = 'https://shopbikinistore-default-rtdb.firebaseio.com'
const DEFAULT_ITERATIONS = 100000

const userId = process.argv[2]?.trim()
const newPassword = process.argv[3]

if (!userId || !newPassword) {
  console.error('Uso: node scripts/admin-set-user-password.mjs <userId> "<nuevaContraseña>"')
  process.exit(1)
}

if (newPassword.length < 6) {
  console.error('La contraseña debe tener al menos 6 caracteres')
  process.exit(1)
}

function loadServiceAccount() {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (inline) return JSON.parse(inline)

  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (path && existsSync(path)) {
    return JSON.parse(readFileSync(path, 'utf8'))
  }

  throw new Error(
    'Falta cuenta de servicio. Descárgala en Firebase Console > Configuración del proyecto > Cuentas de servicio > Generar nueva clave privada.',
  )
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

function initAdmin() {
  if (admin.apps.length) return
  const serviceAccount = loadServiceAccount()
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: PROJECT_ID,
    databaseURL: DATABASE_URL,
  })
}

async function findAuthUidsForUserId(db, targetUserId) {
  const snapshot = await db.ref('userAuthIndex').get()
  if (!snapshot.exists()) return []
  const uids = []
  snapshot.forEach((child) => {
    if (child.val()?.userId === targetUserId) uids.push(child.key)
  })
  return uids
}

async function main() {
  initAdmin()
  const db = admin.database()
  const auth = admin.auth()

  const userSnap = await db.ref(`users/${userId}`).get()
  if (!userSnap.exists()) {
    throw new Error(`Usuario "${userId}" no encontrado en RTDB`)
  }

  const user = userSnap.val()
  const email = String(user.email || '').trim().toLowerCase()
  if (!email) {
    throw new Error('El usuario no tiene correo electrónico')
  }

  const password = await hashPassword(newPassword)
  const now = new Date().toISOString().split('T')[0]

  await db.ref(`users/${userId}`).update({
    passwordHash: password.hash,
    passwordSalt: password.salt,
    passwordAlgo: password.algorithm,
    passwordIterations: password.iterations,
    fechaActualizacion: now,
  })
  console.log(`RTDB actualizado para ${userId}`)

  const authUids = await findAuthUidsForUserId(db, userId)
  if (authUids.length > 0) {
    await Promise.all(authUids.map((uid) => auth.updateUser(uid, { password: newPassword })))
    console.log(`Firebase Auth actualizado (${authUids.length} cuenta(s))`)
    return
  }

  try {
    const existing = await auth.getUserByEmail(email)
    await auth.updateUser(existing.uid, { password: newPassword })
    console.log(`Firebase Auth actualizado por correo (${email})`)
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error
    await auth.createUser({ email, password: newPassword, emailVerified: false })
    console.log(`Cuenta Auth creada para ${email}`)
  }

  console.log('Listo. Prueba iniciar sesión con el correo y la contraseña nueva.')
}

main().catch((error) => {
  console.error('Error:', error?.message || error)
  process.exit(1)
})
