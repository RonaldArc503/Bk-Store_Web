/**
 * Product Types
 */

export interface Product {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  material: string;
  genero: string;
  stock: number;
  costo: number;
  precioUnitario: number;
  precioMediaDocena: number;
  precioDocena: number;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface CreateProductInput {
  codigo: string;
  nombre: string;
  tipo: string;
  material: string;
  genero: string;
  stock: number;
  costo: number;
  precioUnitario: number;
  precioMediaDocena: number;
  precioDocena: number;
}

export interface UpdateProductInput extends CreateProductInput {
  id: string;
}

export interface InventoryStats {
  totalProductos: number;
  stockTotal: number;
  alertasStock: number;
}
