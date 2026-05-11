/**
 * Inventory Service - REFACTORIZADO
 * Gestión de stock y precios (separado de información del producto)
 * Arquitectura escalable: productos + inventario
 */

import {
  ref,
  set,
  get,
  remove,
  onValue,
  query,
  orderByChild,
  equalTo,
  limitToFirst,
} from "firebase/database"
import { database } from "../app/firebase"
import type { Producto, Inventario, CreateInventarioInput, UpdateInventarioInput, Product, CreateProductInput, UpdateProductInput, InventoryStats } from '../types/product'
import { ProductService } from './ProductService'
import { MovimientosService } from './MovimientosService'

const INVENTARIO_PATH = 'inventario'

/**
 * Unified InventoryService: inventory core + legacy product helpers
 */
export const InventoryService = {
  /** Inventory core: Obtener todo el inventario */
  async getInventario(): Promise<Inventario[]> {
    try {
      const inventarioRef = ref(database, INVENTARIO_PATH)
      const snapshot = await get(inventarioRef)

      if (!snapshot.exists()) return []
      const data = snapshot.val()
      return Object.values(data) as Inventario[]
    } catch (error) {
      console.error('Error fetching inventario:', error)
      throw new Error('Error al obtener inventario')
    }
  },

  /** Obtener inventario por ID */
  async getInventarioById(id: string): Promise<Inventario | null> {
    try {
      const inventarioRef = ref(database, `${INVENTARIO_PATH}/${id}`)
      const snapshot = await get(inventarioRef)
      if (!snapshot.exists()) return null
      return snapshot.val() as Inventario
    } catch (error) {
      console.error('Error fetching inventario by id:', error)
      throw new Error('Error al obtener inventario')
    }
  },

  /** Obtener inventario por producto ID */
  async getInventarioByProductoId(productoId: string): Promise<Inventario | null> {
    try {
      const inventarioRef = ref(database, INVENTARIO_PATH)
      try {
        const inventarioQuery = query(
          inventarioRef,
          orderByChild('productoId'),
          equalTo(productoId),
          limitToFirst(1)
        )
        const snapshot = await get(inventarioQuery)
        if (snapshot.exists()) {
          const data = snapshot.val() as Record<string, Inventario>
          const [firstKey] = Object.keys(data)
          if (!firstKey) return null
          const entry = data[firstKey]
          return { ...entry, id: entry.id || firstKey }
        }
      } catch (queryError) {
        console.warn('Indexed inventario query failed, falling back to full scan', queryError)
      }

      const allInventario = await this.getInventario()
      const entry = allInventario.find((item) => item.productoId === productoId)
      return entry ?? null
    } catch (error) {
      console.error('Error fetching inventario by producto:', error)
      throw new Error('Error al obtener inventario')
    }
  },

  /** Crear inventario (usado cuando se crea un producto) */
  async createInventario(input: CreateInventarioInput): Promise<Inventario> {
    try {
      const id = Math.random().toString(36).substr(2, 9)
      const now = new Date().toISOString().split('T')[0]

      const newInventario: Inventario = {
        id,
        productoId: input.productoId,
        stock: input.stock,
        stockMinimo: input.stockMinimo,
        costo: input.costo,
        precioUnitario: input.precioUnitario,
        precioMediaDocena: input.precioMediaDocena,
        precioDocena: input.precioDocena,
        updatedAt: now,
      }

      const inventarioRef = ref(database, `${INVENTARIO_PATH}/${id}`)
      await set(inventarioRef, newInventario)

      if (input.stock > 0) {
        await MovimientosService.registrarEntrada(input.productoId, input.stock, 'stock inicial')
      }

      return newInventario
    } catch (error) {
      console.error('Error creating inventario:', error)
      throw new Error('Error al crear inventario')
    }
  },

  /** Actualizar inventario (precios, stock mínimo) */
  async updateInventario(input: UpdateInventarioInput): Promise<Inventario> {
    try {
      const inventarioRef = ref(database, `${INVENTARIO_PATH}/${input.id}`)
      const snapshot = await get(inventarioRef)
      if (!snapshot.exists()) throw new Error('Inventario no encontrado')

      const currentInventario = snapshot.val() as Inventario
      const now = new Date().toISOString().split('T')[0]

      const updatedInventario: Inventario = {
        ...currentInventario,
        stock: input.stock ?? currentInventario.stock,
        stockMinimo: input.stockMinimo ?? currentInventario.stockMinimo,
        costo: input.costo ?? currentInventario.costo,
        precioUnitario: input.precioUnitario ?? currentInventario.precioUnitario,
        precioMediaDocena: input.precioMediaDocena ?? currentInventario.precioMediaDocena,
        precioDocena: input.precioDocena ?? currentInventario.precioDocena,
        updatedAt: now,
      }

      await set(inventarioRef, updatedInventario)
      return updatedInventario
    } catch (error) {
      console.error('Error updating inventario:', error)
      throw new Error('Error al actualizar inventario')
    }
  },

  /** Descontar stock (para ventas) */
  async descontarStock(inventarioId: string, cantidad: number, motivo: string = 'venta'): Promise<Inventario> {
    try {
      if (cantidad <= 0) throw new Error('Cantidad invalida para descuento de stock')

      const inventarioRef = ref(database, `${INVENTARIO_PATH}/${inventarioId}`)
      const snapshot = await get(inventarioRef)
      if (!snapshot.exists()) throw new Error('Inventario no encontrado')

      const currentInventario = snapshot.val() as Inventario
      const currentStock = Number(currentInventario.stock || 0)
      if (currentStock < cantidad) {
        throw new Error('Stock insuficiente')
      }

      const newStock = currentStock - cantidad
      const now = new Date().toISOString().split('T')[0]
      const updatedInventario: Inventario = {
        ...currentInventario,
        stock: newStock,
        updatedAt: now,
      }

      await set(inventarioRef, updatedInventario)
      await MovimientosService.registrarSalida(updatedInventario.productoId, cantidad, motivo)
      return updatedInventario
    } catch (error) {
      console.error('Error descontando stock:', error)
      throw error instanceof Error ? error : new Error('Error al descontar stock')
    }
  },

  /** Agregar stock (ajuste, devolución, etc.) */
  async agregarStock(inventarioId: string, cantidad: number, motivo: string = 'ajuste'): Promise<Inventario> {
    try {
      const inventarioRef = ref(database, `${INVENTARIO_PATH}/${inventarioId}`)
      const snapshot = await get(inventarioRef)
      if (!snapshot.exists()) throw new Error('Inventario no encontrado')

      const currentInventario = snapshot.val() as Inventario
      const newStock = currentInventario.stock + cantidad
      const now = new Date().toISOString().split('T')[0]

      const updatedInventario: Inventario = { ...currentInventario, stock: newStock, updatedAt: now }
      await set(inventarioRef, updatedInventario)
      await MovimientosService.registrarEntrada(currentInventario.productoId, cantidad, motivo)
      return updatedInventario
    } catch (error) {
      console.error('Error agregando stock:', error)
      throw new Error('Error al agregar stock')
    }
  },

  /** Obtener estadísticas de inventario */
  async getInventarioStats(lowStockThreshold: number = 24): Promise<InventoryStats> {
    try {
      const inventario = await this.getInventario()
      return {
        totalProductos: inventario.length,
        stockTotal: inventario.reduce((sum, i) => sum + i.stock, 0),
        alertasStock: inventario.filter((i) => i.stock < i.stockMinimo || i.stock < lowStockThreshold).length,
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      throw new Error('Error al obtener estadísticas')
    }
  },

  /** Eliminar inventario */
  async deleteInventario(id: string): Promise<void> {
    try {
      const inventarioRef = ref(database, `${INVENTARIO_PATH}/${id}`)
      await remove(inventarioRef)
    } catch (error) {
      console.error('Error deleting inventario:', error)
      throw new Error('Error al eliminar inventario')
    }
  },

  /** Suscribirse a cambios en tiempo real */
  onInventarioChange(callback: (inventario: Inventario[]) => void): () => void {
    const inventarioRef = ref(database, INVENTARIO_PATH)
    const unsubscribe = onValue(inventarioRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        const inventario = Object.values(data) as Inventario[]
        callback(inventario)
      } else {
        callback([])
      }
    })
    return unsubscribe
  },

  /**
   * Legacy helpers (Producto + Inventario combined)
   */
  async createProductWithInventory(input: CreateProductInput): Promise<{ producto: any; inventario: Inventario }> {
    try {
      const producto = await ProductService.createProducto({
        codigo: input.codigo,
        nombre: input.nombre,
        tipo: input.tipo,
        tipoId: (input as any).tipoId,
        material: input.material,
        materialId: (input as any).materialId,
        genero: input.genero,
      })

      const inventario = await this.createInventario({
        productoId: producto.id,
        stock: input.stock,
        stockMinimo: input.stockMinimo ?? 24,
        costo: input.costo,
        precioUnitario: input.precioUnitario,
        precioMediaDocena: input.precioMediaDocena,
        precioDocena: input.precioDocena,
      })

      return { producto, inventario }
    } catch (error) {
      console.error('Error creating product with inventory:', error)
      throw error
    }
  },

  async getProducts(): Promise<Product[]> {
    try {
      const inventario = await this.getInventario()
      const productos = await ProductService.getProductos()

      return productos.map((p: Producto) => {
        const inv = inventario.find((i: Inventario) => i.productoId === p.id)
        return {
          id: p.id,
          codigo: p.codigo,
          nombre: p.nombre,
          tipo: p.tipo,
          tipoId: (p as any).tipoId,
          material: p.material,
          materialId: (p as any).materialId,
          genero: p.genero,
          stock: inv?.stock || 0,
          costo: inv?.costo || 0,
          precioUnitario: inv?.precioUnitario || 0,
          precioMediaDocena: inv?.precioMediaDocena || 0,
          precioDocena: inv?.precioDocena || 0,
          fechaCreacion: p.createdAt,
          fechaActualizacion: p.updatedAt,
        }
      })
    } catch (error) {
      console.error('Error fetching products:', error)
      throw new Error('Error al obtener productos')
    }
  },

  async searchProducts(query: string): Promise<Product[]> {
    try {
      const productos = await this.getProducts()
      const lowerQuery = query.toLowerCase()
      return productos.filter(
        (p: Product) =>
          p.nombre.toLowerCase().includes(lowerQuery) ||
          (p.codigo || '').toLowerCase().includes(lowerQuery) ||
          (p.tipo || '').toLowerCase().includes(lowerQuery)
      )
    } catch (error) {
      console.error('Error searching products:', error)
      throw new Error('Error al buscar productos')
    }
  },

  async getInventoryStats(lowStockThreshold?: number): Promise<InventoryStats> {
    return this.getInventarioStats(lowStockThreshold ?? 24)
  },

  generateBarcode(): string {
    return ProductService.generateBarcode()
  },

  async updateProduct(input: UpdateProductInput): Promise<Product> {
    try {
      // Update producto fields (catalog)
      const producto = await ProductService.updateProducto({
        id: input.id,
        nombre: input.nombre,
        // pass through other optional product fields if provided
        codigo: (input as any).codigo,
        tipo: (input as any).tipo,
        tipoId: (input as any).tipoId,
        material: (input as any).material,
        materialId: (input as any).materialId,
        genero: (input as any).genero,
        descripcion: (input as any).descripcion,
        estado: (input as any).estado,
      })

      // Update or create inventario (stock/precios)
      let inventario = await this.getInventarioByProductoId(input.id)
      if (inventario) {
        inventario = await this.updateInventario({
          id: inventario.id,
          stock: (input as any).stock ?? inventario.stock,
          stockMinimo: (input as any).stockMinimo ?? inventario.stockMinimo,
          costo: (input as any).costo ?? inventario.costo,
          precioUnitario: (input as any).precioUnitario ?? inventario.precioUnitario,
          precioMediaDocena: (input as any).precioMediaDocena ?? inventario.precioMediaDocena,
          precioDocena: (input as any).precioDocena ?? inventario.precioDocena,
        })
      } else {
        // create inventory record if stock/costo/prices provided
        const shouldCreate = typeof (input as any).stock !== 'undefined' || typeof (input as any).costo !== 'undefined' || typeof (input as any).precioUnitario !== 'undefined'
        if (shouldCreate) {
          inventario = await this.createInventario({
            productoId: producto.id,
            stock: (input as any).stock ?? 0,
            stockMinimo: (input as any).stockMinimo ?? 24,
            costo: (input as any).costo ?? 0,
            precioUnitario: (input as any).precioUnitario ?? 0,
            precioMediaDocena: (input as any).precioMediaDocena ?? 0,
            precioDocena: (input as any).precioDocena ?? 0,
          })
        }
      }
      return {
        id: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        tipo: producto.tipo,
        material: producto.material,
        genero: producto.genero,
        stock: inventario?.stock ?? 0,
        costo: inventario?.costo ?? 0,
        precioUnitario: inventario?.precioUnitario ?? 0,
        precioMediaDocena: inventario?.precioMediaDocena ?? 0,
        precioDocena: inventario?.precioDocena ?? 0,
        fechaCreacion: producto.createdAt,
        fechaActualizacion: producto.updatedAt,
      }
    } catch (error) {
      console.error('Error updating product:', error)
      throw new Error('Error al actualizar producto')
    }
  },

  async deleteProduct(id: string): Promise<void> {
    try {
      await ProductService.deleteProducto(id)
      const inventario = await this.getInventarioByProductoId(id)
      if (inventario) await this.deleteInventario(inventario.id)
    } catch (error) {
      console.error('Error deleting product:', error)
      throw new Error('Error al eliminar producto')
    }
  },
}
