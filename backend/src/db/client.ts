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

export const prisma: PrismaClient =
  process.env.NODE_ENV === 'production'
    ? createClient()
    : (globalThis.__prisma ??= createClient())
