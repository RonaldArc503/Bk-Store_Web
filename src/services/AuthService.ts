/**
 * Auth Service
 * Maneja autenticación y autorización
 */

import { ApiService } from './ApiService'
import type { User } from '../types'

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: User
}

export class AuthService {
  /**
   * Login
   */
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await ApiService.post<AuthResponse>('/auth/login', credentials)
    localStorage.setItem('token', response.token)
    return response
  }

  /**
   * Logout
   */
  static logout(): void {
    localStorage.removeItem('token')
  }

  /**
   * Registrarse
   */
  static async register(data: {
    name: string
    email: string
    password: string
  }): Promise<AuthResponse> {
    return ApiService.post<AuthResponse>('/auth/register', data)
  }

  /**
   * Obtener token guardado
   */
  static getToken(): string | null {
    return localStorage.getItem('token')
  }

  /**
   * Verificar si está autenticado
   */
  static isAuthenticated(): boolean {
    return !!this.getToken()
  }
}
