/** Public Clubs directory — sports network club hub UI only. */
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, CalendarDays, Search, X } from 'lucide-react'
import Nav from '../components/layout/Nav'
import ProductSearch from '../components/rankings/ProductSearch'
import Footer from '../components/layout/Footer'
import { useSeo } from '../lib/seo'
import { fetchRankings, leaguePath, teamPath, strengthStars, useAsync, type RankingEntry, type RankingsResponse } from '../lib/rankings'
import { TeamLogo, FormPips, StarStrength } from '../components/rankings/bits'
import { latestArticles, loadPublished, formatDate, newsPath, type Article } from '../news/content'

const STATES = ['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']
const NAVY = '#062a5f'
const NAVY_2 = '#0b3f86'
const PINK = '#ff2c91'
const TEXT = '#111827'
const MUTED = '#64748b'
const LINE = '#dbe3ee'
const GREEN = '#16a34a'
const RED = '#dc2626'

interface DirClub { clubId: string; name: string; region: string | null; wins: number; losses: number; draws: number; percentage: number; rank: number | null; powerRating: number | null }
interface DirLeague { leagueId: string; name: string; clubs: DirClub[] }
interface DirState { code: string; name: string; leagues: DirLeague[] }
interface DirResponse { season: string | null; states: DirState[]; meta: { totalClubs: number; totalLeagues: number } }
interface LeagueRow { id: string; name: string; state: string; strengthScore: number; clubCount: number }
interface FlatClub extends DirClub { stateCode: string; stateName: string; leagueId: string; leagueName: string; ranking?: RankingEntry }

const fetchLeagues = () => fetch('/api/leagues').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<{ data: LeagueRow[] }> }).then(r => r.data)

