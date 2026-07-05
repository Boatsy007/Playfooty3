/**
 * League page sections (Phase 3). Built entirely from the Phase 2 design
 * system: one card, one section rhythm, one motion vocabulary. Every module
 * derives its numbers from live API data; nothing is invented.
 */
import { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Search, ChevronRight, Trophy, Flame, Zap, ShieldCheck, Percent } from 'lucide-react'
import { teamPath, leaguePath, strengthStars, strengthLabel, type LeagueDetail, type LeagueRankedTeam, type FormResult } from '../../lib/rankings'
import { TeamLogo, FormPips, StarStrength } from '../rankings/bits'
import { Section, SectionHead, Reveal, Tag, EASE, TEXT, MUTE, FAINT, LINE, PINK, GOLD, GOLD_DK, UP, CYANISH } from '../home/ui'
import { loadPublished, allArticles, categoryOf, formatDate, newsPath, type Article } from '../../news/content'
import { EditorialImage } from '../../news/components'
import type { LeagueRow } from '../home/useHomeData'

const INK = '#0c0e13'

// ─── Per-league identity ──────────────────────────────────────────────────────
// Each league gets a deterministic accent hue from its name, so Gippsland,
// Bellarine and Hampden each feel like their own destination while staying
// unmistakably Got Netty. No invented branding: it is a stable visual identity
// until real league colours/logos are uploaded via the admin portal.
const LEAGUE_HUES = [356, 24, 204, 262, 152, 190, 318, 42]
function leagueHash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) }
export function leagueAccent(name: string): { accent: string; deep: string; wash: string } {
  const hue = LEAGUE_HUES[leagueHash(name) % LEAGUE_HUES.length]
  return {
    accent: `hsl(${hue} 78% 46%)`,
    deep:   `hsl(${hue} 62% 26%)`,
    wash:   `hsl(${hue} 70% 46% / 0.16)`,
  }
}

// Plain-English reasons a league sits where it does, strictly from real data.
// Used in the hero and the strength section instead of an abstract confidence %.
export function whyRankedBullets(_league: LeagueDetail, facts: LeagueFacts): string[] {
  const out: string[] = []
  if (facts.top25 > 0) out.push(`${facts.top25} ${facts.top25 === 1 ? 'club' : 'clubs'} in Australia's Top 25`)
  if (facts.top100 > 0) out.push(`${facts.top100} ${facts.top100 === 1 ? 'club' : 'clubs'} inside the national Top 100`)
  if (facts.avgRating != null) out.push(`Average club rating ${facts.avgRating.toFixed(1)}`)
  if (facts.balance != null && facts.balance >= 60 && (facts.depth == null || facts.depth <= 14)) out.push('Even competition top to bottom')
  else if (facts.depth != null && facts.depth <= 10) out.push('Strong competitive depth')
  else if (facts.bestClub) out.push(`Led nationally by ${facts.bestClub.clubName}`)
  return out.slice(0, 4)
}

// ─── Derived league facts (shared by snapshot, strength, stats, SEO) ─────────
export interface LeagueFacts {
  nationalRank: number | null      // rank among all leagues by strength
  leagueCount: number
  stars: number
  avgRating: number | null
  medianRating: number | null
  top100: number
  top25: number
  bestClub: LeagueRankedTeam | null
  lowestClub: LeagueRankedTeam | null
  leader: LeagueDetail['ladder'][number] | null
  spoon: LeagueDetail['ladder'][number] | null
  biggestClimber: LeagueRankedTeam | null
  bestForm: LeagueRankedTeam | null
  bestPercent: LeagueDetail['ladder'][number] | null
  avgPercent: number | null
  depth: number | null             // top-half avg minus bottom-half avg (rating spread)
  balance: number | null           // 0-100, higher = more even
  undefeated: LeagueDetail['ladder'][number][]          // played > 0, no losses
  finalsRace: { fourth: LeagueDetail['ladder'][number]; fifth: LeagueDetail['ladder'][number]; gap: number } | null
  highestScoring: LeagueDetail['ladder'][number] | null // most goals for (where scores exist)
  bestDefence: LeagueDetail['ladder'][number] | null    // fewest goals against (where scores exist)
}

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)
const median = (a: number[]) => {
  if (!a.length) return null
  const s = [...a].sort((x, y) => x - y)
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
}
const winStreak = (form?: FormResult[]) => {
  if (!form?.length) return 0
  let n = 0
  for (let i = form.length - 1; i >= 0 && form[i] === 'W'; i--) n++
  return n
}

