/**
 * Shared types + fetch helpers + display utilities for the rankings product.
 * Read-only — consumes the existing public API as-is.
 */
import { useEffect, useState } from 'react'

export const QUALIFY_CUTOFF = 32

export type FormResult = 'W' | 'L' | 'D'

export interface RankingEntry {
  rank: number
  previousRank: number | null
  rankMovement: number
  clubId: string
  clubName: string
  logoUrl?: string | null
  leagueName: string
  state: string
  powerRating: number
  record: { wins: number; losses: number; draws: number; played: number }
  goalsFor: number
  goalsAgainst: number
  percentage: number
  recentForm: FormResult[]
  componentScores: Record<string, number>
}

export interface RankingsResponse {
  data: RankingEntry[]
  meta: { weekLabel: string | null; season: string | null; total: number; generatedAt?: string }
}

export interface ClubProfile {
  clubId: string
  clubName: string
  leagueId: string | null
  leagueName: string | null
  state: string | null
  rank: number | null
  previousRank: number | null
  rankMovement: number
  powerRating: number | null
  ranked: boolean
  qualified: boolean
  qualifyCutoff: number
  record: { wins: number; losses: number; draws: number; played: number }
  goalsFor: number
  goalsAgainst: number
  percentage: number
  ladderPosition: number | null
  leagueStrengthScore: number | null
  leagueStrengthTier: number | null
  recentForm: FormResult[]
  componentScores: Record<string, number>
  weekLabel: string
  season: string
  history: { weekLabel: string; rank: number; powerRating: number; date: string }[]
  // Club identity + brand
  town?: string | null
  region?: string | null
  stateName?: string | null
  logoUrl?: string | null
  primaryColour?: string | null
  secondaryColour?: string | null
  websiteUrl?: string | null
  facebookUrl?: string | null
  instagramUrl?: string | null
  // Current league ladder (with this club marked)
  ladder?: {
    clubId: string; clubName: string; position: number | null; played: number; wins: number
    losses: number; draws: number; percentage: number; points: number; isThisClub: boolean
  }[]
}

export interface LeagueRankedTeam {
  clubId: string; clubName: string; rank: number; previousRank?: number | null; rankMovement?: number
  powerRating: number; state: string; recentForm?: FormResult[]; qualified: boolean
}

export interface LeagueDetail {
  id: string
  name: string
  state: string
  stateName?: string
  association?: string
  strengthScore: number
  strengthTier?: number
  strengthConfidence?: number | null
  strengthReasoning?: string | null
  strengthCalculatedAt?: string | null
  regionName?: string | null
  currentSeason?: string | null
  lastSyncedAt?: string | null
  logoUrl?: string | null
  primarySource?: string | null
  weekLabel?: string | null
  totalRanked?: number
  rankedTeams: LeagueRankedTeam[]
  ladder: {
    clubId: string; clubName: string; position: number | null; played: number; wins: number; losses: number
    draws: number; goalsFor: number; goalsAgainst: number; percentage: number; points: number
  }[]
}

export interface SearchResults {
  teams: { clubId: string; clubName: string; leagueName: string; state: string; rank: number }[]
  leagues: { id: string; name: string; strengthScore: number; state: string }[]
}

// ── fetch helpers ──────────────────────────────────────────────────────────
async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json() as Promise<T>
}

export const fetchRankings = () => getJson<RankingsResponse>('/api/rankings')
export const fetchTop = (n: 10 | 25 | 100) => getJson<RankingsResponse>(`/api/top${n}`)
export const fetchClub = (id: string) => getJson<{ data: ClubProfile }>(`/api/clubs/${id}`).then(r => r.data)
export const fetchLeague = (id: string) => getJson<{ data: LeagueDetail }>(`/api/leagues/${id}`).then(r => r.data)
export const fetchSearch = (q: string) => getJson<{ data: SearchResults }>(`/api/leagues/search/global?q=${encodeURIComponent(q)}`).then(r => r.data)

export interface ClubExplanation {
  clubId: string; clubName: string; rank: number; powerRating: number; weekLabel: string
  reasoning: string; componentScores: Record<string, number>
  league: { name: string; strength: number; confidence: number; reasoning: string | null; calculatedAt: string | null } | null
}
export const fetchClubExplain = (id: string) => getJson<{ data: ClubExplanation }>(`/api/rankings/explain/${id}`).then(r => r.data)

// ── generic hook ───────────────────────────────────────────────────────────
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    setLoading(true); setError(null)
    fn().then(d => { if (alive) setData(d) })
      .catch(e => { if (alive) setError(String(e)) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return { data, loading, error }
}

// ── display utils ──────────────────────────────────────────────────────────
/** League strength 0–100 score → 1–5 star rating. */
export const strengthStars = (score: number | null | undefined) =>
  Math.max(1, Math.min(5, Math.round((score ?? 60) / 20)))

export const strengthLabel = (stars: number) =>
  ['', 'Developing', 'Competitive', 'Strong', 'Elite', 'Premier'][stars] ?? 'Competitive'

export const teamPath = (clubId: string) => `/team/${clubId}`
export const leaguePath = (leagueId: string) => `/league/${leagueId}`

export const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}
