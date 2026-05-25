import { useEffect } from 'react'
import { getResolvedBranding } from '../constants/branding'
import { useSettings } from '../context/SettingsContext'

export function BrandingDocumentHead() {
  const { settings } = useSettings()
  const branding = getResolvedBranding(settings)

  useEffect(() => {
    document.title = branding.appName

    const favicon =
      branding.iconMode === 'custom' && branding.customImageUrl
        ? branding.customImageUrl
        : '/favicon.svg'

    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = favicon
  }, [branding.appName, branding.customImageUrl, branding.iconMode])

  return null
}