export function deriveFacts(league: LeagueDetail, allLeagues: LeagueRow[]): LeagueFacts {
  const ranked = league.rankedTeams
  const ratings = ranked.map(t => t.powerRating)
  const sorted = [...ratings].sort((a, b) => b - a)
  const half = Math.ceil(sorted.length / 2)
  const topHalf = mean(sorted.slice(0, half))
  const botHalf = mean(sorted.slice(half))
  const stdev = ratings.length ? Math.sqrt(mean(ratings.map(r => (r - (mean(ratings) ?? 0)) ** 2)) ?? 0) : null

  const byStrength = [...allLeagues].filter(l => l.clubCount > 0).sort((a, b) => b.strengthScore - a.strengthScore)
  const idx = byStrength.findIndex(l => l.id === league.id)

  const ladder = league.ladder
  const movers = ranked.filter(t => (t.rankMovement ?? 0) > 0)

  // Ladder-derived highlights: only where the underlying numbers really exist.
  const played = ladder.filter(r => r.played > 0)
  const withScores = played.filter(r => r.goalsFor > 0 || r.goalsAgainst > 0)
  const byPoints = [...ladder].sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
  const finalsRace = byPoints.length >= 5 && byPoints[3].played > 0 && byPoints[4].played > 0
    ? { fourth: byPoints[3], fifth: byPoints[4], gap: byPoints[3].points - byPoints[4].points }
    : null

  return {
    nationalRank: idx >= 0 ? idx + 1 : null,
    leagueCount: byStrength.length,
    stars: strengthStars(league.strengthScore),
    avgRating: mean(ratings),
    medianRating: median(ratings),
    top100: ranked.filter(t => t.rank <= 100).length,
    top25: ranked.filter(t => t.rank <= 25).length,
    bestClub: ranked[0] ?? null,
    lowestClub: ranked.length ? ranked[ranked.length - 1] : null,
    leader: ladder.find(r => (r.position ?? 99) === 1) ?? ladder[0] ?? null,
    spoon: ladder.length > 1 ? ladder[ladder.length - 1] : null,
    biggestClimber: movers.length ? [...movers].sort((a, b) => (b.rankMovement ?? 0) - (a.rankMovement ?? 0))[0] : null,
    bestForm: ranked.length ? [...ranked].sort((a, b) => winStreak(b.recentForm) - winStreak(a.recentForm))[0] : null,
    bestPercent: ladder.length ? [...ladder].filter(r => r.percentage > 0).sort((a, b) => b.percentage - a.percentage)[0] ?? null : null,
    avgPercent: mean(ladder.map(r => r.percentage).filter(p => p > 0)),
    depth: topHalf != null && botHalf != null ? topHalf - botHalf : null,
    balance: stdev != null ? Math.max(0, Math.min(100, Math.round((1 - stdev / 25) * 100))) : null,
    undefeated: played.filter(r => r.losses === 0 && r.draws === 0),
    finalsRace,
    highestScoring: withScores.length ? [...withScores].sort((a, b) => b.goalsFor - a.goalsFor)[0] : null,
    bestDefence: withScores.length ? [...withScores].sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0] : null,
  }
}

