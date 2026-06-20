const CERT_URL = '/qz/digital-certificate.txt'

let securityInitialized = false
let signingReady = false
let cachedPrivateKey: string | null = null

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN[^-]+-----/g, '')
    .replace(/-----END[^-]+-----/g, '')
    .replace(/\s+/g, '')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

async function signWithPrivateKey(message: string, privateKeyPem: string): Promise<string> {
  const keyData = pemToArrayBuffer(privateKeyPem)
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' },
    false,
    ['sign']
  )
  const encoded = new TextEncoder().encode(message)
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoded)
  const bytes = new Uint8Array(signature)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

async function loadPrivateKey(): Promise<string | null> {
  if (cachedPrivateKey) return cachedPrivateKey
  try {
    const res = await fetch('/qz/private-key.pem', { cache: 'no-store' })
    if (!res.ok) return null
    const text = await res.text()
    if (!text.includes('PRIVATE KEY')) return null
    cachedPrivateKey = text
    return text
  } catch {
    return null
  }
}

export async function configureQzSecurity(qz: NonNullable<Window['qz']>): Promise<boolean> {
  if (securityInitialized) return signingReady

  const privateKey = await loadPrivateKey()
  const hasSigning = Boolean(privateKey)

  qz.security.setCertificatePromise((resolve, reject) => {
    fetch(CERT_URL, { cache: 'no-store', headers: { 'Content-Type': 'text/plain' } })
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error('Sin certificado'))))
      .then((cert) => {
        if (!cert.trim() || cert.trimStart().startsWith('<!')) {
          reject(new Error('Certificado QZ invalido'))
          return
        }
        resolve(cert)
      })
      .catch(() => reject(new Error('Certificado QZ no encontrado en el servidor')))
  })

  if (hasSigning && privateKey) {
    qz.security.setSignatureAlgorithm('SHA512')
    qz.security.setSignaturePromise((toSign) => (resolve, reject) => {
      signWithPrivateKey(toSign, privateKey).then(resolve).catch(reject)
    })
    signingReady = true
  } else {
    signingReady = false
  }

  securityInitialized = true
  return signingReady
}

export function isQzSigningReady(): boolean {
  return signingReady
}

export async function getQzSetupStatus(): Promise<{
  certOnServer: boolean
  keyOnServer: boolean
  signed: boolean
}> {
  const [certRes, keyRes] = await Promise.all([
    fetch(CERT_URL, { cache: 'no-store' }).catch(() => null),
    fetch('/qz/private-key.pem', { cache: 'no-store' }).catch(() => null),
  ])
  const certOnServer = Boolean(certRes?.ok)
  const keyOnServer = Boolean(keyRes?.ok)
  return { certOnServer, keyOnServer, signed: certOnServer && keyOnServer }
}
