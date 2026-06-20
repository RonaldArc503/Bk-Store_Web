const CERT_URL = '/qz/digital-certificate.txt'
const KEY_URL = '/qz/private-key.pem'

let securityConfigured = false
let signingReady = false

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

export async function configureQzSecurity(qz: NonNullable<Window['qz']>): Promise<boolean> {
  if (securityConfigured) return signingReady

  try {
    const [certRes, keyRes] = await Promise.all([
      fetch(CERT_URL, { cache: 'no-store' }),
      fetch(KEY_URL, { cache: 'no-store' }),
    ])

    if (!certRes.ok || !keyRes.ok) {
      securityConfigured = true
      signingReady = false
      return false
    }

    const certificate = await certRes.text()
    const privateKey = await keyRes.text()

    if (!certificate.trim() || !privateKey.includes('PRIVATE KEY')) {
      securityConfigured = true
      signingReady = false
      return false
    }

    qz.security.setCertificatePromise((resolve, reject) => {
      resolve(certificate)
      reject(new Error('Certificado QZ no disponible'))
    })

    qz.security.setSignatureAlgorithm('SHA512')
    qz.security.setSignaturePromise((toSign) => (resolve, reject) => {
      signWithPrivateKey(toSign, privateKey).then(resolve).catch(reject)
    })

    securityConfigured = true
    signingReady = true
    return true
  } catch {
    securityConfigured = true
    signingReady = false
    return false
  }
}

export function isQzSigningReady(): boolean {
  return signingReady
}
