/**
 * One data pass for the whole homepage. Two requests (rankings + leagues),
 * everything else derived, so ten sections never mean ten fetches.
 */
import { useAsync, fetchRankings, type RankingEntry, type RankingsResponse } from '../../lib/rankings'

export interface LeagueRow {
  id: string; name: string; state: string; stateName: string
  strengthScore: number; clubCount: number; lastSyncedAt?: string | null
}

const fetchLeagues = () =>
  fetch('/api/leagues').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<{ data: LeagueRow[] }> }).then(r => r.data)

export interface HomeData {
  loading: boolean
  entries: RankingEntry[]
  weekLabel: string | null
  generatedAt: string | null
  leagues: LeagueRow[]
  risers: RankingEntry[]
  fallers: RankingEntry[]
  strongestLeague: LeagueRow | null
  featuredClub: RankingEntry | null
  biggestClimber: RankingEntry | null
  bestForm: RankingEntry | null
  recentLeagues: LeagueRow[]
}

export function useHomeData(): HomeData {
  const rk = useAsync<RankingsResponse>(fetchRankings, [])
  const lg = useAsync<LeagueRow[]>(fetchLeagues, [])

  const entries = rk.data?.data ?? []
  const leagues = (lg.data ?? []).filter(l => l.clubCount > 0)

  const moved = entries.filter(e => e.previousRank != null && e.rankMovement !== 0)
  const risers  = [...moved].filter(e => e.rankMovement > 0).sort((a, b) => b.rankMovement - a.rankMovement).slice(0, 5)
  const fallers = [...moved].filter(e => e.rankMovement < 0).sort((a, b) => a.rankMovement - b.rankMovement).slice(0, 5)

  const strongestLeague = leagues.length ? [...leagues].sort((a, b) => b.strengthScore - a.strengthScore)[0] : null
  const featuredClub = entries[0] ?? null
  const biggestClimber = risers[0] ?? null
  const wins = (e: RankingEntry) => e.recentForm.filter(f => f === 'W').length
  const bestForm = entries.length
    ? [...entries].filter(e => e.recentForm.length >= 3).sort((a, b) => wins(b) - wins(a) || a.rank - b.rank)[0] ?? null
    : null
  const recentLeagues = [...leagues]
    .filter(l => l.lastSyncedAt)
    .sort((a, b) => +new Date(b.lastSyncedAt!) - +new Date(a.lastSyncedAt!))
    .slice(0, 6)

  return {
    loading: rk.loading || lg.loading,
    entries,
    weekLabel: rk.data?.meta?.weekLabel ?? null,
    generatedAt: rk.data?.meta?.generatedAt ?? null,
    leagues,
    risers, fallers,
    strongestLeague, featuredClub, biggestClimber, bestForm,
    recentLeagues: recentLeagues.length ? recentLeagues : leagues.slice(0, 6),
  }
}