// ─── League mark ──────────────────────────────────────────────────────────────
// Real league logo when one has been uploaded; otherwise a deterministic
// monogram shield in the league's identity colour.
export function LeagueMark({ name, src, accent, size = 76 }: { name: string; src?: string | null; accent: ReturnType<typeof leagueAccent>; size?: number }) {
  if (src) {
    return <img src={src} alt="" width={size} height={size} loading="lazy" style={{ width: size, height: size, objectFit: 'contain', borderRadius: 16, background: '#fff', flexShrink: 0 }} />
  }
  const initials = name.split(/\s+/).filter(w => /^[A-Za-z]/.test(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'L'
  return (
    <span aria-hidden style={{
      width: size, height: size, flexShrink: 0, borderRadius: 18, display: 'grid', placeItems: 'center',
      background: `linear-gradient(150deg, ${accent.accent}, ${accent.deep})`,
      border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 10px 30px -12px rgba(0,0,0,0.55), inset 0 1px 1px rgba(255,255,255,0.25)',
    }}>
      <span className="font-display" style={{ color: '#fff', fontSize: size * 0.42, lineHeight: 1, letterSpacing: '0.03em' }}>{initials}</span>
    </span>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
export function LeagueHero({ league, facts }: { league: LeagueDetail; facts: LeagueFacts }) {
  const reduced = useReducedMotion()
  const updated = league.lastSyncedAt ?? league.strengthCalculatedAt
  const id = leagueAccent(league.name)
  const why = whyRankedBullets(league, facts)

  return (
    <header style={{ position: 'relative', overflow: 'hidden', background: INK, borderBottom: `3px solid ${id.accent}` }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: `
        radial-gradient(55% 60% at 85% 0%, ${id.wash}, transparent 66%),
        radial-gradient(42% 46% at 8% 30%, rgba(244,193,77,0.1), transparent 70%)` }} />
      <svg aria-hidden viewBox="0 0 1200 420" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.45 }}>
        <g fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.4">
          <circle cx="1000" cy="210" r="150" />
          <circle cx="1000" cy="210" r="260" stroke="rgba(255,255,255,0.05)" />
          <line x1="780" y1="-10" x2="780" y2="440" stroke="rgba(255,255,255,0.06)" />
          <path d="M -40 420 A 240 240 0 0 1 440 420" stroke={id.accent} strokeOpacity="0.45" strokeWidth="1.7" />
        </g>
        <circle cx="1000" cy="210" r="3" fill={GOLD} opacity="0.8" />
      </svg>

      <div style={{ position: 'relative', maxWidth: 1120, margin: '0 auto', padding: 'clamp(30px, 5vw, 52px) 20px clamp(30px, 4vw, 46px)' }}>
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="font-condensed" style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 'clamp(20px, 3.5vw, 34px)', flexWrap: 'wrap' }}>
          <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
          <ChevronRight size={11} aria-hidden />
          <Link to="/leagues" style={{ color: 'inherit', textDecoration: 'none' }}>Leagues</Link>
          <ChevronRight size={11} aria-hidden />
          <span aria-current="page" style={{ color: 'rgba(255,255,255,0.7)' }}>{league.name}</span>
        </nav>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'clamp(18px, 3vw, 34px)', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 460px', minWidth: 0 }}>
            <motion.div initial={{ opacity: 0, y: reduced ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: EASE }}
              className="font-condensed" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', fontSize: 11, marginBottom: 14, flexWrap: 'wrap' }}>
              <Tag color={GOLD}>Country league</Tag>
              <span>{league.stateName ?? league.state}{league.regionName ? ` · ${league.regionName}` : ''}</span>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: reduced ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.06, ease: EASE }}
              style={{ display: 'flex', alignItems: 'center', gap: 'clamp(14px, 2.4vw, 22px)' }}>
              <LeagueMark name={league.name} src={league.logoUrl} accent={id} />
              <div style={{ overflow: 'hidden', minWidth: 0 }}>
                <motion.h1 initial={{ y: reduced ? 0 : '105%' }} animate={{ y: 0 }} transition={{ duration: 0.8, delay: 0.08, ease: EASE }}
                  className="font-display" style={{ fontSize: 'clamp(2.4rem, 7vw, 5.6rem)', color: '#fff', lineHeight: 0.88, margin: 0 }}>
                  {league.name.toUpperCase()}
                </motion.h1>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: reduced ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.28, ease: EASE }}
              style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 18, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
                <StarStrength stars={facts.stars} size={16} />
                <span className="font-condensed" style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700, fontSize: 13.5, letterSpacing: '0.06em' }}>
                  {strengthLabel(facts.stars)}
                </span>
              </span>
              {league.currentSeason && (
                <span className="font-condensed" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {league.currentSeason}
                </span>
              )}
              {updated && (
                <span className="font-condensed" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.45)', fontSize: 12.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  <span className="gn-live-dot" aria-hidden /> Updated {new Date(updated).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </motion.div>
          </div>

          {/* National rank block */}
          {facts.nationalRank != null && (
            <motion.div initial={{ opacity: 0, y: reduced ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.34, ease: EASE }}
              style={{ textAlign: 'right', flexShrink: 0 }}>
              <div className="font-condensed" style={{ color: 'rgba(255,255,255,0.42)', fontSize: 11, fontWeight: 800, letterSpacing: '0.24em', textTransform: 'uppercase' }}>
                National league rank
              </div>
              <div className="font-display" style={{ fontSize: 'clamp(3.4rem, 8vw, 5.6rem)', lineHeight: 0.85, color: facts.nationalRank <= 3 ? GOLD : id.accent }}>
                #{facts.nationalRank}
              </div>
              <div className="font-condensed" style={{ color: 'rgba(255,255,255,0.42)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>
                of {facts.leagueCount} tracked leagues
              </div>
            </motion.div>
          )}
        </div>

        {/* Why ranked here: real reasons, not an abstract score */}
        {why.length > 0 && (
          <motion.div initial={{ opacity: 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}
            style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 26, flexWrap: 'wrap' }}>
            {facts.nationalRank != null && (
              <span className="font-condensed" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', marginRight: 4 }}>
                Why #{facts.nationalRank}
              </span>
            )}
            {why.map(b => (
              <span key={b} className="font-condensed" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'rgba(255,255,255,0.82)', fontSize: 12.5, fontWeight: 600, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '6px 13px' }}>
                <span style={{ width: 5, height: 5, borderRadius: 999, background: id.accent }} aria-hidden />{b}
              </span>
            ))}
          </motion.div>
        )}
      </div>
    </header>
  )
}

// ─── Sticky section nav ───────────────────────────────────────────────────────
const ANCHORS = [
  ['snapshot', 'Snapshot'], ['ladder', 'Ladder'], ['clubs', 'Club Rankings'],
  ['strength', 'Strength'], ['highlights', 'Highlights'], ['stats', 'Statistics'], ['news', 'News'],
] as const

