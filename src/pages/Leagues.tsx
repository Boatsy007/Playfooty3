/** Public Leagues directory — sports network competitions hub UI only. */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Search } from 'lucide-react'
import Nav from '../components/layout/Nav'
import ProductSearch from '../components/rankings/ProductSearch'
import Footer from '../components/layout/Footer'
import { useSeo } from '../lib/seo'
import { fetchRankings, leaguePath, teamPath, strengthLabel, strengthStars, useAsync, type RankingEntry, type RankingsResponse } from '../lib/rankings'
import { TeamLogo, StarStrength } from '../components/rankings/bits'
import { latestArticles, loadPublished, formatDate, newsPath, type Article } from '../news/content'

interface LeagueRow { id: string; name: string; state: string; stateName: string; strengthScore: number; clubCount: number; lastSyncedAt?: string | null; regionName?: string | null }
type RankedLeague = LeagueRow & { nationalRank: number; topClub?: RankingEntry }

const NAVY = '#062a5f'
const NAVY_2 = '#0b3f86'
const PINK = '#ff2c91'
const TEXT = '#111827'
const MUTED = '#64748b'
const LINE = '#dbe3ee'
const GREEN = '#16a34a'
const RED = '#dc2626'

const fetchLeagues = () => fetch('/api/leagues').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<{ data: LeagueRow[] }> }).then(r => r.data)

export default function Leagues() {
  const { data, loading, error } = useAsync<LeagueRow[]>(fetchLeagues, [])
  const rankings = useAsync<RankingsResponse>(fetchRankings, [])
  const [newsTick, setNewsTick] = useState(0)
  const [q, setQ] = useState('')
  const [state, setState] = useState('All states')

  useEffect(() => { loadPublished().then(() => setNewsTick(x => x + 1)) }, [])

  const ranked = useMemo(() => rankLeagues(data ?? [], rankings.data?.data ?? []), [data, rankings.data])
  const states = useMemo(() => ['All states', ...Array.from(new Set(ranked.map(l => l.state).filter(Boolean))).sort()], [ranked])
  const filtered = useMemo(() => ranked.filter(l => {
    const query = q.trim().toLowerCase()
    const matchesQuery = !query || l.name.toLowerCase().includes(query) || l.state.toLowerCase().includes(query) || l.stateName.toLowerCase().includes(query) || (l.regionName ?? '').toLowerCase().includes(query)
    const matchesState = state === 'All states' || l.state === state
    return matchesQuery && matchesState
  }), [ranked, q, state])
  const latestNews = latestArticles(4)
  const totalRankedClubs = rankings.data?.data?.length ?? 0
  const latestUpdatedAt = ranked.map(l => l.lastSyncedAt).filter(Boolean).sort((a, b) => +new Date(b!) - +new Date(a!))[0] ?? null
  void newsTick

  useSeo({
    title: 'Country Netball Leagues — National Strength Ratings | Got Netty',
    description: 'Every country netball league tracked by Got Netty, with league strength ratings and nationally-ranked teams. Browse leagues by state.',
    path: '/leagues',
  })

  return (
    <div style={{ background: '#fff', minHeight: '100vh', color: TEXT }}>
      <Nav /><ProductSearch />
      <main className="leagues-page">
        <PageHeader
          total={ranked.length}
          rankedClubs={totalRankedClubs}
          updated={latestUpdatedAt}
          week={rankings.data?.meta?.weekLabel ?? null}
          q={q}
          setQ={setQ}
          states={states}
          state={state}
          setState={setState}
        />

        {loading && <Centered>Loading leagues…</Centered>}
        {error && <Centered tone="error">Unable to load leagues right now.</Centered>}

        {!loading && !error && (
          <>
            <FeaturedStrip leagues={ranked} />
            <div className="leagues-layout">
              <section className="league-directory" aria-label="Country netball league directory">
                <div className="directory-toolbar"><b>{filtered.length}</b><span>leagues shown</span><Link to="/rankings">National rankings <ArrowRight size={14} /></Link></div>
                {filtered.length === 0 ? <Centered>No leagues found.</Centered> : <div className="league-grid">{filtered.map(l => <LeagueCard key={l.id} league={l} />)}</div>}
              </section>

              <aside className="leagues-sidebar" aria-label="Leagues page sidebar">
                <StrongestLeagues leagues={ranked} />
                <LatestUpdated leagues={ranked} />
                <LatestNews articles={latestNews} />
                <MoversCard entries={rankings.data?.data ?? []} />
                <ChampionshipTeaser />
              </aside>
            </div>
          </>
        )}
      </main>
      <Footer />
      <LeaguesStyles />
    </div>
  )
}

