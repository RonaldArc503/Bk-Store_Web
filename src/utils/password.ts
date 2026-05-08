/**
 * Password hashing helpers (client-side).
 * Uses PBKDF2-SHA-256 with per-user salt.
 */

const DEFAULT_ITERATIONS = 100000
const SALT_LENGTH_BYTES = 16
const HASH_ALGORITHM = 'PBKDF2-SHA-256' as const

const toHex = (input: ArrayBuffer | Uint8Array): string => {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const fromHex = (hex: string): Uint8Array => {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex salt length')
  }
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

export type PasswordHashResult = {
  hash: string
  salt: string
  iterations: number
  algorithm: typeof HASH_ALGORITHM
}

export async function hashPassword(
  password: string,
  saltHex?: string,
  iterations: number = DEFAULT_ITERATIONS
): Promise<PasswordHashResult> {
  if (!crypto?.subtle || !crypto?.getRandomValues) {
    throw new Error('Web Crypto API is not available')
  }

  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )

  const saltRaw = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES))
  const saltBuffer = new ArrayBuffer(saltRaw.byteLength)
  const salt = new Uint8Array(saltBuffer)
  salt.set(saltRaw)

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  )

  return {
    hash: toHex(derivedBits),
    salt: toHex(salt),
    iterations,
    algorithm: HASH_ALGORITHM,
  }
}

export async function verifyPassword(
  password: string,
  expectedHash: string,
  saltHex: string,
  iterations: number
): Promise<boolean> {
  const derived = await hashPassword(password, saltHex, iterations)
  return derived.hash === expectedHash
}