export function LeagueSubnav() {
  return (
    <nav aria-label="League sections" style={{ position: 'sticky', top: 96, zIndex: 40, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${LINE}` }}>
      <div className="gn-rail" style={{ maxWidth: 1120, margin: '0 auto', padding: '0 20px', gap: 4 }}>
        {ANCHORS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="font-condensed gn-row"
            style={{ display: 'inline-block', padding: '13px 13px', color: MUTE, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: 11.5, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            {label}
          </a>
        ))}
      </div>
    </nav>
  )
}

// ─── Snapshot cards ───────────────────────────────────────────────────────────
export function LeagueSnapshot({ league, facts }: { league: LeagueDetail; facts: LeagueFacts }) {
  const tiles: { label: string; value: React.ReactNode; sub?: string; accent?: string }[] = []
  if (facts.nationalRank != null) tiles.push({ label: 'National rank', value: `#${facts.nationalRank}`, sub: `of ${facts.leagueCount} leagues`, accent: PINK })
  tiles.push({ label: 'Strength', value: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{facts.stars}<StarStrength stars={facts.stars} size={11} /></span>, sub: strengthLabel(facts.stars), accent: GOLD_DK })
  tiles.push({ label: 'Clubs', value: String(league.ladder.length || league.rankedTeams.length), sub: `${league.rankedTeams.length} nationally ranked` })
  if (facts.avgRating != null) tiles.push({ label: 'Average club rating', value: facts.avgRating.toFixed(1), sub: facts.medianRating != null ? `median ${facts.medianRating.toFixed(1)}` : undefined })
  if (facts.bestClub) tiles.push({ label: 'Highest ranked club', value: `#${facts.bestClub.rank}`, sub: facts.bestClub.clubName, accent: GOLD_DK })
  if (facts.leader) tiles.push({ label: 'Ladder leader', value: facts.leader.clubName.split(' ').slice(0, 2).join(' '), sub: `${facts.leader.wins}-${facts.leader.losses} this season`, accent: UP })
  if (facts.top100 > 0) tiles.push({ label: 'Top 100 clubs', value: String(facts.top100), sub: facts.top25 > 0 ? `${facts.top25} in the Top 25` : 'nationally ranked', accent: PINK })
  tiles.push({ label: 'Tracked since', value: '2026', sub: league.primarySource === 'MANUAL_IMAGE' ? 'via ladder imagery' : 'live ladder data' })

  return (
    <Section id="snapshot" pad={false}>
      <div className="snap-grid" style={{ display: 'grid', gap: 14, padding: 'clamp(26px, 4vw, 40px) 0' }}>
        {tiles.map((t, i) => (
          <Reveal key={t.label} delay={i * 0.04}>
            <div className="gn-card" style={{ padding: '16px 18px', height: '100%', borderTop: `3px solid ${t.accent ?? 'rgba(17,17,17,0.14)'}` }}>
              <div className="font-condensed" style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: FAINT, marginBottom: 8 }}>{t.label}</div>
              <div className="font-display" style={{ fontSize: 'clamp(1.3rem, 2.4vw, 1.7rem)', lineHeight: 1, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.value}</div>
              {t.sub && <div className="font-condensed" style={{ color: MUTE, fontSize: 11.5, marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.sub}</div>}
            </div>
          </Reveal>
        ))}
      </div>
      <style>{`
        .snap-grid { grid-template-columns: repeat(4, 1fr); }
        @media (max-width: 960px) { .snap-grid { grid-template-columns: repeat(2, 1fr); } }
      `}</style>
    </Section>
  )
}

// ─── Strength explainer ───────────────────────────────────────────────────────
export function LeagueStrength({ league, facts }: { league: LeagueDetail; facts: LeagueFacts }) {
  // Lead sentence assembled from real derived facts.
  const bits: string[] = []
  if (facts.top100 > 0) bits.push(`${facts.top100} of its ${league.rankedTeams.length} ranked clubs sit inside Australia's Top 100`)
  if (facts.avgRating != null) bits.push(`the average club rates ${facts.avgRating.toFixed(1)} nationally`)
  if (facts.balance != null && facts.balance >= 60 && (facts.depth == null || facts.depth <= 14)) bits.push('competition is even from top to bottom')
  else if (facts.depth != null && facts.depth > 14) bits.push('the top clubs sit well clear of the bottom half')
  const lead = facts.nationalRank != null
    ? `${league.name} is currently the #${facts.nationalRank} ranked league in the country${bits.length ? `: ${bits.join(', ')}.` : '.'}`
    : `${league.name} carries a ${facts.stars}-star national strength rating${bits.length ? `: ${bits.join(', ')}.` : '.'}`

  return (
    <Section id="strength" band>
      <SectionHead
        kicker="Why this rating"
        title={<>LEAGUE <span style={{ color: PINK }}>STRENGTH</span></>}
      />
      <div className="str-grid" style={{ display: 'grid', gap: 18 }}>
        <Reveal>
          <div className="gn-card" style={{ padding: 'clamp(22px, 3.5vw, 32px)', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <span className="font-display" style={{ fontSize: 52, lineHeight: 0.9, color: PINK }}>{facts.stars}<span style={{ fontSize: 26, color: FAINT }}>/5</span></span>
              <StarStrength stars={facts.stars} size={18} />
            </div>
            <p style={{ color: TEXT, fontSize: 16.5, lineHeight: 1.7, margin: 0, fontWeight: 500 }}>{lead}</p>
            {whyRankedBullets(league, facts).length > 0 && (
              <ul style={{ listStyle: 'none', margin: '18px 0 0', padding: 0, display: 'grid', gap: 10 }}>
                {whyRankedBullets(league, facts).map(b => (
                  <li key={b} style={{ display: 'flex', alignItems: 'center', gap: 11, color: TEXT, fontSize: 14.5, fontWeight: 600 }}>
                    <span aria-hidden style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, display: 'grid', placeItems: 'center', color: '#16a34a', background: 'rgba(22,163,74,0.1)' }}>
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 7.5 L5.5 11 L12 3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            )}
            {league.strengthReasoning && (
              <p style={{ color: MUTE, fontSize: 14, lineHeight: 1.7, margin: '16px 0 0', paddingTop: 16, borderTop: `1px solid ${LINE}` }}>
                <span className="font-condensed" style={{ display: 'block', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: FAINT, marginBottom: 8 }}>From the rating engine</span>
                {league.strengthReasoning}
              </p>
            )}
            {league.strengthCalculatedAt && (
              <p className="font-condensed" style={{ color: FAINT, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '14px 0 0' }}>
                Calculated {new Date(league.strengthCalculatedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })} · never on ladder position alone
              </p>
            )}
          </div>
        </Reveal>

        <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <FactCard icon={<Trophy size={14} aria-hidden />} accent={GOLD_DK} label="Top 100 clubs" value={String(facts.top100)}
            sub={facts.bestClub ? `led by ${facts.bestClub.clubName} at #${facts.bestClub.rank}` : 'none this week'} />
          {facts.depth != null && (
            <FactCard icon={<ShieldCheck size={14} aria-hidden />} accent={CYANISH} label="Depth" value={facts.depth <= 8 ? 'Deep' : facts.depth <= 14 ? 'Solid' : 'Top-heavy'}
              sub={`${facts.depth.toFixed(1)} rating points between halves`} />
          )}
          {facts.balance != null && (
            <FactCard icon={<Percent size={14} aria-hidden />} accent={UP} label="Competitive balance" value={`${facts.balance}/100`}
              sub={facts.balance >= 60 && (facts.depth == null || facts.depth <= 14) ? 'anyone can beat anyone' : 'a clear pecking order'} />
          )}
        </div>
      </div>
      <style>{`
        .str-grid { grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); }
        @media (max-width: 860px) { .str-grid { grid-template-columns: 1fr; } }
      `}</style>
    </Section>
  )
}

function FactCard({ icon, accent, label, value, sub }: { icon: React.ReactNode; accent: string; label: string; value: string; sub: string }) {
  return (
    <Reveal>
      <div className="gn-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', color: accent, background: `color-mix(in srgb, ${accent} 10%, #ffffff)`, flexShrink: 0 }}>{icon}</span>
        <span style={{ minWidth: 0 }}>
          <span className="font-condensed" style={{ display: 'block', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: FAINT }}>{label}</span>
          <span className="font-display" style={{ display: 'block', fontSize: 22, lineHeight: 1.05, marginTop: 3 }}>{value.toUpperCase()}</span>
          <span className="font-condensed" style={{ display: 'block', color: MUTE, fontSize: 12, marginTop: 2 }}>{sub}</span>
        </span>
      </div>
    </Reveal>
  )
}

// ─── News ─────────────────────────────────────────────────────────────────────
export function LeagueNews({ leagueName }: { leagueName: string }) {
  const [, bump] = useState(0)
  useEffect(() => { loadPublished().then(() => bump(x => x + 1)) }, [])
  const norm = (s: string) => s.toLowerCase().replace(/\s*-\s*a grade.*$/i, '').trim()
  const key = norm(leagueName)
  const mine = allArticles().filter(a => a.tags.league && norm(a.tags.league).includes(key))
  const general = allArticles().filter(a => !mine.includes(a)).slice(0, 3)
  const lead = mine[0]
  const rest = (lead ? mine.slice(1) : []).concat(lead ? [] : []).slice(0, 3)
  const fill = rest.length < 3 ? general.slice(0, 3 - rest.length) : []

  return (
    <Section id="news" band>
      <SectionHead
        title={<>LEAGUE <span style={{ color: PINK }}>NEWS</span></>}
        sub={lead ? `The latest coverage of the ${leagueName}.` : 'Country netball coverage from across the network.'}
        to="/news" toLabel="All stories"
      />
      <div className="lnews-grid" style={{ display: 'grid', gap: 16 }}>
        {lead && (
          <Reveal>
            <Link to={newsPath(lead.slug)} className="gn-card gn-card-hover cnews-card" style={{ display: 'block', textDecoration: 'none', color: TEXT, overflow: 'hidden', height: '100%' }}>
              <EditorialImage seed={lead.heroSeed} ratio="16 / 9" rounded={0} />
              <div style={{ padding: '18px 22px 22px' }}>
                <Tag color={categoryOf(lead.category).accent === '#111111' ? PINK : categoryOf(lead.category).accent}>{categoryOf(lead.category).label}</Tag>
                <h3 className="font-display" style={{ fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)', lineHeight: 0.98, margin: '12px 0 8px' }}>{lead.title.toUpperCase()}</h3>
                <NewsMeta a={lead} />
              </div>
            </Link>
          </Reveal>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[...rest, ...fill].map((a, i) => (
            <Reveal key={a.slug} delay={0.05 + i * 0.05}>
              <Link to={newsPath(a.slug)} className="gn-card gn-card-hover" style={{ display: 'flex', gap: 13, padding: 11, textDecoration: 'none', color: TEXT }}>
                <span style={{ width: 86, flexShrink: 0 }}><EditorialImage seed={a.heroSeed} ratio="1 / 1" rounded={9} /></span>
                <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6, padding: '3px 4px 3px 0' }}>
                  <Tag color={categoryOf(a.category).accent === '#111111' ? PINK : categoryOf(a.category).accent}>{categoryOf(a.category).label}</Tag>
                  <span className="font-display" style={{ fontSize: 15.5, lineHeight: 1.02, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.title.toUpperCase()}</span>
                  <span style={{ marginTop: 'auto' }}><NewsMeta a={a} /></span>
                </span>
              </Link>
            </Reveal>
          ))}
          {!lead && [...rest, ...fill].length === 0 && (
            <div className="gn-card" style={{ padding: 26 }}>
              <span className="font-condensed" style={{ color: MUTE, fontSize: 13 }}>League coverage begins as stories are published.</span>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .lnews-grid { grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); }
        @media (max-width: 860px) { .lnews-grid { grid-template-columns: 1fr; } }
      `}</style>
    </Section>
  )
}

function NewsMeta({ a }: { a: Article }) {
  return (
    <span className="font-condensed" style={{ display: 'flex', alignItems: 'center', gap: 7, color: FAINT, fontSize: 11, letterSpacing: '0.04em', flexWrap: 'wrap' }}>
      <b style={{ color: MUTE }}>{a.author.name}</b><span aria-hidden>·</span>{formatDate(a.date)}<span aria-hidden>·</span>{a.readingTime} min
    </span>
  )
}

// ─── Related leagues ──────────────────────────────────────────────────────────
export function RelatedLeagues({ league, allLeagues }: { league: LeagueDetail; allLeagues: LeagueRow[] }) {
  const others = allLeagues.filter(l => l.id !== league.id && l.clubCount > 0)
  const sameState = others.filter(l => l.state === league.state)
  const similar = others
    .filter(l => !sameState.includes(l))
    .sort((a, b) => Math.abs(a.strengthScore - league.strengthScore) - Math.abs(b.strengthScore - league.strengthScore))
  const picks = [...sameState.slice(0, 4), ...similar].slice(0, 6)
  if (picks.length === 0) return null

  return (
    <Section>
      <SectionHead
        title={<>MORE <span style={{ color: CYANISH }}>LEAGUES</span></>}
        sub={`Rivals near the ${league.name}: same state first, then closest in strength.`}
        to="/leagues" toLabel="All leagues"
      />
      <Reveal>
        <div className="gn-rail" role="list">
          {picks.map(l => (
            <Link key={l.id} role="listitem" to={leaguePath(l.id)} className="gn-card gn-card-hover"
              style={{ width: 240, padding: '17px 19px', textDecoration: 'none', color: TEXT, display: 'flex', flexDirection: 'column', gap: 9 }}>
              <span className="font-condensed" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: FAINT }}>
                {l.state}
                {l.state === league.state && <span style={{ color: CYANISH }}>Same state</span>}
              </span>
              <span className="font-display" style={{ fontSize: 19, lineHeight: 1, minHeight: 38, display: 'flex', alignItems: 'center' }}>{l.name.toUpperCase()}</span>
              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${LINE}`, paddingTop: 9 }}>
                <StarStrength stars={strengthStars(l.strengthScore)} size={10.5} />
                <span className="font-condensed" style={{ color: MUTE, fontSize: 11 }}>{l.clubCount} clubs</span>
              </span>
            </Link>
          ))}
        </div>
      </Reveal>
    </Section>
  )
}

// ─── Club search (league-scoped, instant) ────────────────────────────────────
export function LeagueClubSearch({ league, value, onChange }: { league: LeagueDetail; value: string; onChange: (v: string) => void }) {
  const count = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return null
    const names = new Set([...league.ladder.map(l => l.clubName), ...league.rankedTeams.map(t => t.clubName)])
    return [...names].filter(n => n.toLowerCase().includes(q)).length
  }, [value, league])

  return (
    <div className="gn-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '2px 6px 2px 18px', borderRadius: 999, maxWidth: 460, marginBottom: 22 }}>
      <Search size={16} color={MUTE} aria-hidden />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={`Search ${league.name} clubs`}
        aria-label={`Search clubs in the ${league.name}`}
        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: TEXT, padding: '12px 0', minWidth: 0 }} />
      {count != null && (
        <span className="font-condensed" style={{ color: MUTE, fontSize: 11.5, fontWeight: 700, paddingRight: 12, whiteSpace: 'nowrap' }}>
          {count} match{count === 1 ? '' : 'es'}
        </span>
      )}
    </div>
  )
}

