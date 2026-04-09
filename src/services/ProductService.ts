/**
 * Product Service
 * Maneja todas las operaciones relacionadas con productos
 */

import { ApiService } from './ApiService'
import type { Product } from '../types'

export class ProductService {
  /**
   * Obtener todos los productos
   */
  static async getAll(): Promise<Product[]> {
    return ApiService.get<Product[]>('/products')
  }

  /**
   * Obtener producto por ID
   */
  static async getById(id: string): Promise<Product> {
    return ApiService.get<Product>(`/products/${id}`)
  }

  /**
   * Crear nuevo producto
   */
  static async create(product: Omit<Product, 'id'>): Promise<Product> {
    return ApiService.post<Product>('/products', product)
  }

  /**
   * Actualizar producto
   */
  static async update(id: string, product: Partial<Product>): Promise<Product> {
    return ApiService.put<Product>(`/products/${id}`, product)
  }

  /**
   * Eliminar producto
   */
  static async delete(id: string): Promise<void> {
    await ApiService.delete(`/products/${id}`)
  }

  /**
   * Buscar productos
   */
  static async search(query: string): Promise<Product[]> {
    return ApiService.get<Product[]>(`/products/search?q=${query}`)
  }
}
