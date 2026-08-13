import { createHmac, timingSafeEqual } from 'crypto'

function getSecret() {
  return process.env.SESSION_SECRET ?? ''
}

export const VISITOR_COOKIE = 'orbital_access'
export const ADMIN_COOKIE = 'orbital_admin'

export type VisitorPayload = {
  keyId: string
  level: 'limited' | 'full'
  exp: number
}

export type AdminPayload = {
  admin: true
  exp: number
}

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString('base64url')
}

function sign(payloadB64: string) {
  return createHmac('sha256', getSecret()).update(payloadB64).digest('base64url')
}

export function createToken(payload: VisitorPayload | AdminPayload) {
  const payloadB64 = base64url(JSON.stringify(payload))
  const signature = sign(payloadB64)
  return `${payloadB64}.${signature}`
}

export function verifyToken<T extends VisitorPayload | AdminPayload>(
  token: string | undefined | null
): T | null {
  if (!token) return null
  const [payloadB64, signature] = token.split('.')
  if (!payloadB64 || !signature) return null
  const expected = sign(payloadB64)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as T
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function timingSafeEqualString(a: string, b: string) {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
