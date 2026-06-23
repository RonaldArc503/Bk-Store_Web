/**
 * Actualiza contraseña en Firebase Auth usando credenciales del Firebase CLI.
 * Uso: node scripts/update-auth-password-cli.mjs caja@bikinistore.com "Caja2026"
 */

import { readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const email = (process.argv[2] || '').trim().toLowerCase()
const newPassword = process.argv[3] || ''

if (!email || !newPassword) {
  console.error('Uso: node scripts/update-auth-password-cli.mjs <email> "<contraseña>"')
  process.exit(1)
}

const PROJECT_ID = 'shopbikinistore'

function loadFirebaseCliToken() {
  const paths = [
    join(homedir(), '.config', 'configstore', 'firebase-tools.json'),
    join(process.env.APPDATA || '', 'configstore', 'firebase-tools.json'),
  ]
  for (const path of paths) {
    if (!existsSync(path)) continue
    const data = JSON.parse(readFileSync(path, 'utf8'))
    const token = data?.tokens?.access_token
    if (token) return token
  }
  throw new Error('No hay sesión de Firebase CLI. Ejecute: npx firebase-tools login')
}

async function lookupLocalId(accessToken) {
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:query`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: [email] }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error?.message || `Lookup falló (${res.status})`)
  }
  const account = data?.users?.[0]
  if (!account?.localId) {
    throw new Error(`No se encontró cuenta Auth para ${email}`)
  }
  return account.localId
}

async function updatePassword(accessToken, localId) {
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      localId,
      email,
      password: newPassword,
      returnSecureToken: false,
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error?.message || `Update falló (${res.status})`)
  }
  return data
}

async function main() {
  const accessToken = loadFirebaseCliToken()
  console.log(`Buscando cuenta ${email}...`)
  const localId = await lookupLocalId(accessToken)
  console.log(`Actualizando contraseña (uid: ${localId})...`)
  await updatePassword(accessToken, localId)
  console.log(`Listo. Firebase Auth actualizado para ${email}`)
}

main().catch((error) => {
  console.error('Error:', error?.message || error)
  process.exit(1)
})
