/**
 * Admin authentication middleware.
 * Uses a Bearer token stored in the ADMIN_API_KEY env variable.
 * Replace with Supabase Auth in a production multi-user setup.
 */

import type { Request, Response, NextFunction } from 'express'

export function requireAdminKey(req: Request, res: Response, next: NextFunction): void {
  const key = process.env.ADMIN_API_KEY
  if (!key) {
    res.status(500).json({ error: 'ADMIN_API_KEY not configured' })
    return
  }

  const auth = req.headers.authorization ?? ''
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : ''

  if (provided !== key) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  next()
}
