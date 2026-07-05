/**
 * Club page sections (Phase 4). The highest-traffic pages: each club's premium
 * digital home. Built on the Phase 2/3 design system. Every figure is real;
 * anything without data (ground, premierships, sponsors, gallery) is invited
 * via "claim", never faked.
 */
import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronRight, Globe, ArrowRight } from 'lucide-react'
import { teamPath, leaguePath, strengthStars, strengthLabel, type ClubProfile } from '../../lib/rankings'
import { TeamLogo, FormPips, StarStrength } from '../rankings/bits'
import { Section, SectionHead, Reveal, Move, Tag, EASE, TEXT, MUTE, FAINT, LINE, PINK, GOLD, GOLD_DK, UP, DOWN, CYANISH } from '../home/ui'
import { loadPublished, allArticles, categoryOf, formatDate, newsPath, type Article } from '../../news/content'
import { EditorialImage } from '../../news/components'

const INK = '#0c0e13'

// Club identity colour: real primary colour if set, else deterministic by name.
const HUES = [356, 214, 24, 152, 262, 190, 318, 42]
function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) }
export function clubIdentity(c: Pick<ClubProfile, 'clubName' | 'primaryColour'>) {
  const valid = c.primaryColour && /^#?[0-9a-f]{6}$/i.test(c.primaryColour)
  if (valid) {
    const hex = c.primaryColour!.startsWith('#') ? c.primaryColour! : `#${c.primaryColour}`
    return { accent: hex, deep: hex, wash: `${hex}22` }
  }
  const hue = HUES[hash(c.clubName) % HUES.length]
  return { accent: `hsl(${hue} 74% 46%)`, deep: `hsl(${hue} 60% 24%)`, wash: `hsl(${hue} 70% 46% / 0.16)` }
}

