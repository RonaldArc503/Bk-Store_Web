/**
 * Product Service - REFACTORIZADO
 * Gestión del catálogo de productos (información básica, sin stock)
 * Arquitectura escalable separada de Inventario
 */

import {
  ref,
  set,
  get,
  remove,
} from "firebase/database"
import { database } from "../app/firebase"
import type { Producto, CreateProductoInput, UpdateProductoInput } from '../types/product'

const PRODUCTOS_PATH = 'productos'

export const ProductService = {
  /**
   * Obtener todos los productos
   */
  async getProductos(): Promise<Producto[]> {
    try {
      const productosRef = ref(database, PRODUCTOS_PATH)
      const snapshot = await get(productosRef)

      if (!snapshot.exists()) {
        return []
      }

      const data = snapshot.val()
      return Object.values(data) as Producto[]
    } catch (error) {
      console.error('Error fetching productos:', error)
      throw new Error('Error al obtener produtos')
    }
  },

  /**
   * Obtener producto por ID
   */
  async getProductoById(id: string): Promise<Producto | null> {
    try {
      const productoRef = ref(database, `${PRODUCTOS_PATH}/${id}`)
      const snapshot = await get(productoRef)

      if (!snapshot.exists()) {
        return null
      }

      return snapshot.val() as Producto
    } catch (error) {
      console.error('Error fetching producto:', error)
      throw new Error('Error al obtener producto')
    }
  },

  /**
   * Crear nuevo producto
   */
  async createProducto(input: CreateProductoInput): Promise<Producto> {
    try {
      const id = Math.random().toString(36).substr(2, 9)
      const now = new Date().toISOString().split('T')[0]

      const newProducto: Producto = {
        id,
        ...input,
        estado: 'Activo',
        createdAt: now,
        updatedAt: now,
      }

      const productoRef = ref(database, `${PRODUCTOS_PATH}/${id}`)
      await set(productoRef, newProducto)

      return newProducto
    } catch (error) {
      console.error('Error creating producto:', error)
      throw new Error('Error al crear producto')
    }
  },

  /**
   * Actualizar producto
   */
  async updateProducto(input: UpdateProductoInput): Promise<Producto> {
    try {
      const productoRef = ref(database, `${PRODUCTOS_PATH}/${input.id}`)
      const snapshot = await get(productoRef)

      if (!snapshot.exists()) {
        throw new Error('Producto no encontrado')
      }

      const currentProducto = snapshot.val() as Producto
      const now = new Date().toISOString().split('T')[0]

      const updatedProducto: Producto = {
        ...currentProducto,
        nombre: input.nombre ?? currentProducto.nombre,
        descripcion: input.descripcion ?? currentProducto.descripcion,
        estado: input.estado ?? currentProducto.estado,
        updatedAt: now,
      }

      await set(productoRef, updatedProducto)
      return updatedProducto
    } catch (error) {
      console.error('Error updating producto:', error)
      throw new Error('Error al actualizar producto')
    }
  },

  /**
   * Eliminar producto
   */
  async deleteProducto(id: string): Promise<void> {
    try {
      const productoRef = ref(database, `${PRODUCTOS_PATH}/${id}`)
      await remove(productoRef)
    } catch (error) {
      console.error('Error deleting producto:', error)
      throw new Error('Error al eliminar producto')
    }
  },

  /**
   * Generar código de barras
   */
  generateBarcode(): string {
    return Array(13)
      .fill(0)
      .map(() => Math.floor(Math.random() * 10))
      .join('')
  },
}
