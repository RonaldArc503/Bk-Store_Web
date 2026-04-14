import { ref, push, set, get } from 'firebase/database'
import { database } from '../app/firebase'

const ORDERS_PATH = 'orders'

export const OrderService = {
  async createOrder(order: any) {
    try {
      const ordersRef = ref(database, ORDERS_PATH)
      const newOrderRef = push(ordersRef)
      await set(newOrderRef, order)
      return { id: newOrderRef.key, order }
    } catch (error) {
      console.error('Error creating order:', error)
      throw error
    }
  },

  async getOrderById(id: string) {
    try {
      const snap = await get(ref(database, `${ORDERS_PATH}/${id}`))
      if (!snap.exists()) return null
      return snap.val()
    } catch (error) {
      console.error('Error getting order:', error)
      throw error
    }
  },
}