const FACTOR_LABELS: Record<string, string> = {
  winPercentage: 'Win record', percentage: 'Season percentage', goalsFor: 'Attacking output',
  goalsAgainst: 'Defensive record', recentForm: 'Recent form', consistency: 'Consistency',
  leagueStrength: 'League strength', strengthOfOpposition: 'Opposition strength', finalsSuccess: 'Finals record',
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
export function ClubHero({ club }: { club: ClubProfile }) {
  const reduced = useReducedMotion()
  const id = clubIdentity(club)
  const rec = club.record
  const place = [club.town, club.leagueName, club.stateName ?? club.state].filter(Boolean).join(' · ')

  return (
    <header style={{ position: 'relative', overflow: 'hidden', background: INK, borderBottom: `3px solid ${id.accent}` }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: `
        radial-gradient(55% 60% at 85% 0%, ${id.wash}, transparent 66%),
        radial-gradient(40% 44% at 6% 30%, rgba(244,193,77,0.08), transparent 70%)` }} />
      <svg aria-hidden viewBox="0 0 1200 420" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4 }}>
        <g fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="1.4">
          <circle cx="1010" cy="205" r="150" />
          <path d="M -40 420 A 240 240 0 0 1 440 420" stroke={id.accent} strokeOpacity="0.4" strokeWidth="1.7" />
        </g>
      </svg>

      <div style={{ position: 'relative', maxWidth: 1120, margin: '0 auto', padding: 'clamp(28px, 5vw, 48px) 20px clamp(28px, 4vw, 44px)' }}>
        <nav aria-label="Breadcrumb" className="font-condensed" style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 'clamp(18px, 3vw, 30px)', flexWrap: 'wrap' }}>
          <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
          <ChevronRight size={11} aria-hidden />
          {club.leagueId
            ? <Link to={leaguePath(club.leagueId)} style={{ color: 'inherit', textDecoration: 'none' }}>{club.leagueName}</Link>
            : <Link to="/directory" style={{ color: 'inherit', textDecoration: 'none' }}>Clubs</Link>}
          <ChevronRight size={11} aria-hidden />
          <span aria-current="page" style={{ color: 'rgba(255,255,255,0.7)' }}>{club.clubName}</span>
        </nav>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'clamp(18px, 3vw, 34px)', flexWrap: 'wrap' }}>
          <motion.div initial={{ opacity: 0, y: reduced ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, ease: EASE }}
            style={{ display: 'flex', alignItems: 'center', gap: 'clamp(14px, 2.4vw, 22px)', flex: '1 1 460px', minWidth: 0 }}>
            <ClubCrest name={club.clubName} src={club.logoUrl} id={id} />
            <div style={{ minWidth: 0 }}>
              <div className="font-condensed" style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12, flexWrap: 'wrap' }}>
                <Tag color={GOLD}>Country netball club</Tag>
                {club.ranked && <span className="font-condensed" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Ranked nationally</span>}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <motion.h1 initial={{ y: reduced ? 0 : '106%' }} animate={{ y: 0 }} transition={{ duration: 0.8, delay: 0.08, ease: EASE }}
                  className="font-display" style={{ fontSize: 'clamp(2.4rem, 6.6vw, 5.4rem)', color: '#fff', lineHeight: 0.88, margin: 0 }}>
                  {club.clubName.toUpperCase()}
                </motion.h1>
              </div>
              {place && (
                <div className="font-condensed" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13.5, fontWeight: 600, letterSpacing: '0.03em', marginTop: 12 }}>
                  {club.leagueId && club.leagueName
                    ? <>{club.town ? `${club.town} · ` : ''}<Link to={leaguePath(club.leagueId)} style={{ color: id.accent, textDecoration: 'none', fontWeight: 700 }}>{club.leagueName}</Link>{(club.stateName ?? club.state) ? ` · ${club.stateName ?? club.state}` : ''}</>
                    : place}
                </div>
              )}
            </div>
          </motion.div>

          {club.rank != null && (
            <motion.div initial={{ opacity: 0, y: reduced ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
              style={{ display: 'flex', gap: 'clamp(20px, 4vw, 40px)', flexShrink: 0 }}>
              <HeroStat label="National rank" value={`#${club.rank}`} accent={club.rank <= 3 ? GOLD : id.accent} extra={<Move delta={club.rankMovement} />} />
              <HeroStat label="Power rating" value={club.powerRating?.toFixed(1) ?? '0.0'} accent="#fff" />
            </motion.div>
          )}
        </div>

        {/* quick line: record + form + ladder position */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.44 }}
          style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 26, flexWrap: 'wrap' }}>
          {rec.played > 0 && (
            <HeroInline label="Season">{rec.wins}-{rec.losses}{rec.draws ? `-${rec.draws}` : ''} <span style={{ color: 'rgba(255,255,255,0.4)' }}>({rec.played} games)</span></HeroInline>
          )}
          {club.ladderPosition != null && (
            <HeroInline label="Ladder">{ordinal(club.ladderPosition)}{club.leagueName ? ` in ${club.leagueName.replace(/\s*-\s*a grade.*/i, '')}` : ''}</HeroInline>
          )}
          {club.recentForm.length > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="font-condensed" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Form</span>
              <FormPips form={club.recentForm} />
            </span>
          )}
        </motion.div>
      </div>
    </header>
  )
}

