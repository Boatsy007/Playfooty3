/**
 * Backend search index builder (Phase B3).
 * ─────────────────────────────────────────────────────────────────────────────
 * Flattens articles, clubs and leagues into SearchDoc rows so a future search
 * feature has an index to query. No frontend. Idempotent (unique per entity).
 */

import { prisma } from '../db/client.js'
import { logger } from '../utils/logger.js'

type Block = { type: string; text: string }
const flatten = (bodyJson: string): string => { try { return (JSON.parse(bodyJson) as Block[]).map(b => b.text).join(' ') } catch { return '' } }

export interface IndexReport { articles: number; clubs: number; leagues: number }

async function upsertDoc(entityType: string, entityId: string, title: string, body: string, state: string | null, weight: number, tags?: unknown) {
  await prisma.searchDoc.upsert({
    where: { entityType_entityId: { entityType, entityId } },
    create: { entityType, entityId, title, body: body.slice(0, 8000), state, weight, tags: tags ? JSON.stringify(tags) : null },
    update: { title, body: body.slice(0, 8000), state, weight, tags: tags ? JSON.stringify(tags) : null },
  })
}

/** Rebuild the search index for published/draft articles, clubs and leagues. */
export async function rebuildSearchIndex(): Promise<IndexReport> {
  const [articles, clubs, leagues] = await Promise.all([
    prisma.generatedArticle.findMany({ where: { status: { in: ['DRAFT', 'APPROVED', 'PUBLISHED'] } }, take: 2000 }),
    prisma.club.findMany({ where: { archivedAt: null }, select: { id: true, name: true, region: true, townName: true, stateId: true, state: { select: { code: true } } }, take: 20000 }),
    prisma.league.findMany({ where: { isActive: true, archivedAt: null }, select: { id: true, name: true, state: { select: { code: true } } }, take: 2000 }),
  ])

  for (const art of articles) {
    const weight = art.status === 'PUBLISHED' ? 2 : 1
    await upsertDoc('ARTICLE', art.id, art.title, `${art.summary} ${flatten(art.body)}`, null, weight, art.tags ? safeJson(art.tags) : undefined)
  }
  for (const c of clubs) {
    await upsertDoc('CLUB', c.id, c.name, [c.name, c.townName, c.region, c.state?.code].filter(Boolean).join(' '), c.state?.code ?? null, 1.5)
  }
  for (const l of leagues) {
    await upsertDoc('LEAGUE', l.id, l.name, `${l.name} ${l.state?.code ?? ''}`.trim(), l.state?.code ?? null, 1.5)
  }

  const report = { articles: articles.length, clubs: clubs.length, leagues: leagues.length }
  logger.info('Newsroom search index rebuilt', report)
  return report
}

function safeJson(s: string): unknown { try { return JSON.parse(s) } catch { return undefined } }
