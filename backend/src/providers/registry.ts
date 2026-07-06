/**
 * Competition provider registry (Phase F1).
 * ─────────────────────────────────────────────────────────────────────────────
 * Single lookup for source-agnostic competition data providers. The ingestion
 * engine resolves a provider by name here; adding a future source is one line.
 */

import type { CompetitionDataProvider } from './competition-provider.js'
import { PlayHQProvider } from './playhq/playhq.provider.js'

const PROVIDERS = new Map<string, CompetitionDataProvider>([
  ['PLAYHQ', new PlayHQProvider()],
])

export function getProvider(name = 'PLAYHQ'): CompetitionDataProvider | undefined {
  return PROVIDERS.get(name.toUpperCase())
}

export function getPlayhqProvider(): CompetitionDataProvider {
  return PROVIDERS.get('PLAYHQ')!
}