function ClubCrest({ name, src, id }: { name: string; src?: string | null; id: ReturnType<typeof clubIdentity> }) {
  const size = 92
  if (src) return <img src={src} alt="" width={size} height={size} loading="eager" style={{ width: size, height: size, objectFit: 'contain', borderRadius: 18, background: '#fff', flexShrink: 0 }} />
  const initials = name.split(/\s+/).filter(w => /^[A-Za-z]/.test(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'C'
  return (
    <span aria-hidden className="hide-xs" style={{
      width: size, height: size, flexShrink: 0, borderRadius: 20, display: 'grid', placeItems: 'center',
      background: `linear-gradient(150deg, ${id.accent}, ${id.deep})`, border: '1px solid rgba(255,255,255,0.2)',
      boxShadow: '0 12px 34px -14px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.28)',
    }}>
      <span className="font-display" style={{ color: '#fff', fontSize: size * 0.4, lineHeight: 1, letterSpacing: '0.03em' }}>{initials}</span>
    </span>
  )
}
function HeroStat({ label, value, accent, extra }: { label: string; value: string; accent: string; extra?: React.ReactNode }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div className="font-condensed" style={{ color: 'rgba(255,255,255,0.42)', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{label}</div>
      <div className="font-display" style={{ fontSize: 'clamp(2.8rem, 7vw, 4.8rem)', lineHeight: 0.85, color: accent }}>{value}</div>
      {extra && <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>{extra}</div>}
    </div>
  )
}
function HeroInline({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <span className="font-condensed" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{label}</span>
      <span className="font-condensed" style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: 700 }}>{children}</span>
    </span>
  )
}

// ─── Snapshot ─────────────────────────────────────────────────────────────────
export function ClubSnapshot({ club }: { club: ClubProfile }) {
  const stars = strengthStars(club.leagueStrengthScore)
  const diff = club.goalsFor - club.goalsAgainst
  const tiles: { label: string; value: React.ReactNode; sub?: string; accent?: string }[] = []
  if (club.rank != null) tiles.push({ label: 'National rank', value: `#${club.rank}`, sub: club.previousRank != null ? `was #${club.previousRank}` : 'this week', accent: PINK })
  if (club.powerRating != null) tiles.push({ label: 'Power rating', value: club.powerRating.toFixed(1), sub: 'out of 100', accent: GOLD_DK })
  if (club.ladderPosition != null) tiles.push({ label: 'Ladder', value: ordinal(club.ladderPosition), sub: 'in its league' })
  if (club.record.played > 0) tiles.push({ label: 'Record', value: `${club.record.wins}-${club.record.losses}${club.record.draws ? `-${club.record.draws}` : ''}`, sub: `${club.record.played} games` })
  if (club.percentage > 0) tiles.push({ label: 'Percentage', value: `${club.percentage.toFixed(0)}%`, sub: diff !== 0 ? `${diff > 0 ? '+' : ''}${diff} goal diff` : undefined, accent: club.percentage >= 100 ? UP : undefined })
  if (club.goalsFor > 0) tiles.push({ label: 'Goals for / against', value: `${club.goalsFor} / ${club.goalsAgainst}`, sub: 'this season' })
  if (club.leagueStrengthScore != null) tiles.push({ label: 'League strength', value: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>{stars}<StarStrength stars={stars} size={11} /></span>, sub: strengthLabel(stars) })
  if (tiles.length === 0) return null

  return (
    <Section pad={false}>
      <div className="csnap-grid" style={{ display: 'grid', gap: 14, padding: 'clamp(26px, 4vw, 40px) 0' }}>
        {tiles.map((t, i) => (
          <Reveal key={t.label} delay={i * 0.04}>
            <div className="gn-card" style={{ padding: '16px 18px', height: '100%', borderTop: `3px solid ${t.accent ?? 'rgba(17,17,17,0.14)'}` }}>
              <div className="font-condensed" style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: FAINT, marginBottom: 8 }}>{t.label}</div>
              <div className="font-display" style={{ fontSize: 'clamp(1.3rem, 2.4vw, 1.7rem)', lineHeight: 1, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.value}</div>
              {t.sub && <div className="font-condensed" style={{ color: MUTE, fontSize: 11.5, marginTop: 6 }}>{t.sub}</div>}
            </div>
          </Reveal>
        ))}
      </div>
      <style>{`
        .csnap-grid { grid-template-columns: repeat(4, 1fr); }
        @media (max-width: 960px) { .csnap-grid { grid-template-columns: repeat(2, 1fr); } }
      `}</style>
    </Section>
  )
}

// ─── Why this ranking (component scores) ─────────────────────────────────────
export function ClubWhy({ club, reasoning }: { club: ClubProfile; reasoning?: string | null }) {
  const cs = club.componentScores ?? {}
  const bars = Object.entries(FACTOR_LABELS)
    .filter(([k]) => typeof cs[k] === 'number')
    .map(([k, label]) => ({ k, label, score: Math.round(cs[k]) }))
    .sort((a, b) => b.score - a.score)
  if (!club.ranked || bars.length === 0) return null

  return (
    <Section band>
      <SectionHead
        kicker="Why this ranking"
        title={<>THE <span style={{ color: PINK }}>RATING</span></>}
        sub={`How ${club.clubName} earns its #${club.rank} national ranking, factor by factor.`}
      />
      <div className="why-grid" style={{ display: 'grid', gap: 18 }}>
        {reasoning && (
          <Reveal>
            <div className="gn-card" style={{ padding: 'clamp(20px, 3vw, 28px)', height: '100%' }}>
              <div className="font-condensed" style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: FAINT, marginBottom: 10 }}>In summary</div>
              <p style={{ color: TEXT, fontSize: 16, lineHeight: 1.7, margin: 0, fontWeight: 500 }}>{reasoning}</p>
            </div>
          </Reveal>
        )}
        <Reveal delay={0.06}>
          <div className="gn-card" style={{ padding: 'clamp(20px, 3vw, 26px)', display: 'grid', gap: 14 }}>
            {bars.slice(0, 6).map(b => (
              <div key={b.k}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span className="font-condensed" style={{ fontSize: 12.5, fontWeight: 700, color: TEXT, letterSpacing: '0.02em' }}>{b.label}</span>
                  <span className="font-display" style={{ fontSize: 15, color: b.score >= 70 ? UP : b.score >= 45 ? TEXT : DOWN }}>{b.score}</span>
                </div>
                <span style={{ display: 'block', height: 6, borderRadius: 6, background: 'rgba(17,17,17,0.06)', overflow: 'hidden' }}>
                  <motion.span initial={{ width: 0 }} whileInView={{ width: `${b.score}%` }} viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE }}
                    style={{ display: 'block', height: '100%', borderRadius: 6, background: b.score >= 70 ? UP : b.score >= 45 ? GOLD : DOWN }} />
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
      <style>{`
        .why-grid { grid-template-columns: minmax(0, 6fr) minmax(0, 6fr); align-items: start; }
        @media (max-width: 860px) { .why-grid { grid-template-columns: 1fr; } }
      `}</style>
    </Section>
  )
}

