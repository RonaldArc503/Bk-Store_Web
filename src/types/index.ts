/**
 * Global Types & Interfaces
 */

export interface Product {
  id: string
  title: string
  description: string
  price: number
  image: string
  stock: number
  category?: string
  rating?: number
  reviews?: number
}

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role?: 'user' | 'admin'
  createdAt?: Date
}

/**
 * Sistema de Usuarios del Sistema
 */
export type UserRole = 'Administrador' | 'Bodeguero' | 'Caja' | 'Vendedor'
export type UserStatus = 'Activo' | 'Inactivo'

export interface SystemUser {
  id: string
  usuario: string
  nombreCompleto: string
  rol: UserRole
  estado: UserStatus
  email?: string
  fechaCreacion: string
  fechaActualizacion: string
}

export interface CreateUserInput {
  usuario: string
  nombreCompleto: string
  contraseña: string
  rol: UserRole
  email?: string
}

export interface UpdateUserInput {
  id: string
  nombreCompleto?: string
  rol?: UserRole
  estado?: UserStatus
  email?: string
}

export interface CartItem {
  productId: string
  quantity: number
  price: number
}

export interface Order {
  id: string
  userId: string
  items: CartItem[]
  total: number
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered'
  createdAt: Date
  updatedAt: Date
}

export interface Category {
  id: string
  name: string
  description?: string
  image?: string
}
