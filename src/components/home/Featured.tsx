/**
 * This Week's Spotlight: the strongest league and the national number one,
 * side by side in an asymmetric pair. The club card carries a real rank
 * sparkline drawn from ranking history.
 */
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Trophy } from 'lucide-react'
import { useAsync, fetchLeague, fetchClub, teamPath, leaguePath, strengthStars, strengthLabel, type LeagueDetail, type ClubProfile, type RankingEntry } from '../../lib/rankings'
import { TeamLogo, StarStrength, FormPips } from '../rankings/bits'
import { Section, SectionHead, Reveal, Skel, Move, EASE, TEXT, MUTE, FAINT, LINE, PINK, GOLD_DK, BAND } from './ui'
import type { LeagueRow } from './useHomeData'

export default function Featured({ league, club }: { league: LeagueRow | null; club: RankingEntry | null }) {
  if (!league && !club) return null
  return (
    <Section>
      <SectionHead
        title={<>THIS WEEK&rsquo;S <span style={{ color: PINK }}>SPOTLIGHT</span></>}
        sub="The competition setting the national standard, and the club sitting on top of it."
      />
      <div className="feat-grid" style={{ display: 'grid', gap: 18 }}>
        {league && <FeaturedLeague id={league.id} fallback={league} />}
        {club && <FeaturedClub clubId={club.clubId} />}
      </div>
      <style>{`
        .feat-grid { grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); }
        @media (max-width: 860px) { .feat-grid { grid-template-columns: 1fr; } }
      `}</style>
    </Section>
  )
}

const label: React.CSSProperties = { fontSize: 10.5, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(17,17,17,0.38)' }

function FeaturedLeague({ id, fallback }: { id: string; fallback: LeagueRow }) {
  const { data, loading } = useAsync<LeagueDetail>(() => fetchLeague(id), [id])
  const stars = strengthStars(data?.strengthScore ?? fallback.strengthScore)
  const leader = data?.ladder?.find(t => t.position === 1) ?? data?.ladder?.[0] ?? null
  const topRanked = data?.rankedTeams?.length ? [...data.rankedTeams].sort((a, b) => a.rank - b.rank)[0] : null
  const clubCount = data?.ladder?.length ?? fallback.clubCount

  return (
    <Reveal>
      <Link to={leaguePath(id)} className="gn-card gn-card-hover" aria-label={`${fallback.name}, league of the week`}
        style={{ display: 'block', textDecoration: 'none', color: TEXT, overflow: 'hidden', height: '100%' }}>
        {/* Court-line header band */}
        <div style={{ position: 'relative', padding: '22px 24px 18px', background: `linear-gradient(120deg, #101218, #23180f)`, overflow: 'hidden' }}>
          <svg aria-hidden viewBox="0 0 600 120" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4 }}>
            <g fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1.4">
              <circle cx="500" cy="60" r="52" />
              <path d="M-20 120 A 130 130 0 0 1 240 120" stroke="rgba(244,193,77,0.5)" />
              <line x1="330" y1="-10" x2="330" y2="130" stroke="rgba(255,255,255,0.09)" />
            </g>
          </svg>
          <div className="font-condensed" style={{ ...label, color: 'rgba(255,255,255,0.5)', position: 'relative' }}>League of the Week</div>
          <div className="font-display" style={{ position: 'relative', color: '#fff', fontSize: 'clamp(1.7rem, 3.4vw, 2.5rem)', lineHeight: 0.95, marginTop: 8 }}>
            {fallback.name.toUpperCase()}
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <StarStrength stars={stars} size={13} />
            <span className="font-condensed" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {strengthLabel(stars)} · {fallback.stateName || fallback.state}
            </span>
          </div>
        </div>

        <div style={{ padding: '18px 24px 22px', display: 'grid', gap: 14 }}>
          <FactRow label="Ladder leader" loading={loading}
            value={leader ? <NameWithCrest name={leader.clubName} sub={`${leader.wins}-${leader.losses}${leader.draws ? `-${leader.draws}` : ''} this season`} /> : <Muted>Season pending</Muted>} />
          <FactRow label="Top ranked club" loading={loading}
            value={topRanked ? <NameWithCrest name={topRanked.clubName} sub={`#${topRanked.rank} nationally · rating ${topRanked.powerRating.toFixed(1)}`} /> : <Muted>Not yet ranked</Muted>} />
          <div style={{ display: 'flex', gap: 26, borderTop: `1px solid ${LINE}`, paddingTop: 14 }}>
            <span><span className="font-display" style={{ fontSize: 24, display: 'block', lineHeight: 1 }}>{clubCount}</span><span className="font-condensed" style={label}>Clubs</span></span>
            <span><span className="font-display" style={{ fontSize: 24, display: 'block', lineHeight: 1 }}>{data?.rankedTeams?.length ?? 0}</span><span className="font-condensed" style={label}>Nationally ranked</span></span>
            {fallback.lastSyncedAt && (
              <span><span className="font-display" style={{ fontSize: 24, display: 'block', lineHeight: 1 }}>{daysAgo(fallback.lastSyncedAt)}</span><span className="font-condensed" style={label}>Last updated</span></span>
            )}
            <span className="font-condensed" style={{ marginLeft: 'auto', alignSelf: 'end', display: 'inline-flex', alignItems: 'center', gap: 6, color: PINK, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: 11.5 }}>
              League profile <ArrowRight size={13} />
            </span>
          </div>
        </div>
      </Link>
    </Reveal>
  )
}