// ─── Rankings journey ─────────────────────────────────────────────────────────
export function ClubJourney({ club }: { club: ClubProfile }) {
  const reduced = useReducedMotion()
  const id = clubIdentity(club)
  const pts = [...club.history].reverse().slice(-16)   // oldest → newest
  if (pts.length < 2) return null

  const best = Math.min(...pts.map(p => p.rank))
  const worst = Math.max(...pts.map(p => p.rank))
  const avg = Math.round(pts.reduce((s, p) => s + p.rank, 0) / pts.length)
  const W = 900, H = 190, PADX = 14, PADT = 22, PADB = 24
  const x = (i: number) => PADX + (i / Math.max(1, pts.length - 1)) * (W - PADX * 2)
  const y = (r: number) => worst === best ? H / 2 : PADT + ((r - best) / (worst - best)) * (H - PADT - PADB)
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.rank).toFixed(1)}`).join(' ')
  const area = `${line} L ${x(pts.length - 1).toFixed(1)} ${H} L ${x(0).toFixed(1)} ${H} Z`
  const last = pts[pts.length - 1]

  return (
    <Section>
      <SectionHead
        title={<>RANKINGS <span style={{ color: CYANISH }}>JOURNEY</span></>}
        sub="Every week this club has been tracked nationally. The archive grows with each round."
      />
      <Reveal>
        <div className="gn-card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: `1px solid ${LINE}`, flexWrap: 'wrap' }}>
            <JourneyStat label="Current" value={`#${last.rank}`} accent={id.accent} />
            <JourneyStat label="Best" value={`#${best}`} accent={GOLD_DK} />
            <JourneyStat label="Average" value={`#${avg}`} />
            <JourneyStat label="Weeks tracked" value={String(pts.length)} />
          </div>
          <div style={{ padding: 'clamp(14px, 2.5vw, 22px)' }}>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={`National rank over ${pts.length} weeks, from #${pts[0].rank} to #${last.rank}`} style={{ display: 'block' }}>
              <defs>
                <linearGradient id="cj-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={id.accent} stopOpacity="0.16" />
                  <stop offset="100%" stopColor={id.accent} stopOpacity="0" />
                </linearGradient>
              </defs>
              <motion.path d={area} fill="url(#cj-fill)" initial={{ opacity: reduced ? 1 : 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.3 }} />
              <motion.path d={line} fill="none" stroke={id.accent} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: reduced ? 1 : 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, ease: EASE }} />
              {pts.map((p, i) => (
                <circle key={i} cx={x(i)} cy={y(p.rank)} r={i === pts.length - 1 ? 4 : 2.4} fill={i === pts.length - 1 ? id.accent : '#fff'} stroke={id.accent} strokeWidth={i === pts.length - 1 ? 0 : 1.6} />
              ))}
            </svg>
            <div className="font-condensed" style={{ display: 'flex', justifyContent: 'space-between', color: FAINT, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>
              <span>{pts[0].weekLabel}</span><span>higher line = higher rank</span><span>{last.weekLabel}</span>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  )
}
function JourneyStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ padding: '16px 22px', borderRight: `1px solid ${LINE}`, flex: '1 0 auto' }}>
      <div className="font-condensed" style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: FAINT }}>{label}</div>
      <div className="font-display" style={{ fontSize: 26, lineHeight: 1, marginTop: 5, color: accent ?? TEXT }}>{value}</div>
    </div>
  )
}

