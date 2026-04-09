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

export interface AuthResponse {
  user: FirebaseUser;
  token: string;
}

/**
 * Login con email y contraseña
 */
export const loginEmail = async (email: string, password: string): Promise<AuthResponse> => {
  const res = await signInWithEmailAndPassword(auth, email, password);
  const token = await res.user.getIdToken();
  return { user: res.user, token };
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
