/**
 * Admin Settings API
 * ─────────────────────────────────────────────────────────────────────────────
 * GET  /admin/settings/weights         — current ranking weights
 * PUT  /admin/settings/weights         — update ranking weights
 * GET  /admin/settings/leagues         — league strength scores
 * PUT  /admin/settings/leagues/:id     — update a league's strength score
 * POST /admin/settings/leagues         — add a new league source
 */

import { Router }          from 'express'
import { prisma }          from '../db/client.js'
import { requireAdminKey } from '../api/middleware/auth.js'
import { adminRateLimit }  from '../api/middleware/rate-limit.js'
import { noCache }         from '../api/middleware/cache-middleware.js'
import { DEFAULT_WEIGHTS } from '../types/index.js'
import { logger }          from '../utils/logger.js'

const router = Router()
router.use(requireAdminKey, adminRateLimit, noCache)

// GET /admin/settings/weights
router.get('/weights', async (_req, res) => {
  try {
    const config = await prisma.rankingConfig.findFirst({
      where:   { isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    const weights = config?.weights
      ? JSON.parse(config.weights as string)
      : DEFAULT_WEIGHTS

    res.json({ data: weights, configId: config?.id ?? null, isDefault: !config })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /admin/settings/weights
router.put('/weights', async (req, res) => {
  try {
    const weights = req.body as Record<string, number>

    const sum = Object.values(weights).reduce((a, b) => a + b, 0)
    if (Math.abs(sum - 1.0) > 0.01) {
      return res.status(400).json({ error: `Weights must sum to 1.0 (got ${sum.toFixed(4)})` })
    }

    // Deactivate previous config
    await prisma.rankingConfig.updateMany({ where: { isActive: true }, data: { isActive: false } })

    // Insert new
    const config = await prisma.rankingConfig.create({
      data: {
        weights:  JSON.stringify(weights),
        isActive: true,
        label:    `Manual update ${new Date().toISOString()}`,
      },
    })

    logger.info('AdminSettings: ranking weights updated', { configId: config.id, weights })
    res.json({ data: weights, configId: config.id })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /admin/settings/leagues
router.get('/leagues', async (_req, res) => {
  try {
    const leagues = await prisma.league.findMany({
      include: {
        state:   { select: { code: true } },
        sources: { select: { id: true, sourceType: true, ladderUrl: true, fixturesUrl: true, isActive: true } },
      },
      orderBy: [{ state: { name: 'asc' } }, { name: 'asc' }],
    })

    res.json({ data: leagues })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /admin/settings/leagues/:id
router.put('/leagues/:id', async (req, res) => {
  try {
    const { strengthScore, name, isActive } = req.body as {
      strengthScore?: number
      name?: string
      isActive?: boolean
    }

    if (strengthScore !== undefined && (strengthScore < 0 || strengthScore > 100)) {
      return res.status(400).json({ error: 'strengthScore must be 0–100' })
    }

    const updated = await prisma.league.update({
      where: { id: req.params.id },
      data: {
        ...(strengthScore !== undefined ? { strengthScore } : {}),
        ...(name          !== undefined ? { name }          : {}),
        ...(isActive      !== undefined ? { isActive }      : {}),
      },
    })

    res.json({ data: updated })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /admin/settings/leagues
router.post('/leagues', async (req, res) => {
  try {
    const { leagueId, sourceType, ladderUrl, fixturesUrl } = req.body as {
      leagueId:    string
      sourceType:  string
      ladderUrl?:  string
      fixturesUrl?: string
    }

    const source = await prisma.leagueSource.create({
      data: {
        leagueId,
        sourceType,
        ladderUrl:   ladderUrl   ?? null,
        fixturesUrl: fixturesUrl ?? null,
        isActive:    true,
      },
    })

    res.status(201).json({ data: source })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export { router as adminSettingsRouter }
