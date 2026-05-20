/** Etiqueta corta del dispositivo/navegador para mostrar en sesiones. */
export function getDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Dispositivo desconocido'

  const ua = navigator.userAgent
  let os = 'Navegador'
  if (/Windows/i.test(ua)) os = 'Windows'
  else if (/Android/i.test(ua)) os = 'Android'
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS'
  else if (/Mac/i.test(ua)) os = 'Mac'

  let browser = ''
  if (/Edg\//i.test(ua)) browser = 'Edge'
  else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome'
  else if (/Firefox/i.test(ua)) browser = 'Firefox'
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari'

  return browser ? `${os} · ${browser}` : os
}