// ─── Current ladder (with this club highlighted) ─────────────────────────────
export function ClubLadder({ club }: { club: ClubProfile }) {
  const navigate = useNavigate()
  const id = clubIdentity(club)
  const ladder = club.ladder ?? []
  if (ladder.length === 0 || !club.leagueId) return null
  const short = club.leagueName?.replace(/\s*-\s*a grade.*/i, '') ?? 'the league'

  return (
    <Section band>
      <SectionHead
        kicker={club.season ?? undefined}
        title={<>{short.toUpperCase()} <span style={{ color: id.accent }}>LADDER</span></>}
        sub={`Where ${club.clubName} sits among its rivals right now.`}
        to={leaguePath(club.leagueId)} toLabel="Full league page"
      />
      <Reveal>
        <div className="gn-card" style={{ overflow: 'hidden' }}>
          <div className="font-condensed cl-grid" style={{ display: 'grid', gap: 10, alignItems: 'center', padding: '12px clamp(12px, 2vw, 22px)', borderBottom: `2px solid ${TEXT}`, fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: FAINT }}>
            <span>Pos</span><span>Club</span>
            <span className="hide-sm" style={{ textAlign: 'center' }}>P</span>
            <span style={{ textAlign: 'center' }}>W-L{ladder.some(r => r.draws > 0) ? '-D' : ''}</span>
            <span style={{ textAlign: 'right' }}>%</span>
            <span style={{ textAlign: 'right' }}>Pts</span>
          </div>
          {ladder.map((r, i) => {
            const pos = r.position ?? i + 1
            const me = r.isThisClub
            const top4 = pos <= 4
            return (
              <button key={r.clubId} onClick={() => navigate(teamPath(r.clubId))} className="gn-row cl-grid"
                aria-label={`${r.clubName}, position ${pos}${me ? ', this club' : ''}`}
                style={{
                  width: '100%', display: 'grid', gap: 10, alignItems: 'center', textAlign: 'left', font: 'inherit', color: TEXT,
                  padding: '12px clamp(12px, 2vw, 22px)', border: 'none', cursor: 'pointer', borderBottom: `1px solid ${LINE}`,
                  borderLeft: `3px solid ${me ? id.accent : top4 ? GOLD : 'transparent'}`,
                  background: me ? id.wash : top4 ? 'rgba(244,193,77,0.05)' : 'transparent',
                }}>
                <span className="font-display" style={{ fontSize: 19, color: me ? id.accent : top4 ? GOLD_DK : FAINT }}>{pos}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <TeamLogo name={r.clubName} size={30} />
                  <span className="font-display" style={{ fontSize: 15.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: me ? undefined : undefined }}>
                    {r.clubName.toUpperCase()}{me && <span className="font-condensed" style={{ color: id.accent, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', marginLeft: 8 }}>THIS CLUB</span>}
                  </span>
                </span>
                <span className="hide-sm" style={{ textAlign: 'center', color: MUTE, fontSize: 13 }}>{r.played}</span>
                <span className="font-display" style={{ textAlign: 'center', fontSize: 15 }}>{r.wins}-{r.losses}{r.draws > 0 ? `-${r.draws}` : ''}</span>
                <span style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: r.percentage >= 100 ? TEXT : MUTE }}>{r.percentage ? r.percentage.toFixed(0) : '·'}</span>
                <span className="font-display" style={{ textAlign: 'right', fontSize: 18, color: me ? id.accent : TEXT }}>{r.points}</span>
              </button>
            )
          })}
        </div>
      </Reveal>
      <style>{`
        .cl-grid { grid-template-columns: 42px minmax(0,1fr) 40px 72px 52px 52px; }
        @media (max-width: 820px) { .cl-grid { grid-template-columns: 34px minmax(0,1fr) 62px 44px 44px; } }
      `}</style>
    </Section>
  )
}

// ─── Club news ────────────────────────────────────────────────────────────────
export function ClubNews({ club }: { club: ClubProfile }) {
  const [, bump] = useState(0)
  useEffect(() => { loadPublished().then(() => bump(x => x + 1)) }, [])
  const norm = (s: string) => s.toLowerCase().trim()
  const key = norm(club.clubName)
  const mine = allArticles().filter(a => a.tags.club && (norm(a.tags.club).includes(key) || key.includes(norm(a.tags.club))))
  const items = (mine.length ? mine : allArticles().filter(a => club.leagueName && a.tags.league && norm(a.tags.league).includes(norm(club.leagueName.replace(/\s*-\s*a grade.*/i, ''))))).slice(0, 3)
  const fill = items.length < 3 ? allArticles().filter(a => !items.includes(a)).slice(0, 3 - items.length) : []
  const list = [...items, ...fill].slice(0, 3)
  if (list.length === 0) return null

  return (
    <Section>
      <SectionHead
        title={<>CLUB <span style={{ color: PINK }}>NEWS</span></>}
        sub={mine.length ? `The latest on ${club.clubName}.` : 'Coverage from around the league and the national game.'}
        to="/news" toLabel="All stories"
      />
      <div className="cnews-grid" style={{ display: 'grid', gap: 16 }}>
        {list.map((a, i) => (
          <Reveal key={a.slug} delay={i * 0.05}>
            <Link to={newsPath(a.slug)} className="gn-card gn-card-hover cnews-card" style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', color: TEXT, overflow: 'hidden', height: '100%' }}>
              <EditorialImage seed={a.heroSeed} ratio="16 / 10" rounded={0} />
              <div style={{ padding: '15px 18px 18px', display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
                <Tag color={categoryOf(a.category).accent === '#111111' ? PINK : categoryOf(a.category).accent}>{categoryOf(a.category).label}</Tag>
                <span className="font-display" style={{ fontSize: 18, lineHeight: 1.03, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.title.toUpperCase()}</span>
                <span style={{ marginTop: 'auto' }}><NewsMeta a={a} /></span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
      <style>{`
        .cnews-grid { grid-template-columns: repeat(3, 1fr); }
        @media (max-width: 780px) { .cnews-grid { grid-template-columns: 1fr; } }
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

// ─── Claim + links (invites the data we don't have yet) ──────────────────────
export function ClubClaim({ club }: { club: ClubProfile }) {
  const id = clubIdentity(club)
  const links: { icon: React.ReactNode; label: string; href: string }[] = []
  if (club.websiteUrl) links.push({ icon: <Globe size={15} aria-hidden />, label: 'Website', href: club.websiteUrl })
  if (club.facebookUrl) links.push({ icon: <Globe size={15} aria-hidden />, label: 'Facebook', href: club.facebookUrl })
  if (club.instagramUrl) links.push({ icon: <Globe size={15} aria-hidden />, label: 'Instagram', href: club.instagramUrl })
  const subject = encodeURIComponent(`Claim club profile: ${club.clubName}`)

  return (
    <Section>
      {links.length > 0 && (
        <Reveal>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
            {links.map(l => (
              <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="gn-card gn-card-hover font-condensed"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '11px 18px', textDecoration: 'none', color: TEXT, fontWeight: 700, letterSpacing: '0.04em', fontSize: 13.5 }}>
                <span style={{ color: id.accent }}>{l.icon}</span>{l.label}
              </a>
            ))}
          </div>
        </Reveal>
      )}
      <Reveal>
        <div className="gn-card" style={{ overflow: 'hidden', background: INK, border: 'none' }}>
          <div style={{ padding: 'clamp(26px, 4vw, 40px)', position: 'relative' }}>
            <div aria-hidden style={{ position: 'absolute', inset: 0, background: `radial-gradient(60% 100% at 100% 0%, ${id.wash}, transparent 70%)` }} />
            <div style={{ position: 'relative', display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ maxWidth: 560 }}>
                <div className="font-condensed" style={{ color: GOLD, fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10 }}>Club officials</div>
                <h2 className="font-display" style={{ color: '#fff', fontSize: 'clamp(1.7rem, 4vw, 2.6rem)', lineHeight: 0.95, margin: '0 0 10px' }}>IS THIS YOUR CLUB?</h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14.5, lineHeight: 1.6, margin: 0 }}>
                  Claim {club.clubName} to add your logo and colours, home ground, premiership honours, sponsors, photos and links.
                  Your national profile then updates automatically every Monday.
                </p>
              </div>
              <a href={`mailto:hello@gotnetty.com.au?subject=${subject}`} className="btn-pink font-condensed"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '1rem 2rem', fontSize: '0.9rem', fontWeight: 800, letterSpacing: '0.08em', border: 'none', whiteSpace: 'nowrap' }}>
                CLAIM THIS CLUB <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  )
}

// shared
function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}
export { ordinal }
