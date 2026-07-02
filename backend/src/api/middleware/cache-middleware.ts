/**
 * HTTP cache headers middleware.
 * Sets Cache-Control headers so Vercel Edge and CDNs cache public responses.
 */

import type { Request, Response, NextFunction } from 'express'

/** Cache public API responses for 10 minutes at the edge. */
export function cachePublic(maxAgeSeconds = 600) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('Cache-Control', `public, s-maxage=${maxAgeSeconds}, stale-while-revalidate=60`)
    next()
  }
}

/** Never cache admin or mutation responses. */
export function noCache(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Cache-Control', 'no-store')
  next()
}