function rankLeagues(leagues: LeagueRow[], entries: RankingEntry[]): RankedLeague[] {
  const topByLeague = new Map<string, RankingEntry>()
  for (const entry of entries) {
    const current = topByLeague.get(entry.leagueName)
    if (!current || entry.rank < current.rank) topByLeague.set(entry.leagueName, entry)
  }
  return [...leagues]
    .sort((a, b) => b.strengthScore - a.strengthScore)
    .map((league, index) => ({ ...league, nationalRank: index + 1, topClub: topByLeague.get(league.name) }))
}

function PageHeader({ total, rankedClubs, updated, week, q, setQ, states, state, setState }: {
  total: number; rankedClubs: number; updated: string | null; week: string | null; q: string; setQ: (v: string) => void; states: string[]; state: string; setState: (v: string) => void
}) {
  return <header className="leagues-header">
    <div className="header-copy">
      <span className="live-pill"><span /> League directory live</span>
      <h1>Leagues</h1>
      <p>Browse Australia&rsquo;s country netball leagues, ladders and strength ratings.</p>
      <div className="header-stats"><b>{week ?? 'Season live'}</b><b>{total} tracked leagues</b>{rankedClubs > 0 && <b>{rankedClubs} ranked clubs</b>}<b>{updated ? `Updated ${shortDate(updated)}` : 'Updated weekly'}</b></div>
    </div>
    <div className="filters-panel" aria-label="League filters">
      <label className="search-box"><Search size={17} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search leagues, state or region" /></label>
      {states.length > 1 && <select value={state} onChange={e => setState(e.target.value)} aria-label="Filter by state">{states.map(s => <option key={s}>{s}</option>)}</select>}
    </div>
  </header>
}

function FeaturedStrip({ leagues }: { leagues: RankedLeague[] }) {
  if (!leagues.length) return null
  const strongest = leagues[0]
  const latest = [...leagues].filter(l => l.lastSyncedAt).sort((a, b) => +new Date(b.lastSyncedAt!) - +new Date(a.lastSyncedAt!))[0] ?? strongest
  const deepest = [...leagues].sort((a, b) => b.clubCount - a.clubCount)[0]
  const stateCounts = new Map<string, number>()
  leagues.forEach(l => stateCounts.set(l.state, (stateCounts.get(l.state) ?? 0) + 1))
  const featuredState = [...stateCounts.entries()].sort((a, b) => b[1] - a[1])[0]
  return <section className="featured-strip" aria-label="Featured league facts">
    <FeatureTile kicker="Strongest league" league={strongest} detail={`${strengthLabel(strengthStars(strongest.strengthScore))} · #${strongest.nationalRank}`} />
    <FeatureTile kicker="Recently updated" league={latest} detail={`Updated ${updatedLabel(latest.lastSyncedAt)}`} />
    <FeatureTile kicker="Biggest league depth" league={deepest} detail={`${deepest.clubCount} clubs tracked`} />
    {featuredState && <div className="feature-tile state-tile"><span>Featured state</span><strong>{featuredState[0]}</strong><small>{featuredState[1]} tracked leagues</small></div>}
  </section>
}

function FeatureTile({ kicker, league, detail }: { kicker: string; league: RankedLeague; detail: string }) { return <Link to={leaguePath(league.id)} className="feature-tile"><LeagueMark league={league} /><span>{kicker}</span><strong>{league.name}</strong><small>{detail}</small></Link> }

