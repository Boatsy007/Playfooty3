/**
 * Prisma client singleton — safe for serverless (one instance per cold start).
 */

import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger.js'

declare global {
  // Prevent multiple instances in dev hot-reload
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

function createClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? [{ emit: 'event', level: 'query' }, 'warn', 'error']
      : ['warn', 'error'],
  })

  if (process.env.NODE_ENV === 'development') {
    // @ts-expect-error — prisma event typing
    client.$on('query', (e: { query: string; duration: number }) => {
      logger.debug('Prisma query', { query: e.query, durationMs: e.duration })
    })
  }

  return client
}

// Lazy singleton — not instantiated at import time so missing DATABASE_URL
// doesn't crash the whole serverless function before the request even starts.
let _prisma: PrismaClient | undefined

function getPrisma(): PrismaClient {
  if (!_prisma) {
    if (process.env.NODE_ENV === 'production') {
      _prisma = createClient()
    } else {
      globalThis.__prisma ??= createClient()
      _prisma = globalThis.__prisma
    }
  }
  return _prisma
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrisma() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