// ─── League highlights ────────────────────────────────────────────────────────
// The week's stories, every one derived from real ladder and ranking data.
// Anything without underlying data simply is not rendered.
interface Highlight {
  key: string; icon: React.ReactNode; accent: string; kicker: string
  name: string; sub: string; clubId?: string; form?: FormResult[]; wide?: boolean
}

/** One-sentence weekly story assembled strictly from real facts. */
export function weeklyStory(_league: LeagueDetail, facts: LeagueFacts): string | null {
  const bits: string[] = []
  if (facts.undefeated.length === 1) bits.push(`${facts.undefeated[0].clubName} remain the only unbeaten side`)
  else if (facts.undefeated.length > 1) bits.push(`${facts.undefeated.length} clubs are still unbeaten`)
  else if (facts.leader) bits.push(`${facts.leader.clubName} lead the ladder at ${facts.leader.wins}-${facts.leader.losses}`)
  if (facts.biggestClimber) bits.push(`${facts.biggestClimber.clubName} jumped ${facts.biggestClimber.rankMovement} national places`)
  if (facts.finalsRace && facts.finalsRace.gap <= 4) bits.push(`just ${facts.finalsRace.gap === 0 ? 'percentage separates' : `${facts.finalsRace.gap} points separate`} ${facts.finalsRace.fourth.clubName} and ${facts.finalsRace.fifth.clubName} in the race for fourth`)
  if (bits.length === 0) return null
  return `${bits.join(', and ')}.`.replace(/^./, c => c.toUpperCase())
}

