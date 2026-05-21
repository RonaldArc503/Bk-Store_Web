import { getApps, initializeApp } from 'firebase/app'
import { createUserWithEmailAndPassword, signOut, getAuth } from 'firebase/auth'
import { firebaseConfig } from '../app/firebase'

const SECONDARY_APP_NAME = 'BkStoreSecondaryAuth'

function getSecondaryAuth() {
  const existing = getApps().find((app) => app.name === SECONDARY_APP_NAME)
  const secondaryApp = existing ?? initializeApp(firebaseConfig, SECONDARY_APP_NAME)
  return getAuth(secondaryApp)
}

function getAuthErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code?: string }).code ?? '')
  }
  return ''
}

/**
 * Crea la cuenta en Firebase Auth sin cerrar la sesión del administrador actual.
 */
export async function ensureFirebaseAuthAccount(email: string, password: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail || !password) return

  const secondaryAuth = getSecondaryAuth()
  try {
    await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, password)
  } catch (error) {
    const code = getAuthErrorCode(error)
    if (code === 'auth/email-already-in-use') return
    throw error
  } finally {
    await signOut(secondaryAuth).catch(() => {})
  }
}
