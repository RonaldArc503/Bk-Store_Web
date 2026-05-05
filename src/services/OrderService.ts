import { ref, push, set, get, remove } from 'firebase/database'
import { database } from '../app/firebase'

const ORDERS_PATH = 'orders'

export const OrderService = {
  reserveOrderId() {
    const ordersRef = ref(database, ORDERS_PATH)
    const newOrderRef = push(ordersRef)
    return newOrderRef.key
  },

  async createOrder(order: any, orderId?: string) {
    try {
      if (orderId) {
        const orderRef = ref(database, `${ORDERS_PATH}/${orderId}`)
        await set(orderRef, order)
        return { id: orderId, order }
      }

      const ordersRef = ref(database, ORDERS_PATH)
      const newOrderRef = push(ordersRef)
      await set(newOrderRef, order)
      return { id: newOrderRef.key, order }
    } catch (error) {
      console.error('Error creating order:', error)
      throw error
    }
  },

  async deleteOrder(id: string) {
    try {
      await remove(ref(database, `${ORDERS_PATH}/${id}`))
    } catch (error) {
      console.error('Error deleting order:', error)
      throw error
    }
  },

  async getAllOrders(): Promise<any[]> {
    try {
      const snap = await get(ref(database, ORDERS_PATH))
      if (!snap.exists()) return []
      const data = snap.val() as Record<string, any>
      const list = Object.entries(data).map(([key, val]) => ({
        ...val,
        id: val.id || key,
      }))
      list.sort((a: any, b: any) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime())
      return list
    } catch (error) {
      console.error('Error getting all orders:', error)
      return []
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
