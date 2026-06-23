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
import { ensureActiveSession } from "../services/SessionService";

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

async function registerDeviceSession(
  firebaseUser: FirebaseUser,
  loginEmail?: string,
): Promise<void> {
  const emailForLookup = firebaseUser.email || loginEmail || null
  const systemUser = await UserService.resolveUserByAuth(firebaseUser.uid, emailForLookup)
  if (!systemUser || systemUser.estado !== 'Activo') {
    throw new Error('Usuario no autorizado o inactivo')
  }
  await ensureActiveSession(firebaseUser.uid, systemUser.rol)
}

async function completeLogin(
  firebaseUser: FirebaseUser,
  loginEmail?: string,
): Promise<AuthResponse> {
  await registerDeviceSession(firebaseUser, loginEmail)
  const token = await firebaseUser.getIdToken()
  return { user: firebaseUser, token }
}

/**
 * Login con email y contrasena
 */
export const loginEmail = async (email: string, password: string): Promise<AuthResponse> => {
  const normalizedEmail = normalizeEmail(email)

  const verifiedUser = await UserService.verifyUserCredentials(normalizedEmail, password)

  if (verifiedUser) {
    try {
      const res = await signInWithEmailAndPassword(auth, normalizedEmail, password)
      return completeLogin(res.user, normalizedEmail)
    } catch (err: unknown) {
      const code = getAuthErrorCode(err)

      if (code === 'auth/user-not-found') {
        const res = await createUserWithEmailAndPassword(auth, normalizedEmail, password)
        return completeLogin(res.user, normalizedEmail)
      }

      if (code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') {
        try {
          const res = await createUserWithEmailAndPassword(auth, normalizedEmail, password)
          return completeLogin(res.user, normalizedEmail)
        } catch (createErr: unknown) {
          const createErrCode = getAuthErrorCode(createErr)
          if (createErrCode !== 'auth/email-already-in-use') {
            throw createErr
          }

          try {
            const signInRes = await signInWithEmailAndPassword(auth, normalizedEmail, password)
            return completeLogin(signInRes.user, normalizedEmail)
          } catch {
            throw new Error(
              'Su contraseña es correcta en el sistema, pero Firebase Authentication tiene una clave antigua. ' +
              'El administrador debe eliminar este correo en Firebase Console > Authentication > Usuarios, ' +
              'y luego el usuario podrá entrar con la contraseña nueva.',
            )
          }
        }
      }

      throw err
    }
  }

  try {
    const res = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    return completeLogin(res.user, normalizedEmail);
  } catch (err: unknown) {
    const code = getAuthErrorCode(err)
    if (code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') {
      throw new Error('Credenciales invalidas')
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
  await registerDeviceSession(res.user);
  const token = await res.user.getIdToken();
  return { user: res.user, token };
};

/**
 * Login con Google
 */
export const loginGoogle = async (): Promise<AuthResponse> => {
  const res = await signInWithPopup(auth, googleProvider);
  await registerDeviceSession(res.user);
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
