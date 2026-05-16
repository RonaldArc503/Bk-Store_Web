import { ref, get, set } from 'firebase/database'
import { database } from '../app/firebase'

export interface CatalogItem {
  id: string
  label: string
}

interface CatalogData {
  productTypes: CatalogItem[]
  materials: CatalogItem[]
}

const CATALOG_PATH = 'settings/catalog'

export const CatalogService = {
  async getCatalog(): Promise<CatalogData | null> {
    try {
      const snapshot = await get(ref(database, CATALOG_PATH))
      if (!snapshot.exists()) return null
      const val = snapshot.val() as any
      return {
        productTypes: Array.isArray(val?.productTypes) ? val.productTypes : [],
        materials: Array.isArray(val?.materials) ? val.materials : [],
      }
    } catch {
      return null
    }
  },

  async updateKey(key: 'productTypes' | 'materials', items: CatalogItem[]): Promise<void> {
    await set(ref(database, `${CATALOG_PATH}/${key}`), items)
  },

  async setCatalog(data: CatalogData): Promise<void> {
    await set(ref(database, CATALOG_PATH), data)
  },
}
