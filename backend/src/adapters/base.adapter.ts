/**
 * Base Data Adapter
 * ─────────────────────────────────────────────────────────────────────────────
 * All data adapters extend this class. The abstract interface guarantees
 * the ranking engine never cares where data came from.
 *
 * To add a new data source:
 * 1. Create a new file in /adapters/
 * 2. Extend BaseAdapter
 * 3. Implement collectLadders() and collectMatches()
 * 4. Register in adapter-registry.ts
 * That's it — no changes to the ranking engine.
 */

import type {
  DataAdapter,
  DataSourceType,
  AdapterResult,
  AdapterError,
  RawLadder,
  RawMatch,
  LeagueSourceUrl,
} from '../types/index.js'
import { logger } from '../utils/logger.js'

export abstract class BaseAdapter implements DataAdapter {
  abstract readonly name: string
  abstract readonly sourceType: DataSourceType
  abstract readonly description: string

  protected readonly requestDelayMs: number
  protected readonly maxRetries: number
  protected readonly timeoutMs: number

  constructor(options?: {
    requestDelayMs?: number
    maxRetries?: number
    timeoutMs?: number
  }) {
    this.requestDelayMs = options?.requestDelayMs ?? 1000   // 1s between requests — be respectful
    this.maxRetries     = options?.maxRetries     ?? 3
    this.timeoutMs      = options?.timeoutMs      ?? 15000
  }

  abstract ping(): Promise<boolean>
  abstract collectLadders(leagues: LeagueSourceUrl[]): Promise<AdapterResult<RawLadder[]>>
  abstract collectMatches(leagues: LeagueSourceUrl[]): Promise<AdapterResult<RawMatch[]>>

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  protected async withRetry<T>(
    fn: () => Promise<T>,
    context: string,
    retries = this.maxRetries,
  ): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn()
      } catch (err) {
        const isLast = attempt === retries
        logger.warn(`${this.name}: attempt ${attempt}/${retries} failed for ${context}`, {
          error: err instanceof Error ? err.message : String(err),
        })
        if (isLast) throw err
        await this.delay(this.requestDelayMs * attempt)  // exponential backoff
      }
    }
    throw new Error(`${this.name}: exhausted retries for ${context}`)
  }

  protected makeResult<T>(
    data: T,
    errors: AdapterError[],
    startMs: number,
  ): AdapterResult<T> {
    const status = errors.length === 0
      ? 'SUCCESS'
      : Array.isArray(data) && (data as unknown[]).length > 0
        ? 'PARTIAL'
        : 'FAILED'

    return {
      status,
      data,
      errors,
      processedAt:  new Date().toISOString(),
      sourceType:   this.sourceType,
      durationMs:   Date.now() - startMs,
    }
  }

  protected makeError(
    message: string,
    retryable: boolean,
    context?: { leagueId?: string; sourceUrl?: string },
  ): AdapterError {
    return {
      ...context,
      message,
      retryable,
      occurredAt: new Date().toISOString(),
    }
  }
}
