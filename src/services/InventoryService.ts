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
import { OrderService } from './OrderService'
import { DevolucionService } from './DevolucionService'

const INVENTARIO_PATH = 'inventario'

export interface ProductDeletionCheck {
  canDelete: boolean
  hasSales: boolean
  hasMovements: boolean
  hasDevolutions: boolean
}

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeInventarioRecord = (raw: any, fallbackId = ''): Inventario => {
  const precioTresUnidades = toNumber(
    raw?.precioTresUnidades ?? raw?.price_for_3_units,
    0
  )
  const precioMediaDocena = toNumber(
    raw?.precioMediaDocena ?? raw?.price_for_half_dozen,
    0
  )
  const precioDocena = toNumber(
    raw?.precioDocena ?? raw?.price_for_dozen,
    0
  )

  return {
    id: String(raw?.id || fallbackId),
    productoId: String(raw?.productoId || ''),
    stock: toNumber(raw?.stock, 0),
    stockMinimo: toNumber(raw?.stockMinimo, 24),
    costo: toNumber(raw?.costo, 0),
    precioUnitario: toNumber(raw?.precioUnitario, 0),
    precioTresUnidades,
    precioMediaDocena,
    precioDocena,
    price_for_3_units: precioTresUnidades,
    price_for_half_dozen: precioMediaDocena,
    price_for_dozen: precioDocena,
    updatedAt: String(raw?.updatedAt || ''),
  }
}

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
      return Object.entries(data).map(([id, row]) => normalizeInventarioRecord(row, id))
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
      return normalizeInventarioRecord(snapshot.val(), id)
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
          const data = snapshot.val() as Record<string, any>
          const [firstKey] = Object.keys(data)
          if (!firstKey) return null
          const entry = data[firstKey]
          return normalizeInventarioRecord(entry, firstKey)
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
        precioTresUnidades: input.precioTresUnidades,
        precioMediaDocena: input.precioMediaDocena,
        precioDocena: input.precioDocena,
        price_for_3_units: input.precioTresUnidades,
        price_for_half_dozen: input.precioMediaDocena,
        price_for_dozen: input.precioDocena,
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

      const currentInventario = normalizeInventarioRecord(snapshot.val(), input.id)
      const now = new Date().toISOString().split('T')[0]

      const updatedInventario: Inventario = {
        ...currentInventario,
        stock: input.stock ?? currentInventario.stock,
        stockMinimo: input.stockMinimo ?? currentInventario.stockMinimo,
        costo: input.costo ?? currentInventario.costo,
        precioUnitario: input.precioUnitario ?? currentInventario.precioUnitario,
        precioTresUnidades: input.precioTresUnidades ?? currentInventario.precioTresUnidades,
        precioMediaDocena: input.precioMediaDocena ?? currentInventario.precioMediaDocena,
        precioDocena: input.precioDocena ?? currentInventario.precioDocena,
        price_for_3_units: input.precioTresUnidades ?? currentInventario.precioTresUnidades,
        price_for_half_dozen: input.precioMediaDocena ?? currentInventario.precioMediaDocena,
        price_for_dozen: input.precioDocena ?? currentInventario.precioDocena,
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

      const currentInventario = normalizeInventarioRecord(snapshot.val(), inventarioId)
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

      const currentInventario = normalizeInventarioRecord(snapshot.val(), inventarioId)
      const cantidadNum = Number(cantidad)
      if (!Number.isFinite(cantidadNum)) throw new Error('Cantidad invalida')

      const now = new Date().toISOString().split('T')[0]

      // If cantidad is zero, nothing to change — return current record
      if (cantidadNum === 0) return { ...currentInventario, id: currentInventario.id }

      const newStock = Number(currentInventario.stock || 0) + cantidadNum
      const updatedInventario: Inventario = { ...currentInventario, stock: newStock, updatedAt: now }
      await set(inventarioRef, updatedInventario)
      await MovimientosService.registrarEntrada(currentInventario.productoId, cantidadNum, motivo)
      return updatedInventario
    } catch (error) {
      console.error('Error agregando stock:', error)
      throw error instanceof Error ? error : new Error('Error al agregar stock')
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
        const inventario = Object.entries(data).map(([id, row]) => normalizeInventarioRecord(row, id))
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
  async createProductWithInventory(input: CreateProductInput): Promise<{ producto: Product; inventario: Inventario }> {
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
        precioTresUnidades: input.precioTresUnidades,
        precioMediaDocena: input.precioMediaDocena,
        precioDocena: input.precioDocena,
      })

      return {
        producto: {
          id: producto.id,
          codigo: producto.codigo,
          nombre: producto.nombre,
          tipo: producto.tipo,
          tipoId: (producto as any).tipoId,
          material: producto.material,
          materialId: (producto as any).materialId,
          genero: producto.genero,
          stock: inventario.stock,
          costo: inventario.costo,
          precioUnitario: inventario.precioUnitario,
          precioTresUnidades: inventario.precioTresUnidades,
          precioMediaDocena: inventario.precioMediaDocena,
          precioDocena: inventario.precioDocena,
          fechaCreacion: producto.createdAt,
          fechaActualizacion: producto.updatedAt,
        } as Product,
        inventario,
      }
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
          estado: p.estado,
          stock: inv?.stock || 0,
          costo: inv?.costo || 0,
          precioUnitario: inv?.precioUnitario || 0,
          precioTresUnidades: inv?.precioTresUnidades || 0,
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

  async getProductDeletionCheck(productId: string): Promise<ProductDeletionCheck> {
    try {
      const [orders, movements, devolutions] = await Promise.all([
        OrderService.getAllOrders(),
        MovimientosService.getMovimientos(),
        DevolucionService.getAllDevoluciones(),
      ])

      const hasSales = orders.some((order) => {
        const items = Array.isArray(order?.items) ? order.items : []
        return items.some((item: any) => {
          const itemId = String(item?.id ?? item?.productId ?? item?.productoId ?? '').trim()
          return itemId === productId
        })
      })

      // Exclude initial stock registrations from blocking deletion (motivo 'stock inicial')
      const hasMovements = movements.some((movement) =>
        movement.productoId === productId && String(movement.motivo ?? '').trim().toLowerCase() !== 'stock inicial'
      )

      const hasDevolutions = devolutions.some((devolution: any) => {
        const items = Array.isArray(devolution?.items) ? devolution.items : []
        return items.some((item: any) => String(item?.productId ?? '').trim() === productId)
      })

      return {
        canDelete: !hasSales && !hasMovements && !hasDevolutions,
        hasSales,
        hasMovements,
        hasDevolutions,
      }
    } catch (error) {
      console.error('Error checking product deletion status:', error)
      return {
        canDelete: false,
        hasSales: false,
        hasMovements: false,
        hasDevolutions: false,
      }
    }
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
          precioTresUnidades: (input as any).precioTresUnidades ?? inventario.precioTresUnidades,
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
            precioTresUnidades: (input as any).precioTresUnidades ?? 0,
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
        estado: producto.estado,
        stock: inventario?.stock ?? 0,
        costo: inventario?.costo ?? 0,
        precioUnitario: inventario?.precioUnitario ?? 0,
        precioTresUnidades: inventario?.precioTresUnidades ?? 0,
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
      const deletionCheck = await this.getProductDeletionCheck(id)

      if (!deletionCheck.canDelete) {
        throw new Error('No se puede eliminar un producto con ventas, movimientos o devoluciones registradas. Solo puedes deshabilitarlo.')
      }

      await ProductService.deleteProducto(id)
      const inventario = await this.getInventarioByProductoId(id)
      if (inventario) await this.deleteInventario(inventario.id)
    } catch (error) {
      console.error('Error deleting product:', error)
      throw new Error('Error al eliminar producto')
    }
  },

  async setProductStatus(id: string, estado: 'Activo' | 'Inactivo'): Promise<Product> {
    try {
      const producto = await ProductService.updateProducto({ id, estado })
      const inventario = await this.getInventarioByProductoId(id)
      return {
        id: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        tipo: producto.tipo,
        tipoId: producto.tipoId,
        material: producto.material,
        materialId: producto.materialId,
        genero: producto.genero,
        estado: producto.estado,
        stock: inventario?.stock ?? 0,
        costo: inventario?.costo ?? 0,
        precioUnitario: inventario?.precioUnitario ?? 0,
        precioTresUnidades: inventario?.precioTresUnidades ?? 0,
        precioMediaDocena: inventario?.precioMediaDocena ?? 0,
        precioDocena: inventario?.precioDocena ?? 0,
        fechaCreacion: producto.createdAt,
        fechaActualizacion: producto.updatedAt,
      }
    } catch (error) {
      console.error('Error updating product status:', error)
      throw new Error('Error al actualizar estado del producto')
    }
  },
}
