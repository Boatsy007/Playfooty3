/**
 * Statistics Hub UI.
 * Read-only public page using existing rankings, leagues and news data.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { Clock, Minus, TrendingDown, TrendingUp, Trophy } from 'lucide-react'
import Nav from '../components/layout/Nav'
import Ticker from '../components/layout/Ticker'
import Footer from '../components/layout/Footer'
import { loadPublished, latestArticles, newsPath, formatDate, type Article } from '../news/content'

type FormResult = 'W' | 'L' | 'D'

interface ApiEntry {
  rank: number
  previousRank: number | null
  rankMovement: number
  clubId: string
  clubName: string
  leagueName: string
  state: string
  powerRating: number
  record?: { wins: number; losses: number; draws: number; played: number }
  recentForm: FormResult[]
  calculatedAt?: string
}

interface LeagueStatRow {
  id: string
  name: string
  state: string
  stateName?: string
  strengthScore: number
  clubCount: number
  lastSyncedAt?: string | null
}

interface StatisticsData {
  rankings: ApiEntry[]
  leagues: LeagueStatRow[]
  meta: { weekLabel: string | null; season: string | null; total: number; generatedAt?: string }
  articles: Article[]
}

const NAVY = '#062a5f'
const PINK = '#ff2c91'
const LINE = '#dbe3ee'
const TEXT = '#111827'
const MUTED = '#65758b'

async function fetchStatisticsData(): Promise<StatisticsData> {
  const [rankingsRes, leaguesRes] = await Promise.all([fetch('/api/rankings'), fetch('/api/leagues')])
  if (!rankingsRes.ok) throw new Error(`Rankings HTTP ${rankingsRes.status}`)
  if (!leaguesRes.ok) throw new Error(`Leagues HTTP ${leaguesRes.status}`)
  const rankingsJson = await rankingsRes.json() as { data: ApiEntry[]; meta: StatisticsData['meta'] }
  const leaguesJson = await leaguesRes.json() as { data: LeagueStatRow[] }
  await loadPublished()
  return {
    rankings: rankingsJson.data ?? [],
    leagues: leaguesJson.data ?? [],
    meta: rankingsJson.meta,
    articles: latestArticles(5),
  }
}

export default function PowerRankings() {
  const [data, setData] = useState<StatisticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    fetchStatisticsData()
      .then(next => { if (alive) setData(next) })
      .catch(err => { if (alive) setError(String(err)) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const rankings = data?.rankings ?? []
  const leagues = (data?.leagues ?? []).filter(l => l.clubCount > 0)
  const moved = rankings.filter(r => r.previousRank != null && r.rankMovement !== 0)
  const climbers = [...moved].filter(r => r.rankMovement > 0).sort((a, b) => b.rankMovement - a.rankMovement).slice(0, 6)
  const fallers = [...moved].filter(r => r.rankMovement < 0).sort((a, b) => a.rankMovement - b.rankMovement).slice(0, 6)
  const topClubs = rankings.slice(0, 6)
  const highestRated = [...rankings].sort((a, b) => b.powerRating - a.powerRating).slice(0, 6)
  const fastestRising = climbers.filter(c => c.rank <= 100).slice(0, 6)
  const strongestLeagues = [...leagues].sort((a, b) => b.strengthScore - a.strengthScore).slice(0, 6)
  const competitiveLeagues = [...leagues].filter(l => l.clubCount >= 6).sort((a, b) => b.clubCount - a.clubCount || b.strengthScore - a.strengthScore).slice(0, 6)
  const recentLeagues = [...leagues].filter(l => l.lastSyncedAt).sort((a, b) => +new Date(b.lastSyncedAt!) - +new Date(a.lastSyncedAt!)).slice(0, 6)
  const topStates = groupClubsByState(rankings)
  const leagueStates = groupLeaguesByState(leagues)
  const strongestLeague = strongestLeagues[0]
  const biggestMover = climbers[0]
  const updatedLabel = data?.meta.generatedAt ? new Date(data.meta.generatedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Latest update'

  return (
    <>
      <Ticker />
      <Nav />
      <main className="stats-hub">
        <section className="stats-header">
          <div>
            <span className="stats-live"><Clock size={14} /> Statistics hub</span>
            <h1>Statistics</h1>
            <p>Explore national country netball rankings, league strength, club movement and weekly performance trends.</p>
          </div>
          <div className="stats-header-grid">
            <HeaderStat label="Season / week" value={data?.meta.weekLabel ?? 'Current rankings'} sub={data?.meta.season ? `Season ${data.meta.season}` : undefined} />
            <HeaderStat label="Last updated" value={updatedLabel} />
            <HeaderStat label="Clubs" value={loading ? '—' : String(data?.meta.total ?? rankings.length)} />
            <HeaderStat label="Leagues" value={loading ? '—' : String(leagues.length)} />
          </div>
        </section>

        {loading && <StatsLoading />}
        {error && !loading && <StatsEmpty title="Statistics unavailable" text="The statistics feed could not be loaded. Please try again shortly." />}

        {!loading && !error && data && (
          <section className="stats-layout">
            <div className="stats-main">
              <div className="stats-feature-grid">
                {topClubs[0] && <FeatureClub title="Highest ranked club" club={topClubs[0]} />}
                {strongestLeague && <FeatureLeague title="Strongest league" league={strongestLeague} rank={1} />}
                {biggestMover && <FeatureClub title="Biggest mover" club={biggestMover} accent="#16a34a" />}
              </div>

              <ClubStatSection title="Highest Ranked Clubs" subtitle="The clubs setting the national standard." clubs={topClubs} metric="rank" />
              <LeagueStatSection title="Strongest Leagues" subtitle="Competitions with the strongest current rating." leagues={strongestLeagues} />
              <ClubStatSection title="Biggest Movers" subtitle="Clubs climbing fastest in the latest update." clubs={climbers} metric="movement" />
              <ClubStatSection title="Biggest Fallers" subtitle="Clubs dropping most in the latest update." clubs={fallers} metric="movement" />
              <ClubStatSection title="Fastest Rising Clubs" subtitle="Current Top 100 clubs with major upward momentum." clubs={fastestRising} metric="movement" />
              <ClubStatSection title="Highest Rated Clubs" subtitle="The best power ratings in the country right now." clubs={highestRated} metric="rating" />
              <LeagueStatSection title="Most Competitive Leagues" subtitle="Deep competitions with strong club depth." leagues={competitiveLeagues} mode="depth" />
              <LeagueStatSection title="Latest Updated Leagues" subtitle="Recently refreshed competition data." leagues={recentLeagues} mode="updated" />
              <StateClubSection groups={topStates} />
              <StateLeagueSection groups={leagueStates} />
            </div>

            <aside className="stats-sidebar">
              <SidebarPanel title="Latest Rankings">{topClubs.slice(0, 4).map(club => <MiniClub key={club.clubId} club={club} />)}</SidebarPanel>
              {strongestLeague && <SidebarPanel title="Strongest League"><MiniLeague league={strongestLeague} rank={1} /></SidebarPanel>}
              {biggestMover && <SidebarPanel title="Biggest Mover"><MiniClub club={biggestMover} /></SidebarPanel>}
              <SidebarPanel title="Latest News">
                {data.articles.slice(0, 4).map(article => <MiniArticle key={article.slug} article={article} />)}
                {data.articles.length === 0 && <p className="stats-muted">Latest articles will appear here when published.</p>}
              </SidebarPanel>
              <div className="stats-sponsor"><span>Partner slot</span><strong>Put your brand beside national netball data.</strong></div>
            </aside>
          </section>
        )}
      </main>
      <Footer />
      <StatisticsHubStyles />
    </>
  )
}

function HeaderStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <div className="stats-header-card"><span>{label}</span><strong>{value}</strong>{sub && <small>{sub}</small>}</div>
}

function StatsLoading() {
  return <section className="stats-loading">{Array.from({ length: 8 }).map((_, i) => <span key={i} />)}</section>
}

function StatsEmpty({ title, text }: { title: string; text: string }) {
  return <section className="stats-empty"><Trophy size={32} /><h2>{title}</h2><p>{text}</p></section>
}

function FeatureClub({ title, club, accent = PINK }: { title: string; club: ApiEntry; accent?: string }) {
  return <a className="feature-stat" style={{ borderTopColor: accent }} href={`/team/${club.clubId}`}><span>{title}</span><strong>#{club.rank} {club.clubName}</strong><small>{club.leagueName} · {club.state}</small><b style={{ color: accent }}>{club.powerRating.toFixed(1)}</b></a>
}

function FeatureLeague({ title, league, rank }: { title: string; league: LeagueStatRow; rank: number }) {
  return <a className="feature-stat" style={{ borderTopColor: '#f4c14d' }} href={`/league/${league.id}`}><span>{title}</span><strong>#{rank} {league.name}</strong><small>{league.state} · {league.clubCount} clubs</small><b>{strengthStarsFromScore(league.strengthScore)}★</b></a>
}

function ClubStatSection({ title, subtitle, clubs, metric }: { title: string; subtitle: string; clubs: ApiEntry[]; metric: 'rank' | 'movement' | 'rating' }) {
  if (clubs.length === 0) return null
  return <section className="stat-section"><SectionTitle title={title} subtitle={subtitle} /><div className="stat-card-grid">{clubs.map(club => <ClubStatCard key={club.clubId} club={club} metric={metric} />)}</div></section>
}

function LeagueStatSection({ title, subtitle, leagues, mode = 'strength' }: { title: string; subtitle: string; leagues: LeagueStatRow[]; mode?: 'strength' | 'depth' | 'updated' }) {
  if (leagues.length === 0) return null
  return <section className="stat-section"><SectionTitle title={title} subtitle={subtitle} /><div className="stat-card-grid">{leagues.map((league, i) => <LeagueStatCard key={league.id} league={league} rank={i + 1} mode={mode} />)}</div></section>
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <header className="stat-section-head"><div><span>Go Netty data</span><h2>{title}</h2></div><p>{subtitle}</p></header>
}

function ClubStatCard({ club, metric }: { club: ApiEntry; metric: 'rank' | 'movement' | 'rating' }) {
  const value = metric === 'rating' ? club.powerRating.toFixed(1) : metric === 'movement' ? movementLabel(club.rankMovement) : `#${club.rank}`
  return <a className="stat-card" href={`/team/${club.clubId}`}><div className="stat-mark">{initials(club.clubName)}</div><div><strong>{club.clubName}</strong><small>{club.leagueName} · {club.state}</small><span>{recordLabel(club)}</span></div><b>{value}</b><MovementBadge delta={club.rankMovement} /></a>
}

function LeagueStatCard({ league, rank, mode }: { league: LeagueStatRow; rank: number; mode: 'strength' | 'depth' | 'updated' }) {
  const value = mode === 'depth' ? `${league.clubCount} clubs` : mode === 'updated' ? updatedShort(league.lastSyncedAt) : `${strengthStarsFromScore(league.strengthScore)}★`
  return <a className="stat-card" href={`/league/${league.id}`}><div className="stat-mark navy">{initials(league.name)}</div><div><strong>{league.name}</strong><small>{league.stateName ?? league.state}</small><span>Strength {Math.round(league.strengthScore)}</span></div><b>{value}</b><em>#{rank}</em></a>
}

function StateClubSection({ groups }: { groups: { state: string; clubs: ApiEntry[]; avg: number }[] }) {
  if (groups.length === 0) return null
  return <section className="stat-section"><SectionTitle title="Top Clubs by State" subtitle="State leaders from the current national rankings." /><div className="state-grid">{groups.map(group => <div className="state-card" key={group.state}><strong>{group.state}</strong><span>Avg rating {group.avg.toFixed(1)}</span>{group.clubs.map(c => <a href={`/team/${c.clubId}`} key={c.clubId}>#{c.rank} {c.clubName}</a>)}</div>)}</div></section>
}

function StateLeagueSection({ groups }: { groups: { state: string; leagues: LeagueStatRow[]; avg: number }[] }) {
  if (groups.length === 0) return null
  return <section className="stat-section"><SectionTitle title="Top Leagues by State" subtitle="Strongest competitions grouped by state." /><div className="state-grid">{groups.map(group => <div className="state-card" key={group.state}><strong>{group.state}</strong><span>Avg strength {Math.round(group.avg)}</span>{group.leagues.map(l => <a href={`/league/${l.id}`} key={l.id}>{l.name}</a>)}</div>)}</div></section>
}

function SidebarPanel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="sidebar-panel"><h3>{title}</h3>{children}</section>
}

function MiniClub({ club }: { club: ApiEntry }) {
  return <a className="mini-row" href={`/team/${club.clubId}`}><span>#{club.rank}</span><strong>{club.clubName}</strong><small>{club.state}</small></a>
}

function MiniLeague({ league, rank }: { league: LeagueStatRow; rank: number }) {
  return <a className="mini-row" href={`/league/${league.id}`}><span>#{rank}</span><strong>{league.name}</strong><small>{league.state} · {league.clubCount} clubs</small></a>
}

function MiniArticle({ article }: { article: Article }) {
  return <a className="mini-row article" href={newsPath(article.slug)}><span>{formatDate(article.date)}</span><strong>{article.title}</strong><small>{article.summary}</small></a>
}

function MovementBadge({ delta }: { delta: number }) {
  const up = delta > 0
  const down = delta < 0
  return <i className={up ? 'move up' : down ? 'move down' : 'move'}>{up ? <TrendingUp size={12} /> : down ? <TrendingDown size={12} /> : <Minus size={12} />}{delta === 0 ? '—' : Math.abs(delta)}</i>
}

function groupClubsByState(rankings: ApiEntry[]) {
  return Object.entries(rankings.reduce<Record<string, ApiEntry[]>>((acc, club) => {
    ;(acc[club.state] ||= []).push(club)
    return acc
  }, {})).map(([state, clubs]) => ({ state, clubs: clubs.sort((a, b) => a.rank - b.rank).slice(0, 3), avg: clubs.reduce((sum, c) => sum + c.powerRating, 0) / clubs.length })).sort((a, b) => b.avg - a.avg).slice(0, 6)
}

function groupLeaguesByState(leagues: LeagueStatRow[]) {
  return Object.entries(leagues.reduce<Record<string, LeagueStatRow[]>>((acc, league) => {
    ;(acc[league.state] ||= []).push(league)
    return acc
  }, {})).map(([state, rows]) => ({ state, leagues: rows.sort((a, b) => b.strengthScore - a.strengthScore).slice(0, 3), avg: rows.reduce((sum, l) => sum + l.strengthScore, 0) / rows.length })).sort((a, b) => b.avg - a.avg).slice(0, 6)
}

function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() }
function movementLabel(delta: number) { return delta > 0 ? `+${delta}` : delta < 0 ? `-${Math.abs(delta)}` : '—' }
function recordLabel(club: ApiEntry) { return club.record ? `${club.record.wins}-${club.record.losses}${club.record.draws ? `-${club.record.draws}` : ''}` : 'Record unavailable' }
function strengthStarsFromScore(score: number) { return Math.max(1, Math.min(5, Math.round(score / 20))) }
function updatedShort(value?: string | null) { return value ? new Date(value).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—' }

function StatisticsHubStyles() {
  return <style>{`
    .stats-hub{background:#fff;color:${TEXT};min-height:100vh}.stats-header{max-width:1180px;margin:0 auto;padding:34px 20px 22px;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(360px,.9fr);gap:20px;align-items:end;border-bottom:1px solid ${LINE}}.stats-live{display:inline-flex;align-items:center;gap:8px;background:${NAVY};color:#fff;border-radius:999px;padding:8px 11px;text-transform:uppercase;letter-spacing:.16em;font:800 11px/1 var(--font-condensed,inherit)}.stats-header h1{font:950 clamp(3rem,8vw,6.6rem)/.86 var(--font-display,inherit);letter-spacing:-.06em;text-transform:uppercase;margin:16px 0 12px;color:${NAVY}}.stats-header p{margin:0;max-width:64ch;color:${MUTED};font-size:16px;line-height:1.65}.stats-header-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.stats-header-card{border:1px solid ${LINE};border-top:4px solid ${PINK};border-radius:18px;padding:15px 16px;background:#fff;box-shadow:0 14px 30px rgba(6,42,95,.06)}.stats-header-card span,.stat-section-head span{display:block;color:${MUTED};text-transform:uppercase;letter-spacing:.17em;font:800 10px/1 var(--font-condensed,inherit);margin-bottom:8px}.stats-header-card strong{display:block;color:${TEXT};font:950 24px/1 var(--font-display,inherit);letter-spacing:-.04em}.stats-header-card small{display:block;color:${MUTED};margin-top:5px}.stats-layout{max-width:1180px;margin:0 auto;padding:22px 20px 52px;display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:20px;align-items:start}.stats-main{display:grid;gap:22px}.stats-feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.feature-stat{display:flex;flex-direction:column;gap:9px;min-height:178px;border-radius:22px;padding:20px;color:#fff;text-decoration:none;background:linear-gradient(135deg,${NAVY},#0b3f86);box-shadow:0 18px 45px rgba(6,42,95,.14);position:relative;overflow:hidden;border-top:4px solid ${PINK}}.feature-stat:after{content:"";position:absolute;inset:auto -20px -40px auto;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,.08)}.feature-stat span{font:900 10px/1 var(--font-condensed,inherit);letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.64)}.feature-stat strong{font:950 28px/.98 var(--font-display,inherit);letter-spacing:-.04em;text-transform:uppercase}.feature-stat small{color:rgba(255,255,255,.72)}.feature-stat b{margin-top:auto;font:950 38px/.85 var(--font-display,inherit);color:#f4c14d}.stat-section{background:#fff;border:1px solid ${LINE};border-radius:24px;padding:20px;box-shadow:0 16px 40px rgba(6,42,95,.06)}.stat-section-head{display:flex;align-items:end;justify-content:space-between;gap:18px;border-bottom:1px solid ${LINE};padding-bottom:16px;margin-bottom:16px}.stat-section-head h2{margin:0;color:${NAVY};font:950 clamp(1.7rem,3vw,2.5rem)/.92 var(--font-display,inherit);letter-spacing:-.04em;text-transform:uppercase}.stat-section-head p{margin:0;color:${MUTED};font-size:13px}.stat-card-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.stat-card{display:grid;grid-template-columns:46px minmax(0,1fr) auto;gap:12px;align-items:center;min-height:92px;padding:14px;border:1px solid ${LINE};border-radius:18px;text-decoration:none;color:${TEXT};background:#fff;position:relative;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}.stat-card:hover{transform:translateY(-2px);border-color:rgba(255,44,145,.38);box-shadow:0 14px 28px rgba(6,42,95,.09)}.stat-mark{width:46px;height:46px;border-radius:999px;display:grid;place-items:center;background:${PINK};color:#fff;font:950 13px/1 var(--font-condensed,inherit);letter-spacing:.08em}.stat-mark.navy{background:${NAVY}}.stat-card strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.stat-card small,.stat-card span{display:block;color:${MUTED};font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.stat-card b{font:950 24px/1 var(--font-display,inherit);color:${NAVY}}.stat-card em{position:absolute;right:12px;bottom:10px;font-style:normal;color:${PINK};font:950 12px/1 var(--font-condensed,inherit)}.move{position:absolute;right:12px;bottom:10px;display:inline-flex;align-items:center;gap:4px;color:${MUTED};font-style:normal;font-weight:900;font-size:12px}.move.up{color:#16a34a}.move.down{color:#dc2626}.state-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.state-card{border:1px solid ${LINE};border-radius:18px;padding:15px;display:grid;gap:8px}.state-card strong{font:950 27px/.9 var(--font-display,inherit);color:${NAVY}}.state-card span{color:${MUTED};font-size:12px}.state-card a{color:${TEXT};text-decoration:none;font-weight:800;font-size:13px}.stats-sidebar{position:sticky;top:96px;display:grid;gap:14px}.sidebar-panel{border:1px solid ${LINE};border-radius:20px;padding:16px;background:#fff;box-shadow:0 14px 35px rgba(6,42,95,.06)}.sidebar-panel h3{margin:0 0 12px;color:${NAVY};font:950 22px/.95 var(--font-display,inherit);text-transform:uppercase}.mini-row{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;padding:11px 0;border-top:1px solid #edf2f7;text-decoration:none;color:${TEXT}}.mini-row:first-of-type{border-top:0}.mini-row span{grid-row:span 2;color:${PINK};font-weight:950}.mini-row strong{font-size:13px}.mini-row small{color:${MUTED};font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mini-row.article{grid-template-columns:1fr}.mini-row.article span{grid-row:auto;color:${MUTED};font-size:10px;text-transform:uppercase;letter-spacing:.12em}.stats-sponsor{border:1px dashed rgba(255,44,145,.45);border-radius:20px;padding:18px;background:linear-gradient(135deg,rgba(255,44,145,.08),rgba(6,42,95,.04))}.stats-sponsor span{display:block;color:${PINK};text-transform:uppercase;letter-spacing:.16em;font-size:10px;font-weight:900;margin-bottom:8px}.stats-sponsor strong{color:${NAVY}}.stats-muted{color:${MUTED};font-size:13px}.stats-loading{max-width:1180px;margin:0 auto;padding:24px 20px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.stats-loading span{height:110px;border-radius:18px;background:linear-gradient(90deg,#f3f6fa,#e8eef6,#f3f6fa);background-size:200% 100%;animation:statsPulse 1.2s infinite}.stats-empty{max-width:720px;margin:32px auto;padding:38px 20px;text-align:center;color:${MUTED}}.stats-empty h2{color:${NAVY};font:950 34px/1 var(--font-display,inherit);text-transform:uppercase;margin:12px 0 6px}@keyframes statsPulse{to{background-position:-200% 0}}@media(max-width:1020px){.stats-header,.stats-layout{grid-template-columns:1fr}.stats-sidebar{position:static;grid-template-columns:repeat(2,1fr)}}@media(max-width:760px){.stats-header{padding:26px 14px 18px}.stats-header-grid,.stats-feature-grid,.stat-card-grid,.state-grid,.stats-sidebar,.stats-loading{grid-template-columns:1fr}.stats-layout{padding:18px 14px 38px}.stat-section{padding:15px;border-radius:20px}.stat-section-head{display:block}.stat-section-head h2{margin:8px 0}.stat-card{grid-template-columns:44px minmax(0,1fr);padding:14px 12px;min-height:104px}.stat-card b{grid-column:2;color:${PINK}}.feature-stat{min-height:156px}.stats-header h1{font-size:clamp(3.2rem,18vw,5.8rem)}}
  `}</style>
}
