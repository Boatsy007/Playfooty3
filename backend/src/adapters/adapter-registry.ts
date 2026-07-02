/**
 * Adapter Registry
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for all registered data adapters.
 * The scraper engine imports from here — never directly from adapter files.
 *
 * To register a new adapter:
 * 1. Create your adapter in /adapters/
 * 2. Import it here and add it to ADAPTER_MAP
 * That's the only change needed.
 */

import type { DataSourceType } from '../types/index.js'
import type { BaseAdapter } from './base.adapter.js'
import { PlayHQAdapter }         from './playhq.adapter.js'
import { NetballConnectAdapter } from './netball-connect.adapter.js'
import { CSVAdapter }            from './csv.adapter.js'
import { ManualAdapter }         from './manual.adapter.js'

// Singletons — one instance per adapter type across the whole process
const ADAPTER_MAP = new Map<DataSourceType, BaseAdapter>([
  ['PLAYHQ',         new PlayHQAdapter()],
  ['NETBALL_CONNECT', new NetballConnectAdapter()],
  ['CSV_IMPORT',     new CSVAdapter()],
  ['MANUAL_ENTRY',   new ManualAdapter()],
])

/** Get a registered adapter by source type. Returns undefined if not found. */
export function getAdapter(sourceType: DataSourceType): BaseAdapter | undefined {
  return ADAPTER_MAP.get(sourceType)
}

/** All registered adapters in priority order (highest trust first). */
export function getAllAdapters(): BaseAdapter[] {
  return [
    ADAPTER_MAP.get('CSV_IMPORT')!,      // highest trust
    ADAPTER_MAP.get('MANUAL_ENTRY')!,    // admin-entered
    ADAPTER_MAP.get('PLAYHQ')!,          // scraped
    ADAPTER_MAP.get('NETBALL_CONNECT')!, // scraped
  ].filter(Boolean)
}

/** Adapters that scrape live URLs (exclude CSV/Manual which don't fetch). */
export function getScrapingAdapters(): BaseAdapter[] {
  return [
    ADAPTER_MAP.get('PLAYHQ')!,
    ADAPTER_MAP.get('NETBALL_CONNECT')!,
  ].filter(Boolean)
}

/** Ping all adapters and return health status. */
export async function pingAllAdapters(): Promise<Record<DataSourceType, boolean>> {
  const results: Partial<Record<DataSourceType, boolean>> = {}

  await Promise.allSettled(
    Array.from(ADAPTER_MAP.entries()).map(async ([type, adapter]) => {
      results[type] = await adapter.ping().catch(() => false)
    }),
  )

  return results as Record<DataSourceType, boolean>
}
