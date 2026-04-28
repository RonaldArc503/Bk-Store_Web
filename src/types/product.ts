/**
 * Product Types
 * Arquitectura escalable: Productos + Inventario separados
 */

// 🟢 TABLA: productos (catálogo)
export interface Producto {
  id: string
  codigo: string
  nombre: string
  tipo: string
  material: string
  genero: string
  descripcion?: string
  estado: 'Activo' | 'Inactivo'
  createdAt: string
  updatedAt: string
}

export interface CreateProductoInput {
  codigo: string
  nombre: string
  tipo: string
  material: string
  genero: string
  descripcion?: string
}

export interface UpdateProductoInput {
  id: string
  nombre?: string
  descripcion?: string
  estado?: 'Activo' | 'Inactivo'
  codigo?: string
  tipo?: string
  material?: string
  genero?: string
}

// 🟡 TABLA: inventario (stock y precios)
export interface Inventario {
  id: string
  productoId: string // FK a productos
  stock: number
  stockMinimo: number
  costo: number
  precioUnitario: number
  precioMediaDocena: number
  precioDocena: number
  updatedAt: string
}

export interface CreateInventarioInput {
  productoId: string
  stock: number
  stockMinimo: number
  costo: number
  precioUnitario: number
  precioMediaDocena: number
  precioDocena: number
}

export interface UpdateInventarioInput {
  id: string
  stock?: number
  stockMinimo?: number
  costo?: number
  precioUnitario?: number
  precioMediaDocena?: number
  precioDocena?: number
}

// 🔄 TABLA: movimientos (historial de cambios de stock)
export interface Movimiento {
  id: string
  productoId: string
  tipo: 'entrada' | 'salida' | 'ajuste'
  cantidad: number
  motivo: string
  fecha: string
}

export interface CreateMovimientoInput {
  productoId: string
  tipo: 'entrada' | 'salida' | 'ajuste'
  cantidad: number
  motivo: string
}

// 📦 VISTA UNIFICADA (para mostrar en UI)
export interface ProductoConInventario {
  producto: Producto
  inventario: Inventario
}

// TIPOS HEREDADOS (para compatibilidad)
export interface Product {
  id: string
  codigo: string
  nombre: string
  tipo: string
  material: string
  genero: string
  stock: number
  costo: number
  precioUnitario: number
  precioMediaDocena: number
  precioDocena: number
  fechaCreacion: string
  fechaActualizacion: string
}

export interface CreateProductInput {
  codigo: string
  nombre: string
  tipo: string
  material: string
  genero: string
  stock: number
  costo: number
  precioUnitario: number
  precioMediaDocena: number
  precioDocena: number
}

export interface UpdateProductInput extends CreateProductInput {
  id: string
}

export interface InventoryStats {
  totalProductos: number
  stockTotal: number
  alertasStock: number
}
