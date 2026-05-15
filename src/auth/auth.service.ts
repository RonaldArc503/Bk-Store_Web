/**
 * Auth Service
 * Maneja autenticacion con Firebase
 */

import type { User as FirebaseUser } from "firebase/auth";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, googleProvider } from "../app/firebase";
import { UserService } from "../services/UserService";

export interface AuthResponse {
  user: FirebaseUser;
  token: string;
}

function getAuthErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code?: string }).code ?? '')
  }
  return ''
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Login con email y contrasena
 */
export const loginEmail = async (email: string, password: string): Promise<AuthResponse> => {
  const normalizedEmail = normalizeEmail(email)

  try {
    const res = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    const token = await res.user.getIdToken();
    return { user: res.user, token };
  } catch (err: unknown) {
    const code = getAuthErrorCode(err)
    const canBootstrapAuthUser =
      code === 'auth/user-not-found' ||
      code === 'auth/invalid-credential' ||
      code === 'auth/invalid-login-credentials'

    if (canBootstrapAuthUser) {
      const verified = await UserService.verifyUserCredentials(normalizedEmail, password)
      if (!verified) {
        throw new Error('Credenciales invalidas')
      }

      try {
        const res = await createUserWithEmailAndPassword(auth, normalizedEmail, password)
        const token = await res.user.getIdToken()
        return { user: res.user, token }
      } catch (createErr: unknown) {
        const createErrCode = getAuthErrorCode(createErr)
        if (createErrCode !== 'auth/email-already-in-use') {
          throw createErr
        }

        const signInRes = await signInWithEmailAndPassword(auth, normalizedEmail, password)
        const signInToken = await signInRes.user.getIdToken()
        return { user: signInRes.user, token: signInToken }
      }
    }

    throw err
  }
};

/**
 * Registro con email y contrasena
 */
export const registerEmail = async (email: string, password: string): Promise<AuthResponse> => {
  const normalizedEmail = normalizeEmail(email)
  const res = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  const token = await res.user.getIdToken();
  return { user: res.user, token };
};

/**
 * Login con Google
 */
export const loginGoogle = async (): Promise<AuthResponse> => {
  const res = await signInWithPopup(auth, googleProvider);
  const token = await res.user.getIdToken();
  return { user: res.user, token };
};

/**
 * Logout
 */
export const logout = async (): Promise<void> => {
  await signOut(auth);
  localStorage.removeItem("token");
};