export function LeagueHighlights({ league, facts }: { league: LeagueDetail; facts: LeagueFacts }) {
  const navigate = useNavigate()
  const id = leagueAccent(league.name)
  const story = weeklyStory(league, facts)

  const cards: Highlight[] = []
  if (facts.bestClub) cards.push({ key: 'best', icon: <Trophy size={14} aria-hidden />, accent: GOLD_DK, kicker: 'Highest ranked club', name: facts.bestClub.clubName, sub: `#${facts.bestClub.rank} nationally · rating ${facts.bestClub.powerRating.toFixed(1)}`, clubId: facts.bestClub.clubId })
  if (facts.leader) cards.push({ key: 'leader', icon: <ShieldCheck size={14} aria-hidden />, accent: UP, kicker: 'Ladder leader', name: facts.leader.clubName, sub: `${facts.leader.wins}-${facts.leader.losses}${facts.leader.draws ? `-${facts.leader.draws}` : ''} · ${facts.leader.points} points`, clubId: facts.leader.clubId })
  if (facts.biggestClimber) cards.push({ key: 'climb', icon: <Zap size={14} aria-hidden />, accent: UP, kicker: 'Biggest ranking mover', name: facts.biggestClimber.clubName, sub: `Up ${facts.biggestClimber.rankMovement} to #${facts.biggestClimber.rank} this week`, clubId: facts.biggestClimber.clubId })
  if (facts.undefeated.length > 0 && facts.undefeated.length <= 2) {
    for (const u of facts.undefeated.slice(0, 1)) {
      cards.push({ key: 'unbeaten', icon: <Flame size={14} aria-hidden />, accent: PINK, kicker: facts.undefeated.length === 1 ? 'Undefeated' : 'Undefeated clubs', name: u.clubName, sub: `${u.wins}-0 after ${u.played} games`, clubId: u.clubId })
    }
  }
  if (facts.bestForm && winStreak(facts.bestForm.recentForm) >= 3) cards.push({ key: 'form', icon: <Flame size={14} aria-hidden />, accent: PINK, kicker: 'Most improved form', name: facts.bestForm.clubName, sub: `${winStreak(facts.bestForm.recentForm)} straight wins`, clubId: facts.bestForm.clubId, form: facts.bestForm.recentForm })
  if (facts.highestScoring) cards.push({ key: 'attack', icon: <Zap size={14} aria-hidden />, accent: CYANISH, kicker: 'Highest scoring', name: facts.highestScoring.clubName, sub: `${facts.highestScoring.goalsFor} goals this season`, clubId: facts.highestScoring.clubId })
  if (facts.bestDefence && facts.bestDefence.clubId !== facts.highestScoring?.clubId) cards.push({ key: 'defence', icon: <ShieldCheck size={14} aria-hidden />, accent: CYANISH, kicker: 'Strongest defence', name: facts.bestDefence.clubName, sub: `${facts.bestDefence.goalsAgainst} goals conceded`, clubId: facts.bestDefence.clubId })
  if (facts.bestPercent && facts.bestPercent.clubId !== facts.leader?.clubId) cards.push({ key: 'pct', icon: <Percent size={14} aria-hidden />, accent: CYANISH, kicker: 'Best percentage', name: facts.bestPercent.clubName, sub: `${facts.bestPercent.percentage.toFixed(0)}% for the season`, clubId: facts.bestPercent.clubId })
  if (cards.length === 0 && !story) return null

  return (
    <Section id="highlights" band>
      <SectionHead
        title={<>LEAGUE <span style={{ color: id.accent }}>HIGHLIGHTS</span></>}
        sub="The stories of the week, straight from the numbers."
      />

      {story && (
        <Reveal>
          <div className="gn-card" style={{ padding: 'clamp(18px, 3vw, 26px)', marginBottom: 16, borderLeft: `4px solid ${id.accent}` }}>
            <div className="font-condensed" style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: id.accent, marginBottom: 8 }}>
              This week in the {league.name}
            </div>
            <p className="font-display" style={{ fontSize: 'clamp(1.2rem, 2.6vw, 1.7rem)', lineHeight: 1.15, margin: 0, color: TEXT }}>{story.toUpperCase()}</p>
          </div>
        </Reveal>
      )}

      <div className="perf-grid" style={{ display: 'grid', gap: 14 }}>
        {cards.slice(0, 6).map((c, i) => (
          <Reveal key={c.key} delay={i * 0.05}>
            <button onClick={() => c.clubId && navigate(teamPath(c.clubId))} className="gn-card gn-card-hover"
              style={{ width: '100%', textAlign: 'left', font: 'inherit', color: TEXT, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 11, height: '100%' }}>
              <span className="font-condensed" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: c.accent }}>
                {c.icon} {c.kicker}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                <TeamLogo name={c.name} size={38} />
                <span className="font-display" style={{ fontSize: 19, lineHeight: 1.02, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name.toUpperCase()}</span>
              </span>
              {c.form && <FormPips form={c.form} />}
              <span className="font-condensed" style={{ color: MUTE, fontSize: 12, marginTop: 'auto', borderTop: `1px solid ${LINE}`, paddingTop: 9 }}>{c.sub}</span>
            </button>
          </Reveal>
        ))}
      </div>
      <style>{`
        .perf-grid { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
      `}</style>
    </Section>
  )
}

