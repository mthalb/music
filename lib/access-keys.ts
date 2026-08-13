import { randomBytes, randomUUID } from 'crypto'
import { redis } from './redis'

export type AccessLevel = 'none' | 'limited' | 'full'

export type AccessKey = {
  id: string
  key_value: string
  label: string
  access_level: AccessLevel
  is_active: boolean
  expires_at: string | null
  created_at: string
  last_used_at: string | null
}

const INDEX_KEY = 'access_keys:index' // sorted set: score = created_at ms, member = id
const keyHash = (id: string) => `access_key:${id}`
const valueLookupKey = (keyValue: string) => `access_key_by_value:${keyValue}`

export function generateKeyValue() {
  return `orb_${randomBytes(18).toString('base64url')}`
}

function serialize(key: AccessKey): Record<string, string> {
  return {
    id: key.id,
    key_value: key.key_value,
    label: key.label,
    access_level: key.access_level,
    is_active: String(key.is_active),
    expires_at: key.expires_at ?? '',
    created_at: key.created_at,
    last_used_at: key.last_used_at ?? '',
  }
}

function deserialize(raw: Record<string, unknown> | null): AccessKey | null {
  if (!raw || !raw.id) return null
  return {
    id: String(raw.id),
    key_value: String(raw.key_value ?? ''),
    label: String(raw.label ?? ''),
    access_level: (raw.access_level as AccessLevel) ?? 'limited',
    is_active: String(raw.is_active) === 'true',
    expires_at: raw.expires_at ? String(raw.expires_at) : null,
    created_at: String(raw.created_at ?? new Date(0).toISOString()),
    last_used_at: raw.last_used_at ? String(raw.last_used_at) : null,
  }
}

export async function listKeys(): Promise<AccessKey[]> {
  const ids = await redis.zrange<string[]>(INDEX_KEY, 0, -1, { rev: true })
  if (ids.length === 0) return []
  const pipeline = redis.pipeline()
  for (const id of ids) {
    pipeline.hgetall(keyHash(id))
  }
  const results = await pipeline.exec<Record<string, unknown>[]>()
  return results.map((raw) => deserialize(raw)).filter((key): key is AccessKey => key !== null)
}

export async function createKey(input: {
  label: string
  access_level: AccessLevel
  expires_at: string | null
}): Promise<AccessKey> {
  const id = randomUUID()
  const keyValue = generateKeyValue()
  const createdAt = new Date().toISOString()

  const key: AccessKey = {
    id,
    key_value: keyValue,
    label: input.label,
    access_level: input.access_level,
    is_active: true,
    expires_at: input.expires_at,
    created_at: createdAt,
    last_used_at: null,
  }

  const pipeline = redis.pipeline()
  pipeline.hset(keyHash(id), serialize(key))
  pipeline.zadd(INDEX_KEY, { score: Date.parse(createdAt), member: id })
  pipeline.set(valueLookupKey(keyValue), id)
  await pipeline.exec()

  return key
}

export async function updateKey(
  id: string,
  input: Partial<{
    label: string
    access_level: AccessLevel
    is_active: boolean
    expires_at: string | null
  }>
): Promise<AccessKey | null> {
  const existing = await findKeyById(id)
  if (!existing) return null

  const updated: AccessKey = {
    ...existing,
    ...input,
  }

  await redis.hset(keyHash(id), serialize(updated))
  return updated
}

export async function deleteKey(id: string): Promise<void> {
  const existing = await findKeyById(id)
  const pipeline = redis.pipeline()
  pipeline.del(keyHash(id))
  pipeline.zrem(INDEX_KEY, id)
  if (existing) {
    pipeline.del(valueLookupKey(existing.key_value))
  }
  await pipeline.exec()
}

export async function findKeyByValue(keyValue: string): Promise<AccessKey | null> {
  const id = await redis.get<string>(valueLookupKey(keyValue))
  if (!id) return null
  return findKeyById(id)
}

export async function findKeyById(id: string): Promise<AccessKey | null> {
  const raw = await redis.hgetall<Record<string, unknown>>(keyHash(id))
  return deserialize(raw)
}

export async function touchKey(id: string): Promise<void> {
  await redis.hset(keyHash(id), { last_used_at: new Date().toISOString() })
}

export function isKeyCurrentlyValid(key: AccessKey): boolean {
  if (!key.is_active) return false
  if (key.access_level === 'none') return false
  if (key.expires_at && new Date(key.expires_at).getTime() < Date.now()) return false
  return true
}

// ---------- Self-service "request a key" settings ----------

const REQUEST_TTL_SETTING_KEY = 'settings:request_key_ttl_minutes'
const REQUEST_COOLDOWN_SETTING_KEY = 'settings:request_key_cooldown_seconds'
export const DEFAULT_REQUEST_KEY_TTL_MINUTES = 30
export const DEFAULT_REQUEST_KEY_COOLDOWN_SECONDS = 20

export async function getRequestKeyTtlMinutes(): Promise<number> {
  const value = await redis.get<string | number>(REQUEST_TTL_SETTING_KEY)
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REQUEST_KEY_TTL_MINUTES
}

export async function setRequestKeyTtlMinutes(minutes: number): Promise<number> {
  const safe = Math.max(1, Math.round(minutes))
  await redis.set(REQUEST_TTL_SETTING_KEY, safe)
  return safe
}

export async function getRequestKeyCooldownSeconds(): Promise<number> {
  const value = await redis.get<string | number>(REQUEST_COOLDOWN_SETTING_KEY)
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_REQUEST_KEY_COOLDOWN_SECONDS
}

export async function setRequestKeyCooldownSeconds(seconds: number): Promise<number> {
  const safe = Math.max(0, Math.round(seconds))
  await redis.set(REQUEST_COOLDOWN_SETTING_KEY, safe)
  return safe
}
