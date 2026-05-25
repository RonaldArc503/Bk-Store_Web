import { get, ref, set } from 'firebase/database'
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { database, storage } from '../app/firebase'
import { DEFAULT_BRANDING, normalizeBranding, type StoreBranding } from '../constants/branding'

const BRANDING_PATH = 'settings/branding'

export const BrandingService = {
  async getBranding(): Promise<StoreBranding | null> {
    try {
      const snapshot = await get(ref(database, BRANDING_PATH))
      if (!snapshot.exists()) return null
      return normalizeBranding(snapshot.val())
    } catch {
      return null
    }
  },

  async setBranding(payload: StoreBranding): Promise<void> {
    await set(ref(database, BRANDING_PATH), normalizeBranding(payload))
  },

  async uploadBrandImage(file: File): Promise<string> {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `branding/logo_${Date.now()}_${safeName}`
    const fileRef = storageRef(storage, path)
    await uploadBytes(fileRef, file, { contentType: file.type || 'image/png' })
    return getDownloadURL(fileRef)
  },

  async deleteBrandImageByUrl(url: string): Promise<void> {
    if (!url || !url.includes('/o/')) return
    try {
      const encoded = url.split('/o/')[1]?.split('?')[0]
      if (!encoded) return
      const path = decodeURIComponent(encoded)
      if (!path.startsWith('branding/')) return
      await deleteObject(storageRef(storage, path))
    } catch {
      // Ignorar si el archivo ya no existe
    }
  },

  getDefaultBranding(): StoreBranding {
    return { ...DEFAULT_BRANDING }
  },
}
