/**
 * Australian-football scoring + ladder rules (Phase F1).
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure, sport-aware helpers. Football total = goals*6 + behinds (missing behinds
 * handled safely). Ladder percentage = pointsFor / pointsAgainst * 100 with a
 * safe divide-by-zero. Ladder sort is configurable per sport/league/grade but
 * defaults to the standard football order: points → percentage → points-for →
 * point difference → club name. Netball logic elsewhere is untouched.
 */

export const FOOTBALL_GOAL_POINTS = 6

/** Australian-football total score: goals*6 + behinds. Missing values → 0. */
export function footballTotal(goals: number | null | undefined, behinds: number | null | undefined): number {
  const g = Number.isFinite(goals as number) ? (goals as number) : 0
  const b = Number.isFinite(behinds as number) ? (behinds as number) : 0
  return g * FOOTBALL_GOAL_POINTS + b
}

/** Resolve a game's total points, preferring an explicit score, else goals/behinds. */
export function resolveScore(score: number | null | undefined, goals: number | null | undefined, behinds: number | null | undefined): number | null {
  if (Number.isFinite(score as number)) return score as number
  if (goals == null && behinds == null) return null
  return footballTotal(goals, behinds)
}

/** Safe ladder percentage: pointsFor / pointsAgainst * 100; against=0 handled. */
export function ladderPercentage(pointsFor: number, pointsAgainst: number): number {
  if (pointsAgainst > 0) return +((pointsFor / pointsAgainst) * 100).toFixed(2)
  return pointsFor > 0 ? 9999 : 0
}

export interface FootballLadderConfig { winPoints: number; drawPoints: number; lossPoints: number }
export const DEFAULT_FOOTBALL_LADDER: FootballLadderConfig = { winPoints: 4, drawPoints: 2, lossPoints: 0 }

export interface FootballStandingRow {
  clubId: string | null; clubName: string; position: number
  played: number; wins: number; losses: number; draws: number
  pointsFor: number; pointsAgainst: number; pointsDiff: number; percentage: number; points: number
}

type FbResult = { homeClubId: string | null; homeClubName: string; awayClubId: string | null; awayClubName: string; homePoints: number; awayPoints: number }

/**
 * Compute a football ladder from resolved point totals. Configurable ladder
 * points; standard multi-key sort. Pure and unit-testable.
 */
export function computeFootballLadder(results: FbResult[], cfg: FootballLadderConfig = DEFAULT_FOOTBALL_LADDER): FootballStandingRow[] {
  interface Acc { clubId: string | null; clubName: string; p: number; w: number; l: number; d: number; pf: number; pa: number }
  const acc = new Map<string, Acc>()
  const ensure = (id: string | null, name: string): Acc => { const key = id ?? name.toLowerCase(); let a = acc.get(key); if (!a) { a = { clubId: id, clubName: name, p: 0, w: 0, l: 0, d: 0, pf: 0, pa: 0 }; acc.set(key, a) } else if (name) a.clubName = name; return a }

  for (const r of results) {
    const home = ensure(r.homeClubId, r.homeClubName), away = ensure(r.awayClubId, r.awayClubName)
    home.p++; away.p++; home.pf += r.homePoints; home.pa += r.awayPoints; away.pf += r.awayPoints; away.pa += r.homePoints
    if (r.homePoints === r.awayPoints) { home.d++; away.d++ }
    else if (r.homePoints > r.awayPoints) { home.w++; away.l++ }
    else { away.w++; home.l++ }
  }

  const rows: FootballStandingRow[] = [...acc.values()].map(a => ({
    clubId: a.clubId, clubName: a.clubName, position: 0, played: a.p, wins: a.w, losses: a.l, draws: a.d,
    pointsFor: a.pf, pointsAgainst: a.pa, pointsDiff: a.pf - a.pa, percentage: ladderPercentage(a.pf, a.pa),
    points: a.w * cfg.winPoints + a.d * cfg.drawPoints + a.l * cfg.lossPoints,
  }))
  rows.sort((a, b) => b.points - a.points || b.percentage - a.percentage || b.pointsFor - a.pointsFor || b.pointsDiff - a.pointsDiff || a.clubName.localeCompare(b.clubName))
  rows.forEach((r, i) => { r.position = i + 1 })
  return rows
}