function FeaturedClub({ clubId }: { clubId: string }) {
  const { data, loading } = useAsync<ClubProfile>(() => fetchClub(clubId), [clubId])
  const reduced = useReducedMotion()

  return (
    <Reveal delay={0.08}>
      <Link to={teamPath(clubId)} className="gn-card gn-card-hover" aria-label={data ? `${data.clubName}, national number one` : 'Club of the week'}
        style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', color: TEXT, overflow: 'hidden', height: '100%' }}>
        <div style={{ padding: '22px 24px 0' }}>
          <div className="font-condensed" style={{ ...label, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Trophy size={12} color={GOLD_DK} aria-hidden /> National No. 1
          </div>

          {loading && (
            <div style={{ padding: '18px 0 24px' }}>
              <Skel w={72} h={72} r={36} style={{ marginBottom: 14 }} />
              <Skel w="70%" h={26} style={{ marginBottom: 8 }} /><Skel w="45%" h={12} />
            </div>
          )}

          {!loading && data && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '16px 0 4px' }}>
                <TeamLogo name={data.clubName} size={72} />
                <div style={{ minWidth: 0 }}>
                  <div className="font-display" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.1rem)', lineHeight: 0.95 }}>{data.clubName.toUpperCase()}</div>
                  <div className="font-condensed" style={{ color: MUTE, fontSize: 12.5, marginTop: 5, letterSpacing: '0.04em' }}>
                    {data.leagueName ?? 'Community Football'}{data.state ? ` · ${data.state}` : ''}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 22, alignItems: 'baseline', marginTop: 14 }}>
                <span><span className="font-display" style={{ fontSize: 34, color: PINK, lineHeight: 1 }}>{data.powerRating?.toFixed(1) ?? '0.0'}</span><span className="font-condensed" style={{ ...label, display: 'block', marginTop: 3 }}>Rating</span></span>
                <span><span className="font-display" style={{ fontSize: 34, lineHeight: 1 }}>{data.record.wins}-{data.record.losses}{data.record.draws ? `-${data.record.draws}` : ''}</span><span className="font-condensed" style={{ ...label, display: 'block', marginTop: 3 }}>Record</span></span>
                <span style={{ marginLeft: 'auto', alignSelf: 'center' }}><Move delta={data.rankMovement} size={13} /></span>
              </div>

              <div style={{ marginTop: 12 }}><FormPips form={data.recentForm} /></div>
            </>
          )}
        </div>

        {/* Rank journey sparkline */}
        <div style={{ marginTop: 'auto', padding: '16px 0 0' }}>
          {!loading && data && data.history.length >= 2
            ? <RankSpark history={data.history} reduced={!!reduced} />
            : <div style={{ height: 58, background: BAND, display: 'grid', placeItems: 'center' }}>
                <span className="font-condensed" style={{ ...label }}>{loading ? '' : 'Rank history builds week by week'}</span>
              </div>}
        </div>
      </Link>
    </Reveal>
  )
}

/** Rank-over-time sparkline. Lower rank = higher line. */
function RankSpark({ history, reduced }: { history: ClubProfile['history']; reduced: boolean }) {
  const pts = history.slice(-10)
  const W = 400, H = 58, PADX = 18, PADY = 12
  const ranks = pts.map(p => p.rank)
  const min = Math.min(...ranks), max = Math.max(...ranks)
  const x = (i: number) => PADX + (i / Math.max(1, pts.length - 1)) * (W - PADX * 2)
  const y = (r: number) => max === min ? H / 2 : PADY + ((r - min) / (max - min)) * (H - PADY * 2)
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.rank).toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]

  return (
    <div style={{ background: BAND, position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={`National rank over the last ${pts.length} weeks, currently ${last.rank}`}>
        <motion.path d={d} fill="none" stroke={PINK} strokeWidth={2.2} strokeLinecap="round"
          initial={{ pathLength: reduced ? 1 : 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.1, ease: EASE }} />
        <circle cx={x(pts.length - 1)} cy={y(last.rank)} r={3.4} fill={PINK} />
      </svg>
      <span className="font-condensed" style={{ position: 'absolute', top: 8, left: 24, fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: FAINT }}>
        Rank journey · {pts.length} weeks
      </span>
    </div>
  )
}

function FactRow({ label: l, value, loading }: { label: string; value: React.ReactNode; loading: boolean }) {
  return (
    <div>
      <div className="font-condensed" style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(17,17,17,0.38)', marginBottom: 7 }}>{l}</div>
      {loading ? <Skel w="55%" h={16} /> : value}
    </div>
  )
}

function NameWithCrest({ name, sub }: { name: string; sub: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <TeamLogo name={name} size={30} />
      <span style={{ minWidth: 0 }}>
        <span className="font-display" style={{ display: 'block', fontSize: 17, lineHeight: 1 }}>{name.toUpperCase()}</span>
        <span className="font-condensed" style={{ display: 'block', color: MUTE, fontSize: 11.5, marginTop: 2 }}>{sub}</span>
      </span>
    </span>
  )
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span className="font-condensed" style={{ color: MUTE, fontSize: 13 }}>{children}</span>
}

function daysAgo(iso: string): string {
  const d = Math.max(0, Math.floor((Date.now() - +new Date(iso)) / 86400000))
  return d === 0 ? 'Today' : `${d}d`
}