export default function Directory() {
  const [params] = useSearchParams()
  const [data, setData] = useState<DirResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const rankings = useAsync<RankingsResponse>(fetchRankings, [])
  const leagues = useAsync<LeagueRow[]>(fetchLeagues, [])
  const [newsTick, setNewsTick] = useState(0)

  const [query, setQuery] = useState(params.get('q') ?? '')
  const [stateF, setStateF] = useState('')
  const [leagueF, setLeagueF] = useState('')

  useSeo({
    title: 'National Club Directory — Country Netball | Got Netty',
    description: 'Search Australia’s country netball clubs and teams by name, state and league, or browse A–Z. The official Got Netty national club directory.',
    path: '/directory',
  })

  useEffect(() => {
    fetch('/api/directory')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<DirResponse> })
      .then(setData).catch(e => setError(String(e))).finally(() => setLoading(false))
  }, [])
  useEffect(() => { loadPublished().then(() => setNewsTick(x => x + 1)) }, [])

  const clubs: FlatClub[] = useMemo(() => {
    const rankById = new Map((rankings.data?.data ?? []).map(e => [e.clubId, e]))
    const out: FlatClub[] = []
    for (const s of data?.states ?? [])
      for (const l of s.leagues)
        for (const c of l.clubs)
          out.push({ ...c, stateCode: s.code, stateName: s.name, leagueId: l.leagueId, leagueName: l.name, ranking: rankById.get(c.clubId) })
    return out.sort((a, b) => (a.ranking?.rank ?? a.rank ?? 999999) - (b.ranking?.rank ?? b.rank ?? 999999) || a.name.localeCompare(b.name))
  }, [data, rankings.data])

  const leagueOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const c of clubs) if (!stateF || c.stateCode === stateF) if (!seen.has(c.leagueId)) seen.set(c.leagueId, c.leagueName)
    return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [clubs, stateF])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return clubs.filter(c => {
      if (stateF && c.stateCode !== stateF) return false
      if (leagueF && c.leagueId !== leagueF) return false
      if (q) {
        const hay = `${c.name} ${c.region ?? ''} ${c.leagueName} ${c.stateName} ${c.stateCode}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [clubs, query, stateF, leagueF])

  const clearAll = () => { setQuery(''); setStateF(''); setLeagueF('') }
  const latestNews = latestArticles(4)
  const updated = rankings.data?.meta?.generatedAt ?? null
  void newsTick

  return (
    <div style={{ background: '#fff', minHeight: '100vh', color: TEXT }}>
      <Nav /><ProductSearch />
      <main className="clubs-page">
        <PageHeader
          season={rankings.data?.meta?.weekLabel ?? data?.season ?? null}
          ranked={rankings.data?.data.length ?? clubs.filter(c => c.rank != null).length}
          leagues={data?.meta.totalLeagues ?? leagueOptions.length}
          updated={updated}
          query={query}
          setQuery={setQuery}
          stateF={stateF}
          setStateF={v => { setStateF(v); setLeagueF('') }}
          leagueF={leagueF}
          setLeagueF={setLeagueF}
          leagueOptions={leagueOptions}
          clearAll={clearAll}
          hasFilters={!!query.trim() || !!stateF || !!leagueF}
        />

        {loading && <Centered>Loading clubs…</Centered>}
        {error && !loading && <Centered tone="error">Unable to load the club directory right now.</Centered>}

        {!loading && !error && (
          <>
            <FeaturedClubs entries={rankings.data?.data ?? []} />
            <div className="clubs-layout">
              <section className="clubs-directory" aria-label="National club directory">
                <div className="directory-toolbar"><b>{results.length}</b><span>clubs shown</span><Link to="/rankings">National rankings <ArrowRight size={14} /></Link></div>
                {results.length === 0 ? <Centered>No clubs match your filters.</Centered> : <div className="club-grid">{results.map(c => <ClubCard key={c.clubId} club={c} />)}</div>}
              </section>
              <aside className="clubs-sidebar" aria-label="Clubs page sidebar">
                <TopRanked entries={rankings.data?.data ?? []} />
                <BiggestMovers entries={rankings.data?.data ?? []} />
                <StrongestLeagues leagues={leagues.data ?? []} />
                <LatestNews articles={latestNews} />
                <ChampionshipTeaser />
              </aside>
            </div>
          </>
        )}
      </main>
      <Footer />
      <ClubsStyles />
    </div>
  )
}

function PageHeader({ season, ranked, leagues, updated, query, setQuery, stateF, setStateF, leagueF, setLeagueF, leagueOptions, clearAll, hasFilters }: {
  season: string | null; ranked: number; leagues: number; updated: string | null; query: string; setQuery: (v: string) => void
  stateF: string; setStateF: (v: string) => void; leagueF: string; setLeagueF: (v: string) => void; leagueOptions: { id: string; name: string }[]; clearAll: () => void; hasFilters: boolean
}) {
  return <header className="clubs-header">
    <div className="header-copy">
      <span className="live-pill"><span /> Club directory live</span>
      <h1>Clubs</h1>
      <p>Browse Australia&rsquo;s country netball clubs, rankings, leagues and form.</p>
      <div className="header-stats"><b>{season ?? 'Season live'}</b><b>{ranked} ranked clubs</b><b>{leagues} leagues represented</b><b>{updated ? `Updated ${shortDate(updated)}` : 'Updated weekly'}</b></div>
    </div>
    <div className="filters-panel" aria-label="Club filters">
      <label className="search-box"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search clubs, league or region" /></label>
      <select value={stateF} onChange={e => setStateF(e.target.value)} aria-label="Filter by state"><option value="">All states</option>{STATES.map(s => <option key={s} value={s}>{s}</option>)}</select>
      <select value={leagueF} onChange={e => setLeagueF(e.target.value)} aria-label="Filter by league"><option value="">All leagues</option>{leagueOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
      {hasFilters && <button onClick={clearAll} className="clear-btn"><X size={13} /> Clear</button>}
    </div>
  </header>
}

function FeaturedClubs({ entries }: { entries: RankingEntry[] }) {
  if (!entries.length) return null
  const highest = entries[0]
  const biggestMover = [...entries].filter(e => e.rankMovement !== 0).sort((a, b) => Math.abs(b.rankMovement) - Math.abs(a.rankMovement))[0]
  const bestForm = [...entries].filter(e => e.recentForm.length).sort((a, b) => wins(b) - wins(a) || a.rank - b.rank)[0]
  const tiles = [
    { label: 'Highest ranked club', club: highest, detail: `#${highest.rank} · rating ${highest.powerRating.toFixed(1)}` },
    biggestMover && { label: 'Biggest mover', club: biggestMover, detail: `${biggestMover.rankMovement > 0 ? 'Up' : 'Down'} ${Math.abs(biggestMover.rankMovement)} places` },
    bestForm && { label: 'Best form club', club: bestForm, detail: `${wins(bestForm)} wins from last ${bestForm.recentForm.length}` },
    { label: 'Featured club', club: highest, detail: `${highest.leagueName} · ${highest.state}` },
  ].filter(Boolean) as { label: string; club: RankingEntry; detail: string }[]
  return <section className="featured-strip" aria-label="Featured clubs">{tiles.map(t => <Link to={teamPath(t.club.clubId)} className="feature-tile" key={t.label}><TeamLogo name={t.club.clubName} size={40} /><span>{t.label}</span><strong>{t.club.clubName}</strong><small>{t.detail}</small></Link>)}</section>
}

function ClubCard({ club }: { club: FlatClub }) {
  const r = club.ranking
  return <Link to={teamPath(club.clubId)} className="club-card">
    <header><TeamLogo name={club.name} size={46} /><span className="club-rank">{r?.rank ?? club.rank ? `#${r?.rank ?? club.rank}` : '—'}</span></header>
    <h2>{club.name}</h2>
    <p>{club.region ? `${club.region} · ` : ''}{club.leagueName} · {club.stateCode}</p>
    <div className="club-meta"><span><b>{rating(club)}</b><small>rating</small></span><span><Movement value={r?.rankMovement ?? 0} /><small>movement</small></span></div>
    <div className="record-line"><b>{club.wins}-{club.losses}{club.draws ? `-${club.draws}` : ''}</b><small>{club.percentage ? `${club.percentage.toFixed(1)}%` : 'percentage pending'}</small></div>
    {r?.recentForm?.length ? <div className="form-line"><FormPips form={r.recentForm} /></div> : null}
    <span className="view-link">View Club <ArrowRight size={14} /></span>
  </Link>
}

function TopRanked({ entries }: { entries: RankingEntry[] }) { if (!entries.length) return null; return <article className="side-card"><CardHead title="Top ranked clubs" to="/rankings" />{entries.slice(0, 5).map(e => <Link key={e.clubId} to={teamPath(e.clubId)} className="side-row"><TeamLogo name={e.clubName} size={28} /><span><b>#{e.rank} {e.clubName}</b><small>{e.leagueName} · {e.state}</small></span><strong>{e.powerRating.toFixed(1)}</strong></Link>)}</article> }
function BiggestMovers({ entries }: { entries: RankingEntry[] }) { const movers = entries.filter(e => e.rankMovement !== 0).sort((a, b) => Math.abs(b.rankMovement) - Math.abs(a.rankMovement)).slice(0, 5); if (!movers.length) return null; return <article className="side-card"><CardHead title="Biggest movers" to="/rankings" />{movers.map(e => <Link key={e.clubId} to={teamPath(e.clubId)} className="side-row"><TeamLogo name={e.clubName} size={28} /><span><b>{e.clubName}</b><small>#{e.rank} nationally</small></span><Movement value={e.rankMovement} /></Link>)}</article> }
function StrongestLeagues({ leagues }: { leagues: LeagueRow[] }) { const top = [...leagues].sort((a, b) => b.strengthScore - a.strengthScore).slice(0, 5); if (!top.length) return null; return <article className="side-card"><CardHead title="Strongest leagues" to="/leagues" />{top.map(l => <Link key={l.id} to={leaguePath(l.id)} className="side-row"><LeagueMark league={l} /><span><b>{l.name}</b><small>{l.state} · {l.clubCount} clubs</small></span><StarStrength stars={strengthStars(l.strengthScore)} size={10} /></Link>)}</article> }
function LatestNews({ articles }: { articles: Article[] }) { if (!articles.length) return null; return <article className="side-card"><CardHead title="Latest news" to="/news" />{articles.slice(0, 4).map(a => <Link key={a.slug} to={newsPath(a.slug)} className="news-row"><b>{a.title}</b><small>{formatDate(a.date)} · {a.readingTime} min read</small></Link>)}</article> }
function ChampionshipTeaser() { return <Link to="/championship" className="side-card championship"><CalendarDays /><span>Championship pathway</span><strong>Club form feeds the national race</strong><small>Coming soon</small></Link> }
function CardHead({ title, to }: { title: string; to: string }) { return <header className="card-head"><h2>{title}</h2><Link to={to}>All</Link></header> }
function Movement({ value }: { value: number }) { const up = value > 0; const down = value < 0; return <span className={`move ${up ? 'up' : down ? 'down' : 'flat'}`}>{up ? '▲' : down ? '▼' : '—'}{value !== 0 ? Math.abs(value) : ''}</span> }
function LeagueMark({ league }: { league: LeagueRow }) { return <span className="league-mark" aria-hidden>{league.state || league.name.slice(0, 2)}</span> }
function Centered({ children, tone }: { children: React.ReactNode; tone?: 'error' }) { return <div className="centered" style={{ color: tone === 'error' ? RED : MUTED }}>{children}</div> }
function rating(c: FlatClub) { return (c.ranking?.powerRating ?? c.powerRating)?.toFixed(1) ?? '—' }
function wins(e: RankingEntry) { return e.recentForm.filter(f => f === 'W').length }
function shortDate(iso: string) { return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) }

function ClubsStyles() { return <style>{`
  .clubs-page{max-width:1560px;margin:0 auto;padding:22px 18px 60px}.clubs-header{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(360px,.65fr);gap:20px;align-items:end;padding:24px;border:1px solid ${LINE};border-radius:18px;background:linear-gradient(135deg,#fff,#f7faff);box-shadow:0 14px 34px rgba(6,42,95,.08);margin-bottom:18px}.live-pill{display:inline-flex;align-items:center;gap:7px;border-radius:999px;background:rgba(255,44,145,.12);color:${PINK};padding:6px 9px;font-size:10px;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.live-pill span{width:7px;height:7px;border-radius:50%;background:${PINK};box-shadow:0 0 0 5px rgba(255,44,145,.14)}.header-copy h1{font-size:clamp(3rem,8vw,7rem);line-height:.82;margin:14px 0 12px;text-transform:uppercase;letter-spacing:-.075em;color:${NAVY}}.header-copy p{margin:0;color:#42526a;font-size:17px}.header-stats{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.header-stats b{border:1px solid ${LINE};background:#fff;border-radius:999px;padding:7px 10px;color:${NAVY};font-size:12px;text-transform:uppercase;letter-spacing:.08em}.filters-panel{display:grid;gap:10px}.search-box{display:flex;align-items:center;gap:9px;background:#fff;border:1px solid ${LINE};border-radius:12px;padding:0 12px}.search-box input{border:0;outline:0;min-width:0;width:100%;padding:13px 0;font:inherit;color:${TEXT};background:transparent}.filters-panel select,.clear-btn{border:1px solid ${LINE};border-radius:12px;background:#fff;color:${TEXT};font-weight:850;padding:13px 12px}.clear-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;color:${PINK};cursor:pointer}.featured-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:18px}.feature-tile{display:grid;gap:8px;border:1px solid ${LINE};border-radius:16px;background:#fff;box-shadow:0 14px 34px rgba(6,42,95,.08);padding:16px;text-decoration:none;color:${TEXT};min-width:0}.feature-tile span,.championship span{color:${PINK};font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.15em}.feature-tile strong{font-size:20px;line-height:1.02;color:${NAVY};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.feature-tile small{color:${MUTED};font-weight:800}.clubs-layout{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:18px;align-items:start}.clubs-directory{min-width:0;border:1px solid ${LINE};border-radius:18px;background:#fff;box-shadow:0 14px 34px rgba(6,42,95,.08);overflow:hidden}.directory-toolbar{display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid ${LINE};background:#f8fafc;color:${MUTED};font-weight:850}.directory-toolbar b{font-size:22px;color:${NAVY}}.directory-toolbar a{margin-left:auto;display:flex;align-items:center;gap:6px;color:${PINK};font-weight:950;text-decoration:none;text-transform:uppercase;font-size:12px}.club-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;padding:14px}.club-card{display:flex;flex-direction:column;gap:12px;border:1px solid ${LINE};border-radius:16px;background:#fff;box-shadow:0 10px 24px rgba(6,42,95,.07);padding:16px;text-decoration:none;color:${TEXT};min-width:0;transition:transform .16s,box-shadow .16s}.club-card:hover{transform:translateY(-2px);box-shadow:0 18px 34px rgba(6,42,95,.12)}.club-card header{display:flex;align-items:center;justify-content:space-between}.club-rank{font-size:25px;font-weight:950;color:${NAVY};letter-spacing:-.07em}.club-card h2{margin:0;color:${NAVY};font-size:22px;line-height:1.02;text-transform:uppercase;letter-spacing:-.04em}.club-card p{margin:0;color:${MUTED};font-weight:800;font-size:12px}.club-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px}.club-meta span,.record-line{border:1px solid #edf1f6;border-radius:12px;padding:9px;background:#f8fafc}.club-meta b,.club-meta small,.record-line b,.record-line small{display:block}.club-meta b{font-size:19px;color:${PINK}}.club-meta small,.record-line small{color:${MUTED};font-size:11px;text-transform:uppercase;font-weight:850}.form-line{border-top:1px solid #edf1f6;padding-top:11px}.view-link{display:flex;align-items:center;gap:6px;color:${PINK};font-size:12px;font-weight:950;text-transform:uppercase;letter-spacing:.1em;margin-top:auto}.clubs-sidebar{position:sticky;top:16px;display:flex;flex-direction:column;gap:14px}.side-card{display:block;border:1px solid ${LINE};border-radius:16px;background:#fff;box-shadow:0 14px 34px rgba(6,42,95,.08);padding:16px;text-decoration:none;color:${TEXT};overflow:hidden}.card-head{display:flex;align-items:center;justify-content:space-between;margin:-16px -16px 10px;padding:13px 16px;border-bottom:1px solid ${LINE};background:#f8fafc}.card-head h2{margin:0;color:${NAVY};font-size:18px;text-transform:uppercase}.card-head a{color:${PINK};font-weight:950;text-decoration:none;font-size:12px}.side-row{display:flex;align-items:center;gap:9px;padding:11px 0;border-bottom:1px solid #edf1f6;color:${TEXT};text-decoration:none}.side-row span{min-width:0;flex:1}.side-row b,.side-row small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.side-row small,.news-row small{color:${MUTED};font-weight:800;margin-top:4px}.news-row{display:block;padding:11px 0;border-bottom:1px solid #edf1f6;color:${TEXT};text-decoration:none}.news-row b{display:block;line-height:1.2}.league-mark{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,${NAVY},${NAVY_2});color:#fff;font-size:10px;font-weight:950;flex-shrink:0}.move{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:4px 6px;min-width:30px;font-size:10px;font-weight:950}.move.up{background:#e8f8ee;color:${GREEN}}.move.down{background:#fdecec;color:${RED}}.move.flat{background:#eef2f7;color:${MUTED}}.championship{background:linear-gradient(135deg,#071832,${NAVY});color:#fff}.championship strong{display:block;font-size:23px;line-height:1.02;margin-top:10px;color:#fff}.championship small{display:block;color:#bfd0e5;font-weight:800;margin-top:8px}.centered{min-height:180px;display:grid;place-items:center;font-size:13px;font-weight:950;letter-spacing:.18em;text-transform:uppercase;text-align:center}
  @media (max-width:1180px){.club-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.clubs-layout{grid-template-columns:1fr}.clubs-sidebar{position:static;display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.featured-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.clubs-header{grid-template-columns:1fr}}
  @media (max-width:720px){.clubs-page{padding:14px 12px 38px}.clubs-header{padding:18px;border-radius:16px}.header-copy h1{font-size:3.5rem}.header-copy p{font-size:15px}.featured-strip{grid-template-columns:1fr}.club-grid{grid-template-columns:1fr;padding:12px}.clubs-sidebar{display:flex}.directory-toolbar a{display:none}.filters-panel{grid-template-columns:1fr}.club-card{padding:15px}}
`}</style> }
