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
