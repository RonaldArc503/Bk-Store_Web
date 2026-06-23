import { getApps, initializeApp } from 'firebase/app'
import { createUserWithEmailAndPassword, signOut, getAuth, signInWithEmailAndPassword } from 'firebase/auth'
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

export type FirebaseAuthPasswordSyncResult = 'created' | 'already-synced' | 'auth-exists'

/**
 * Crea la cuenta Auth con la contraseña nueva o verifica que ya coincida.
 * Si la cuenta existe con otra contraseña, hay que borrarla en Firebase Console.
 */
export async function syncFirebaseAuthPassword(
  email: string,
  password: string,
): Promise<FirebaseAuthPasswordSyncResult> {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail || !password) return 'auth-exists'

  const secondaryAuth = getSecondaryAuth()
  try {
    await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, password)
    return 'created'
  } catch (error) {
    const code = getAuthErrorCode(error)
    if (code === 'auth/email-already-in-use') {
      try {
        await signInWithEmailAndPassword(secondaryAuth, normalizedEmail, password)
        return 'already-synced'
      } catch {
        return 'auth-exists'
      }
    }
    throw error
  } finally {
    await signOut(secondaryAuth).catch(() => {})
  }
}
