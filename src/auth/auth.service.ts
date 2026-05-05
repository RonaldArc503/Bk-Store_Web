/**
 * Auth Service
 * Maneja autenticación con Firebase
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

/**
 * Login con email y contraseña
 */
export const loginEmail = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const res = await signInWithEmailAndPassword(auth, email, password);
    const token = await res.user.getIdToken();
    return { user: res.user, token };
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : ''
    if (code === 'auth/user-not-found') {
      const verified = await UserService.verifyUserCredentials(email, password)
      if (!verified) {
        throw new Error('Credenciales inválidas')
      }

      const res = await createUserWithEmailAndPassword(auth, email, password)
      const token = await res.user.getIdToken()
      return { user: res.user, token }
    }
    throw err
  }
};

/**
 * Registro con email y contraseña
 */
export const registerEmail = async (email: string, password: string): Promise<AuthResponse> => {
  const res = await createUserWithEmailAndPassword(auth, email, password);
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
