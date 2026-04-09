/**
 * Cart Context
 * Contexto global para el carrito de compras
 */

import React, { createContext, useState, useCallback, type ReactNode } from 'react'
import type { CartItem, Product } from '../types'

interface CartContextType {
  items: CartItem[]
  total: number
  addItem: (product: Product, quantity: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  getItemCount: () => number
}

export const CartContext = createContext<CartContextType | undefined>(undefined)

interface CartProviderProps {
  children: ReactNode
}

function CartProvider({ children }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>([])

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  const addItem = useCallback((product: Product, quantity: number) => {
    setItems(prevItems => {
      const existingItem = prevItems.find(item => item.productId === product.id)
      if (existingItem) {
        return prevItems.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }
      return [...prevItems, { productId: product.id, quantity, price: product.price }]
    })
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems(prevItems => prevItems.filter(item => item.productId !== productId))
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }
    setItems(prevItems =>
      prevItems.map(item =>
        item.productId === productId
          ? { ...item, quantity }
          : item
      )
    )
  }, [removeItem])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const getItemCount = useCallback(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0)
  }, [items])

  const value: CartContextType = {
    items,
    total,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItemCount
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

/**
 * Hook para usar el contexto del carrito
 */
export function useCart(): CartContextType {
  const context = React.useContext(CartContext)
  if (!context) {
    throw new Error('useCart debe usarse dentro de CartProvider')
  }
  return context
}

export { CartProvider }