// ─── League statistics ────────────────────────────────────────────────────────
export function LeagueStats({ league, facts }: { league: LeagueDetail; facts: LeagueFacts }) {
  const rows: { label: string; value: string; sub?: string }[] = []
  if (facts.avgRating != null) rows.push({ label: 'Average club rating', value: facts.avgRating.toFixed(1) })
  if (facts.medianRating != null) rows.push({ label: 'Median club rating', value: facts.medianRating.toFixed(1) })
  if (facts.bestClub) rows.push({ label: 'Highest rated club', value: facts.bestClub.powerRating.toFixed(1), sub: facts.bestClub.clubName })
  if (facts.lowestClub && facts.lowestClub !== facts.bestClub) rows.push({ label: 'Lowest rated club', value: facts.lowestClub.powerRating.toFixed(1), sub: facts.lowestClub.clubName })
  if (facts.avgPercent != null) rows.push({ label: 'Average percentage', value: `${facts.avgPercent.toFixed(0)}%` })
  if (facts.depth != null) rows.push({ label: 'League depth', value: `${facts.depth.toFixed(1)} pts`, sub: 'gap between halves, lower is deeper' })
  if (facts.balance != null) rows.push({ label: 'Competitive balance', value: `${facts.balance}/100`, sub: 'higher is more even' })
  rows.push({ label: 'Clubs tracked', value: String(league.ladder.length || league.rankedTeams.length), sub: league.currentSeason ?? undefined })

  return (
    <Section id="stats">
      <SectionHead
        title={<>LEAGUE <span style={{ color: CYANISH }}>STATISTICS</span></>}
        sub="Season measures computed from live ladder and ranking data."
      />
      <Reveal>
        <div className="gn-card" style={{ overflow: 'hidden' }}>
          <div className="lstat-grid" style={{ display: 'grid' }}>
            {rows.map(r => (
              <div key={r.label} style={{ padding: '18px 22px', borderBottom: `1px solid ${LINE}`, borderRight: `1px solid ${LINE}` }}>
                <div className="font-condensed" style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: FAINT }}>{r.label}</div>
                <div className="font-display" style={{ fontSize: 27, lineHeight: 1, margin: '7px 0 3px' }}>{r.value}</div>
                {r.sub && <div className="font-condensed" style={{ color: MUTE, fontSize: 11.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.sub}</div>}
              </div>
            ))}
          </div>
        </div>
      </Reveal>
      <style>{`
        .lstat-grid { grid-template-columns: repeat(4, 1fr); }
        @media (max-width: 960px) { .lstat-grid { grid-template-columns: repeat(2, 1fr); } }
      `}</style>
    </Section>
  )
}

// re-export helpers used by the page
export { winStreak }
