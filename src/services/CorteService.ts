import { ref, push, set, get } from 'firebase/database'
import { database } from '../app/firebase'

const CORTES_PATH = 'cortes'

export const CorteService = {
  async saveCorte(corte: any) {
    try {
      const cortesRef = ref(database, CORTES_PATH)
      const newRef = push(cortesRef)
      await set(newRef, corte)
      return { id: newRef.key, corte }
    } catch (error) {
      console.error('Error saving corte:', error)
      throw error
    }
  },

  async getCorteById(id: string) {
    try {
      const snap = await get(ref(database, `${CORTES_PATH}/${id}`))
      if (!snap.exists()) return null
      return snap.val()
    } catch (error) {
      console.error('Error getting corte:', error)
      throw error
    }
  },
}
