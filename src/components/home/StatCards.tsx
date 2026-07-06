/**
 * By the Numbers: premium stat cards derived from live rankings + leagues data.
 * The framework (StatCard) is deliberately generic so future statistics slot in
 * without redesign. Layout is a 3/2 editorial split, not an equal grid.
 */
import { Link } from 'react-router-dom'
import { Trophy, Flame, Zap, ShieldCheck, RefreshCcw } from 'lucide-react'
import { teamPath, leaguePath, strengthStars, strengthLabel, type RankingEntry } from '../../lib/rankings'
import { TeamLogo, StarStrength } from '../rankings/bits'
import { Section, SectionHead, Reveal, Skel, TEXT, MUTE, FAINT, LINE, PINK, GOLD_DK, UP, CYANISH } from './ui'
import type { LeagueRow } from './useHomeData'

interface Stat {
  key: string
  kicker: string
  icon: React.ReactNode
  title: string
  detail: string
  to: string
  crest?: string
  big?: React.ReactNode
  accent: string
}

export default function StatCards({ entries, leagues, strongestLeague, biggestClimber, bestForm, recentLeagues, weekLabel, loading }: {
  entries: RankingEntry[]; leagues: LeagueRow[]; strongestLeague: LeagueRow | null
  biggestClimber: RankingEntry | null; bestForm: RankingEntry | null; recentLeagues: LeagueRow[]
  weekLabel: string | null; loading: boolean
}) {
  const one = entries[0] ?? null
  const newest = recentLeagues[0] ?? null

  const stats: Stat[] = []
  if (one) stats.push({
    key: 'no1', kicker: 'Highest ranked club', icon: <Trophy size={15} aria-hidden />, accent: GOLD_DK,
    title: one.clubName, detail: `Rating ${one.powerRating.toFixed(1)} · ${one.leagueName}`, to: teamPath(one.clubId), crest: one.clubName,
  })
  if (strongestLeague) stats.push({
    key: 'league', kicker: 'Strongest league', icon: <ShieldCheck size={15} aria-hidden />, accent: CYANISH,
    title: strongestLeague.name, detail: `${strengthLabel(strengthStars(strongestLeague.strengthScore))} · ${strongestLeague.clubCount} clubs · ${strongestLeague.state}`,
    to: leaguePath(strongestLeague.id),
    big: <StarStrength stars={strengthStars(strongestLeague.strengthScore)} size={13} />,
  })
  if (biggestClimber) stats.push({
    key: 'climber', kicker: 'Biggest climber', icon: <Zap size={15} aria-hidden />, accent: UP,
    title: biggestClimber.clubName, detail: `Up ${biggestClimber.rankMovement} places to #${biggestClimber.rank}`, to: teamPath(biggestClimber.clubId), crest: biggestClimber.clubName,
  })
  if (bestForm) stats.push({
    key: 'form', kicker: 'Most improved form', icon: <Flame size={15} aria-hidden />, accent: PINK,
    title: bestForm.clubName, detail: `${bestForm.recentForm.filter(f => f === 'W').length} of last ${bestForm.recentForm.length} won · #${bestForm.rank} nationally`, to: teamPath(bestForm.clubId), crest: bestForm.clubName,
  })
  if (newest) stats.push({
    key: 'updated', kicker: 'Most recently updated', icon: <RefreshCcw size={15} aria-hidden />, accent: MUTE,
    title: newest.name, detail: newest.lastSyncedAt ? `Refreshed ${new Date(newest.lastSyncedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} · ${newest.state}` : newest.state,
    to: leaguePath(newest.id),
  })

  if (!loading && stats.length === 0) return null

  return (
    <Section>
      <SectionHead
        title={<>BY THE <span style={{ color: PINK }}>NUMBERS</span></>}
        sub={weekLabel ? `The state of Community Football, ${weekLabel}.` : 'The state of Community Football this week.'}
      />

      <div className="stat-grid" style={{ display: 'grid', gap: 16 }}>
        {loading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="gn-card" style={{ padding: 22 }}>
            <Skel w="45%" h={11} style={{ marginBottom: 16 }} />
            <Skel w="75%" h={20} style={{ marginBottom: 9 }} />
            <Skel w="55%" h={12} />
          </div>
        ))}
        {!loading && stats.map((s, i) => (
          <Reveal key={s.key} delay={i * 0.05}>
            <Link to={s.to} className="gn-card gn-card-hover" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '20px 22px', textDecoration: 'none', color: TEXT, height: '100%' }}>
              <span className="font-condensed" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: s.accent }}>
                {s.icon} {s.kicker}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                {s.crest && <TeamLogo name={s.crest} size={38} />}
                <span className="font-display" style={{ fontSize: 'clamp(1.15rem, 2vw, 1.45rem)', lineHeight: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.title.toUpperCase()}
                </span>
              </span>
              {s.big}
              <span className="font-condensed" style={{ color: MUTE, fontSize: 12.5, marginTop: 'auto', borderTop: `1px solid ${LINE}`, paddingTop: 10, letterSpacing: '0.03em' }}>{s.detail}</span>
            </Link>
          </Reveal>
        ))}
      </div>

      {!loading && (
        <Reveal delay={0.2}>
          <p className="font-condensed" style={{ color: FAINT, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '16px 0 0' }}>
            Tracking {leagues.length} leagues and {entries.length} ranked clubs nationally
          </p>
        </Reveal>
      )}

      <style>{`
        .stat-grid { grid-template-columns: repeat(6, 1fr); }
        .stat-grid > *:nth-child(-n+2) { grid-column: span 3; }
        .stat-grid > *:nth-child(n+3) { grid-column: span 2; }
        @media (max-width: 900px) { .stat-grid > * { grid-column: span 3 !important; } }
        @media (max-width: 560px) { .stat-grid > * { grid-column: span 6 !important; } }
      `}</style>
    </Section>
  )
}
