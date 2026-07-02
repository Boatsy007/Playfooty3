/**
 * Simple in-process TTL cache.
 * For production, swap the backing store for Redis (Upstash) — the interface
 * is identical; only the constructor changes.
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export class TTLCache<T = unknown> {
  private store = new Map<string, CacheEntry<T>>()

  constructor(private defaultTtlMs: number = 5 * 60 * 1000) {}

  set(key: string, value: T, ttlMs?: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    })
  }

  get(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.value
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  /** Remove all expired entries — call periodically in long-running processes. */
  purgeExpired(): number {
    const now = Date.now()
    let purged = 0
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key)
        purged++
      }
    }
    return purged
  }
}

// Shared singleton caches — tune TTLs per environment
export const rankingsCache   = new TTLCache(10 * 60 * 1000)   // 10 min
export const leagueCache     = new TTLCache(60 * 60 * 1000)   // 1 hr
export const clubCache       = new TTLCache(30 * 60 * 1000)   // 30 min
