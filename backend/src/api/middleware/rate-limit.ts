/**
 * Simple in-process rate limiter (per-IP sliding window).
 * Good enough for a low-traffic public API. Swap for Redis-backed
 * rate limiting if traffic grows significantly.
 */

import type { Request, Response, NextFunction } from 'express'

interface RateWindow {
  count: number
  resetAt: number
}

const windows = new Map<string, RateWindow>()

const WINDOW_MS  = 60_000   // 1 minute
const MAX_PUBLIC = 60       // 60 req/min for public endpoints
const MAX_ADMIN  = 300      // 300 req/min for admin endpoints

function getIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string ?? req.socket.remoteAddress ?? 'unknown').split(',')[0].trim()
}

function createLimiter(maxRequests: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip  = getIp(req)
    const now = Date.now()
    const win = windows.get(ip)

    if (!win || now > win.resetAt) {
      windows.set(ip, { count: 1, resetAt: now + WINDOW_MS })
      next()
      return
    }

    if (win.count >= maxRequests) {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((win.resetAt - now) / 1000),
      })
      return
    }

    win.count++
    next()
  }
}

export const publicRateLimit = createLimiter(MAX_PUBLIC)
export const adminRateLimit  = createLimiter(MAX_ADMIN)

// Purge stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [ip, win] of windows.entries()) {
    if (now > win.resetAt) windows.delete(ip)
  }
}, 5 * 60_000)