function LeagueCard({ league }: { league: RankedLeague }) {
  const stars = strengthStars(league.strengthScore)
  return <Link to={leaguePath(league.id)} className="league-card">
    <header><LeagueMark league={league} /><span className="league-rank">#{league.nationalRank}</span></header>
    <h2>{league.name}</h2>
    <p>{league.regionName ? `${league.regionName} · ` : ''}{league.stateName || league.state}</p>
    <div className="strength-line"><StarStrength stars={stars} size={12} /><b>{strengthLabel(stars)}</b></div>
    <div className="league-facts"><span><b>{league.clubCount}</b><small>clubs</small></span><span><b>{updatedLabel(league.lastSyncedAt)}</b><small>updated</small></span></div>
    {league.topClub && <div className="top-club"><TeamLogo name={league.topClub.clubName} size={30} /><span><small>Top ranked club</small><b>{league.topClub.clubName}</b></span></div>}
    <span className="view-link">View League <ArrowRight size={14} /></span>
  </Link>
}

function StrongestLeagues({ leagues }: { leagues: RankedLeague[] }) { if (!leagues.length) return null; return <article className="side-card"><CardHead title="Strongest leagues" to="/rankings" />{leagues.slice(0, 5).map(l => <Link to={leaguePath(l.id)} key={l.id} className="side-row"><LeagueMark league={l} /><span><b>#{l.nationalRank} {l.name}</b><small>{l.state} · {l.clubCount} clubs</small></span><StarStrength stars={strengthStars(l.strengthScore)} size={10} /></Link>)}</article> }
function LatestUpdated({ leagues }: { leagues: RankedLeague[] }) { const latest = [...leagues].filter(l => l.lastSyncedAt).sort((a, b) => +new Date(b.lastSyncedAt!) - +new Date(a.lastSyncedAt!)).slice(0, 5); if (!latest.length) return null; return <article className="side-card"><CardHead title="Latest updated" to="/leagues" />{latest.map(l => <Link to={leaguePath(l.id)} key={l.id} className="side-row"><LeagueMark league={l} /><span><b>{l.name}</b><small>{updatedLabel(l.lastSyncedAt)} · {l.state}</small></span></Link>)}</article> }
function LatestNews({ articles }: { articles: Article[] }) { if (!articles.length) return null; return <article className="side-card"><CardHead title="Latest news" to="/news" />{articles.slice(0, 4).map(a => <Link key={a.slug} to={newsPath(a.slug)} className="news-row"><b>{a.title}</b><small>{formatDate(a.date)} · {a.readingTime} min read</small></Link>)}</article> }
function MoversCard({ entries }: { entries: RankingEntry[] }) { const movers = entries.filter(e => e.rankMovement !== 0).sort((a, b) => Math.abs(b.rankMovement) - Math.abs(a.rankMovement)).slice(0, 5); if (!movers.length) return null; return <article className="side-card"><CardHead title="Biggest movers" to="/rankings" />{movers.map(e => <Link to={teamPath(e.clubId)} key={e.clubId} className="side-row"><TeamLogo name={e.clubName} size={28} /><span><b>{e.clubName}</b><small>{e.leagueName}</small></span><Movement value={e.rankMovement} /></Link>)}</article> }
function ChampionshipTeaser() { return <Link to="/championship" className="side-card championship"><CalendarDays /><span>Championship pathway</span><strong>League ladders feed the national race</strong><small>Coming soon</small></Link> }
function CardHead({ title, to }: { title: string; to: string }) { return <header className="card-head"><h2>{title}</h2><Link to={to}>All</Link></header> }
function Movement({ value }: { value: number }) { const up = value > 0; const down = value < 0; return <span className={`move ${up ? 'up' : down ? 'down' : 'flat'}`}>{up ? '▲' : down ? '▼' : '—'}{value !== 0 ? Math.abs(value) : ''}</span> }
function LeagueMark({ league }: { league: LeagueRow }) { return <span className="league-mark" aria-hidden>{league.state || league.name.slice(0, 2)}</span> }
function Centered({ children, tone }: { children: React.ReactNode; tone?: 'error' }) { return <div className="centered" style={{ color: tone === 'error' ? RED : MUTED }}>{children}</div> }
function shortDate(iso: string) { return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) }
function updatedLabel(iso?: string | null) { if (!iso) return 'live'; const days = Math.floor((Date.now() - +new Date(iso)) / 86400000); if (days <= 0) return 'today'; if (days === 1) return 'yesterday'; if (days < 7) return `${days}d ago`; return `${Math.floor(days / 7)}w ago` }

function LeaguesStyles() { return <style>{`
  .leagues-page{max-width:1560px;margin:0 auto;padding:22px 18px 60px}.leagues-header{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(360px,.65fr);gap:20px;align-items:end;padding:24px;border:1px solid ${LINE};border-radius:18px;background:linear-gradient(135deg,#fff,#f7faff);box-shadow:0 14px 34px rgba(6,42,95,.08);margin-bottom:18px}.live-pill{display:inline-flex;align-items:center;gap:7px;border-radius:999px;background:rgba(255,44,145,.12);color:${PINK};padding:6px 9px;font-size:10px;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.live-pill span{width:7px;height:7px;border-radius:50%;background:${PINK};box-shadow:0 0 0 5px rgba(255,44,145,.14)}.header-copy h1{font-size:clamp(3rem,8vw,7rem);line-height:.82;margin:14px 0 12px;text-transform:uppercase;letter-spacing:-.075em;color:${NAVY}}.header-copy p{margin:0;color:#42526a;font-size:17px}.header-stats{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.header-stats b{border:1px solid ${LINE};background:#fff;border-radius:999px;padding:7px 10px;color:${NAVY};font-size:12px;text-transform:uppercase;letter-spacing:.08em}.filters-panel{display:grid;gap:10px}.search-box{display:flex;align-items:center;gap:9px;background:#fff;border:1px solid ${LINE};border-radius:12px;padding:0 12px}.search-box input{border:0;outline:0;min-width:0;width:100%;padding:13px 0;font:inherit;color:${TEXT};background:transparent}.filters-panel select{appearance:none;border:1px solid ${LINE};border-radius:12px;background:#fff;color:${TEXT};font-weight:850;padding:13px 12px}.featured-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:18px}.feature-tile{display:grid;gap:8px;border:1px solid ${LINE};border-radius:16px;background:#fff;box-shadow:0 14px 34px rgba(6,42,95,.08);padding:16px;text-decoration:none;color:${TEXT};min-width:0}.feature-tile span,.championship span{color:${PINK};font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.15em}.feature-tile strong{font-size:20px;line-height:1.02;color:${NAVY};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.feature-tile small{color:${MUTED};font-weight:800}.state-tile{background:linear-gradient(135deg,#071832,${NAVY});color:#fff}.state-tile strong{color:#fff}.leagues-layout{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:18px;align-items:start}.league-directory{min-width:0;border:1px solid ${LINE};border-radius:18px;background:#fff;box-shadow:0 14px 34px rgba(6,42,95,.08);overflow:hidden}.directory-toolbar{display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid ${LINE};background:#f8fafc;color:${MUTED};font-weight:850}.directory-toolbar b{font-size:22px;color:${NAVY}}.directory-toolbar a{margin-left:auto;display:flex;align-items:center;gap:6px;color:${PINK};font-weight:950;text-decoration:none;text-transform:uppercase;font-size:12px}.league-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;padding:14px}.league-card{display:flex;flex-direction:column;gap:12px;border:1px solid ${LINE};border-radius:16px;background:#fff;box-shadow:0 10px 24px rgba(6,42,95,.07);padding:16px;text-decoration:none;color:${TEXT};min-width:0;transition:transform .16s,box-shadow .16s}.league-card:hover{transform:translateY(-2px);box-shadow:0 18px 34px rgba(6,42,95,.12)}.league-card header{display:flex;align-items:center;justify-content:space-between}.league-mark{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,${NAVY},${NAVY_2});color:#fff;font-size:10px;font-weight:950;flex-shrink:0}.league-rank{font-size:24px;font-weight:950;color:${NAVY};letter-spacing:-.07em}.league-card h2{margin:0;color:${NAVY};font-size:22px;line-height:1.02;text-transform:uppercase;letter-spacing:-.04em}.league-card p{margin:0;color:${MUTED};font-weight:800;font-size:12px}.strength-line{display:flex;align-items:center;gap:8px;color:${PINK};font-size:12px;text-transform:uppercase}.league-facts{display:grid;grid-template-columns:1fr 1fr;gap:8px}.league-facts span{border:1px solid #edf1f6;border-radius:12px;padding:9px;background:#f8fafc}.league-facts b,.league-facts small{display:block}.league-facts b{color:${TEXT}}.league-facts small{color:${MUTED};font-size:11px;text-transform:uppercase;font-weight:850}.top-club{display:flex;align-items:center;gap:9px;border-top:1px solid #edf1f6;padding-top:11px;min-width:0}.top-club span{min-width:0}.top-club b,.top-club small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.top-club small{color:${MUTED};font-size:10px;text-transform:uppercase;font-weight:950}.view-link{display:flex;align-items:center;gap:6px;color:${PINK};font-size:12px;font-weight:950;text-transform:uppercase;letter-spacing:.1em;margin-top:auto}.leagues-sidebar{position:sticky;top:16px;display:flex;flex-direction:column;gap:14px}.side-card{display:block;border:1px solid ${LINE};border-radius:16px;background:#fff;box-shadow:0 14px 34px rgba(6,42,95,.08);padding:16px;text-decoration:none;color:${TEXT};overflow:hidden}.card-head{display:flex;align-items:center;justify-content:space-between;margin:-16px -16px 10px;padding:13px 16px;border-bottom:1px solid ${LINE};background:#f8fafc}.card-head h2{margin:0;color:${NAVY};font-size:18px;text-transform:uppercase}.card-head a{color:${PINK};font-weight:950;text-decoration:none;font-size:12px}.side-row{display:flex;align-items:center;gap:9px;padding:11px 0;border-bottom:1px solid #edf1f6;color:${TEXT};text-decoration:none}.side-row span{min-width:0;flex:1}.side-row b,.side-row small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.side-row small,.news-row small{color:${MUTED};font-weight:800;margin-top:4px}.news-row{display:block;padding:11px 0;border-bottom:1px solid #edf1f6;color:${TEXT};text-decoration:none}.news-row b{display:block;line-height:1.2}.move{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:4px 6px;min-width:30px;font-size:10px;font-weight:950}.move.up{background:#e8f8ee;color:${GREEN}}.move.down{background:#fdecec;color:${RED}}.move.flat{background:#eef2f7;color:${MUTED}}.championship{background:linear-gradient(135deg,#071832,${NAVY});color:#fff}.championship strong{display:block;font-size:23px;line-height:1.02;margin-top:10px;color:#fff}.championship small{display:block;color:#bfd0e5;font-weight:800;margin-top:8px}.centered{min-height:180px;display:grid;place-items:center;font-size:13px;font-weight:950;letter-spacing:.18em;text-transform:uppercase;text-align:center}
  @media (max-width:1180px){.league-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.leagues-layout{grid-template-columns:1fr}.leagues-sidebar{position:static;display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.featured-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.leagues-header{grid-template-columns:1fr}}
  @media (max-width:720px){.leagues-page{padding:14px 12px 38px}.leagues-header{padding:18px;border-radius:16px}.header-copy h1{font-size:3.5rem}.header-copy p{font-size:15px}.featured-strip{grid-template-columns:1fr}.feature-tile{min-height:116px}.league-grid{grid-template-columns:1fr;padding:12px}.leagues-sidebar{display:flex}.leagues-sidebar .side-card{width:100%}.directory-toolbar a{display:none}.filters-panel{grid-template-columns:1fr}.league-card{padding:15px;min-height:230px}.league-card h2,.feature-tile strong{white-space:normal;overflow-wrap:anywhere}.header-stats b{font-size:11px}}
`}</style> }
