/**
 * Movimientos Service
 * Historial de movimientos de stock (entradas, salidas, ajustes)
 */

import {
  ref,
  push,
  get,
} from "firebase/database"
import { database } from "../app/firebase"
import type { Movimiento, CreateMovimientoInput } from '../types/product'

const MOVIMIENTOS_PATH = 'movimientos'

export const MovimientosService = {
  /**
   * Obtener todos los movimientos
   */
  async getMovimientos(): Promise<Movimiento[]> {
    try {
      const movimientosRef = ref(database, MOVIMIENTOS_PATH)
      const snapshot = await get(movimientosRef)

      if (!snapshot.exists()) {
        return []
      }

      const data = snapshot.val()
      return Object.values(data) as Movimiento[]
    } catch (error) {
      console.error('Error fetching movimientos:', error)
      throw new Error('Error al obtener movimientos')
    }
  },

  /**
   * Obtener movimientos de un producto específico
   */
  async getMovimientosByProducto(productoId: string): Promise<Movimiento[]> {
    try {
      const movimientos = await this.getMovimientos()
      return movimientos.filter(m => m.productoId === productoId)
    } catch (error) {
      console.error('Error fetching movimientos by producto:', error)
      throw new Error('Error al obtener movimientos del producto')
    }
  },

  /**
   * Registrar movimiento (entrada, salida, ajuste)
   */
  async registrarMovimiento(input: CreateMovimientoInput): Promise<Movimiento> {
    try {
      const now = new Date().toISOString()

      const newMovimiento: Movimiento = {
        id: Math.random().toString(36).substr(2, 9),
        productoId: input.productoId,
        tipo: input.tipo,
        cantidad: input.cantidad,
        motivo: input.motivo,
        fecha: now,
      }

      const movimientosRef = ref(database, MOVIMIENTOS_PATH)
      await push(movimientosRef, newMovimiento)

      return newMovimiento
    } catch (error) {
      console.error('Error registering movimiento:', error)
      throw new Error('Error al registrar movimiento')
    }
  },

  /**
   * Registrar entrada de stock (stock inicial)
   */
  async registrarEntrada(productoId: string, cantidad: number, motivo: string = 'stock inicial'): Promise<Movimiento> {
    return this.registrarMovimiento({
      productoId,
      tipo: 'entrada',
      cantidad,
      motivo,
    })
  },

  /**
   * Registrar salida de stock (venta)
   */
  async registrarSalida(productoId: string, cantidad: number, motivo: string = 'venta'): Promise<Movimiento> {
    return this.registrarMovimiento({
      productoId,
      tipo: 'salida',
      cantidad,
      motivo,
    })
  },

  /**
   * Registrar ajuste de stock (corrección manual)
   */
  async registrarAjuste(productoId: string, cantidad: number, motivo: string): Promise<Movimiento> {
    return this.registrarMovimiento({
      productoId,
      tipo: 'ajuste',
      cantidad,
      motivo,
    })
  },

  /**
   * Obtener resumen de movimientos por tipo
   */
  async getResumenMovimientos(productoId: string) {
    try {
      const movimientos = await this.getMovimientosByProducto(productoId)

      const entradas = movimientos
        .filter(m => m.tipo === 'entrada')
        .reduce((sum, m) => sum + m.cantidad, 0)

      const salidas = movimientos
        .filter(m => m.tipo === 'salida')
        .reduce((sum, m) => sum + m.cantidad, 0)

      const ajustes = movimientos
        .filter(m => m.tipo === 'ajuste')
        .reduce((sum, m) => sum + m.cantidad, 0)

      return {
        totalEntradas: entradas,
        totalSalidas: salidas,
        totalAjustes: ajustes,
        neto: entradas - salidas + ajustes,
      }
    } catch (error) {
      console.error('Error getting resumen movimientos:', error)
      throw new Error('Error al obtener resumen de movimientos')
    }
  },
}
