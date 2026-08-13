import { Redis } from '@upstash/redis'

declare global {
  // eslint-disable-next-line no-var
  var __upstashRedis: Redis | undefined
}

export const redis =
  globalThis.__upstashRedis ??
  new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__upstashRedis = redis
}
