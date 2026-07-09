/** Public Rankings page — national ladder UI only. */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Search, Trophy } from 'lucide-react'
import Nav from '../components/layout/Nav'
import ProductSearch from '../components/rankings/ProductSearch'
import Footer from '../components/layout/Footer'
import { useSeo } from '../lib/seo'
import {
  fetchRankings, leaguePath, teamPath, strengthStars, useAsync,
  type RankingEntry, type RankingsResponse,
} from '../lib/rankings'
import { TeamLogo, FormPips, StarStrength } from '../components/rankings/bits'
import { latestArticles, loadPublished, formatDate, newsPath, type Article } from '../news/content'

type LeagueRow = { id: string; name: string; state: string; stateName: string; strengthScore: number; clubCount: number; lastSyncedAt?: string | null }

const NAVY = '#062a5f'
const NAVY_2 = '#0b3f86'
const PINK = '#d71920'
const TEXT = '#111827'
const MUTED = '#64748b'
const LINE = '#dbe3ee'
const GREEN = '#16a34a'
const RED = '#dc2626'

const fetchLeagues = () =>
  fetch('/api/leagues').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<{ data: LeagueRow[] }> }).then(r => r.data)

export default function FullRankings() {
  const { data, loading, error } = useAsync<RankingsResponse>(fetchRankings, [])
  const leagues = useAsync<LeagueRow[]>(fetchLeagues, [])
  const [newsTick, setNewsTick] = useState(0)
  const [query, setQuery] = useState('')
  const [state, setState] = useState('All states')
  const [league, setLeague] = useState('All leagues')

  useEffect(() => { loadPublished().then(() => setNewsTick(x => x + 1)) }, [])

  const entries = data?.data ?? []
  const week = data?.meta?.weekLabel
  const updated = data?.meta?.generatedAt ?? null
  const states = useMemo(() => ['All states', ...Array.from(new Set(entries.map(e => e.state).filter(Boolean))).sort()], [entries])
  const leagueNames = useMemo(() => ['All leagues', ...Array.from(new Set(entries.map(e => e.leagueName).filter(Boolean))).sort()], [entries])
  const filtered = useMemo(() => entries.filter(e => {
    const q = query.trim().toLowerCase()
    const matchesQuery = !q || e.clubName.toLowerCase().includes(q) || e.leagueName.toLowerCase().includes(q) || e.state.toLowerCase().includes(q)
    const matchesState = state === 'All states' || e.state === state
    const matchesLeague = league === 'All leagues' || e.leagueName === league
    return matchesQuery && matchesState && matchesLeague
  }), [entries, query, state, league])
  const latestNews = latestArticles(4)
  void newsTick

  useSeo({
    title: 'National Community Football Rankings — Senior | PlayFooty',
    description: 'The complete PlayFooty national rankings of Australia’s community football Senior clubs, ordered by power rating and updated every week of the season.',
    path: '/rankings',
    jsonLd: entries.length ? {
      '@context': 'https://schema.org', '@type': 'ItemList', name: 'PlayFooty National Community Football Rankings',
      numberOfItems: entries.length, itemListElement: entries.slice(0, 100).map(e => ({ '@type': 'ListItem', position: e.rank, name: e.clubName })),
    } : undefined,
  })

  return (
    <div style={{ background: '#fff', minHeight: '100vh', color: TEXT }}>
      <Nav /><ProductSearch />
      <main className="rankings-page">
        <PageHeader
          week={week}
          total={entries.length}
          updated={updated}
          query={query}
          setQuery={setQuery}
          states={states}
          state={state}
          setState={setState}
          leagues={leagueNames}
          league={league}
          setLeague={setLeague}
        />

        {loading && <RankingsSkeleton />}
        {error && <Centered tone="error">Unable to load rankings right now.</Centered>}

        {!loading && !error && (
          <div className="rankings-layout">
            <section className="ladder-shell" aria-label="National rankings ladder">
              <Top10Spotlight entries={entries.slice(0, 10)} />
              <WeeklyPulse entries={entries} week={week} />
              <div className="ladder-toolbar"><b>{filtered.length}</b><span>clubs shown</span><Link to="/leagues">Browse leagues <ArrowRight size={14} /></Link></div>
              <RankingsTable entries={filtered} />
              <RankingsCards entries={filtered} />
              {filtered.length === 0 && <SportsEmpty title="No clubs found" copy="Try clearing the league, state or search filters to bring the national ladder back into view." />}
            </section>

            <aside className="rankings-sidebar" aria-label="Rankings page sidebar">
              <UpdateCard week={week} updated={updated} total={entries.length} />
              <MoversCard entries={entries} />
              <StrongestLeagues leagues={leagues.data ?? []} loading={leagues.loading} />
              <LatestNews articles={latestNews} />
              <ChampionshipTeaser />
            </aside>
          </div>
        )}
      </main>
      <Footer />
      <RankingsStyles />
    </div>
  )
}

function PageHeader({ week, total, updated, query, setQuery, states, state, setState, leagues, league, setLeague }: {
  week: string | null | undefined; total: number; updated: string | null; query: string; setQuery: (v: string) => void
  states: string[]; state: string; setState: (v: string) => void; leagues: string[]; league: string; setLeague: (v: string) => void
}) {
  return <header className="rankings-header">
    <div className="header-copy">
      <span className="live-pill"><span /> Rankings live</span>
      <h1>National Rankings</h1>
      <p>Australia&rsquo;s national Senior community football club rankings.</p>
      <div className="header-stats"><b>Current rankings</b><b>{week ?? 'Season live'}</b><b>{total} ranked clubs</b><b>{updated ? `Last updated ${shortDate(updated)}` : 'Updated weekly'}</b></div>
    </div>
    <div className="filters-panel" aria-label="Rankings filters">
      <label className="search-box"><Search size={17} /><span>Search</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Club, league or state" /></label>
      <label><span>League</span><select value={league} onChange={e => setLeague(e.target.value)} aria-label="Filter by league">{leagues.map(l => <option key={l}>{l}</option>)}</select></label>
      {states.length > 1 && <label><span>State</span><select value={state} onChange={e => setState(e.target.value)} aria-label="Filter by state">{states.map(s => <option key={s}>{s}</option>)}</select></label>}
    </div>
  </header>
}

function Top10Spotlight({ entries }: { entries: RankingEntry[] }) {
  if (!entries.length) return null
  return <section className="top10-spotlight" aria-label="Top 10 spotlight">
    <header><span className="live-pill"><span /> Top 10 spotlight</span><h2>This week&rsquo;s national elite</h2></header>
    <div className="top10-grid">
      {entries.map(e => <Link key={e.clubId} to={teamPath(e.clubId)} className={`top10-card rank-${e.rank}`}>
        <span className="top10-rank">{e.rank <= 3 && <Trophy size={15} />}#{e.rank}</span>
        <TeamLogo name={e.clubName} size={e.rank <= 3 ? 56 : 44} />
        <span className="top10-copy"><b>{e.clubName}</b><small>{e.leagueName} · {e.state}</small></span>
        <span className="top10-meta"><strong>{e.powerRating.toFixed(1)}</strong><Movement value={e.rankMovement} compact /></span>
      </Link>)}
    </div>
  </section>
}

function WeeklyPulse({ entries, week }: { entries: RankingEntry[]; week: string | null | undefined }) {
  const moved = entries.filter(e => e.previousRank != null && e.rankMovement !== 0)
  const climbers = moved.filter(e => e.rankMovement > 0).sort((a, b) => b.rankMovement - a.rankMovement).slice(0, 5)
  const fallers = moved.filter(e => e.rankMovement < 0).sort((a, b) => a.rankMovement - b.rankMovement).slice(0, 5)
  const hasPreviousWeek = entries.some(e => e.previousRank != null)
  const newClubs = hasPreviousWeek ? entries.filter(e => e.previousRank == null).slice(0, 6) : []
  const stories = buildRankStories(entries, climbers, fallers)
  if (!climbers.length && !fallers.length && !newClubs.length && !stories.length) return null
  return <section className="weekly-pulse" aria-label="Weekly rankings movement">
    <header><span>{week ?? 'Latest week'}</span><h2>Ranking movement</h2></header>
    <div className="pulse-grid">
      <MoverList title="Top climbers" entries={climbers} empty="No major climbs this week." />
      <MoverList title="Top fallers" entries={fallers} empty="No major drops this week." />
      {newClubs.length > 0 && <div className="pulse-card new-week"><h3>New this week</h3>{newClubs.map(e => <Link key={e.clubId} to={teamPath(e.clubId)}><TeamLogo name={e.clubName} size={26} /><span>{e.clubName}</span><b>#{e.rank}</b></Link>)}</div>}
    </div>
    {stories.length > 0 && <div className="story-row">{stories.map(s => <Link key={s.to + s.label} to={s.to} className="story-card"><span>{s.kicker}</span><b>{s.label}</b><small>{s.detail}</small></Link>)}</div>}
  </section>
}

function MoverList({ title, entries, empty }: { title: string; entries: RankingEntry[]; empty: string }) {
  return <div className="pulse-card"><h3>{title}</h3>{entries.length ? entries.map(e => <Link key={e.clubId} to={teamPath(e.clubId)}><TeamLogo name={e.clubName} size={28} /><span><b>{e.clubName}</b><small>#{e.rank} · was #{e.previousRank}</small></span><Movement value={e.rankMovement} compact /></Link>) : <p>{empty}</p>}</div>
}

function buildRankStories(entries: RankingEntry[], climbers: RankingEntry[], fallers: RankingEntry[]) {
  const stories: { kicker: string; label: string; detail: string; to: string }[] = []
  const leader = entries[0]
  if (leader) stories.push({ kicker: 'Australia #1', label: `${leader.clubName} remains the national benchmark.`, detail: `${leader.powerRating.toFixed(1)} rating · ${recordLabel(leader)}`, to: teamPath(leader.clubId) })
  const topClimber = climbers[0]
  if (topClimber) stories.push({ kicker: 'Biggest climb', label: `${topClimber.clubName} climbed ${topClimber.rankMovement} places.`, detail: `Now #${topClimber.rank} nationally`, to: teamPath(topClimber.clubId) })
  const top25 = entries.find(e => e.rank <= 25 && (e.previousRank ?? 999) > 25)
  if (top25) stories.push({ kicker: 'Top 25 watch', label: `${top25.clubName} enters the Top 25.`, detail: `Up to #${top25.rank} this week`, to: teamPath(top25.clubId) })
  const faller = fallers[0]
  if (faller) stories.push({ kicker: 'Pressure watch', label: `${faller.clubName} dropped ${Math.abs(faller.rankMovement)} places.`, detail: `Now #${faller.rank} nationally`, to: teamPath(faller.clubId) })
  return stories.slice(0, 4)
}

function RankingsTable({ entries }: { entries: RankingEntry[] }) {
  if (!entries.length) return null
  return <div className="table-wrap"><table className="rankings-table">
    <thead><tr><th>Rank</th><th>Move</th><th>Club</th><th>League</th><th>State</th><th>Record</th><th>%</th><th>Rating</th><th>Form</th><th>Trend</th></tr></thead>
    <tbody>{entries.map(e => <RankingTableRow key={e.clubId} entry={e} />)}</tbody>
  </table></div>
}

function RankingTableRow({ entry }: { entry: RankingEntry }) {
  const podium = entry.rank <= 3
  return <tr className={podium ? 'podium' : ''} onClick={() => { window.location.href = teamPath(entry.clubId) }}>
    <td><span className="rank-num">{entry.rank === 1 && <Trophy size={13} />}{entry.rank}</span></td>
    <td><Movement value={entry.rankMovement} /></td>
    <td><span className="club-cell"><TeamLogo name={entry.clubName} size={38} /><span><b>{entry.clubName}</b><small>{entry.leagueName} · {entry.state}</small></span></span></td>
    <td>{entry.leagueName}</td>
    <td>{entry.state}</td>
    <td><b>{recordLabel(entry)}</b><small>{entry.record.played} GP</small></td>
    <td>{entry.percentage ? entry.percentage.toFixed(1) : '—'}</td>
    <td><strong className="rating">{entry.powerRating.toFixed(1)}</strong></td>
    <td><FormPips form={entry.recentForm} /></td>
    <td><Trend value={entry.powerRating} /></td>
  </tr>
}

function RankingsCards({ entries }: { entries: RankingEntry[] }) {
  if (!entries.length) return null
  return <div className="ranking-cards">{entries.map(e => <Link to={teamPath(e.clubId)} className={`rank-card ${e.rank <= 3 ? 'podium' : ''}`} key={e.clubId}>
    <span className="rank-num">{e.rank}</span><TeamLogo name={e.clubName} size={42} />
    <span className="card-club"><b>{e.clubName}</b><small>{e.leagueName} · {e.state}</small><small>{recordLabel(e)} · {e.percentage ? `${e.percentage.toFixed(1)}%` : 'percentage pending'}</small></span>
    <span className="card-side"><strong>{e.powerRating.toFixed(1)}</strong><Movement value={e.rankMovement} /><FormPips form={e.recentForm} /></span>
  </Link>)}</div>
}

function UpdateCard({ week, updated, total }: { week: string | null | undefined; updated: string | null; total: number }) { return <Link to="/rankings" className="side-card update"><span className="live-pill"><span /> Latest rankings update</span><strong>{week ?? 'Season live'}</strong><small>{total} ranked clubs{updated ? ` · updated ${shortDate(updated)}` : ''}</small></Link> }
function MoversCard({ entries }: { entries: RankingEntry[] }) { const movers = entries.filter(e => e.previousRank != null && e.rankMovement !== 0).sort((a, b) => Math.abs(b.rankMovement) - Math.abs(a.rankMovement)).slice(0, 5); if (!movers.length) return null; return <article className="side-card"><CardHead title="Biggest movers" to="/rankings" />{movers.map(e => <Link to={teamPath(e.clubId)} key={e.clubId} className="side-row"><TeamLogo name={e.clubName} size={28} /><span><b>{e.clubName}</b><small>#{e.rank} nationally · was #{e.previousRank}</small></span><Movement value={e.rankMovement} compact /></Link>)}</article> }
function StrongestLeagues({ leagues, loading }: { leagues: LeagueRow[]; loading: boolean }) { const top = [...leagues].sort((a, b) => b.strengthScore - a.strengthScore).slice(0, 5); if (!loading && !top.length) return null; return <article className="side-card"><CardHead title="Strongest leagues" to="/leagues" />{loading ? <p className="empty-copy">Loading leagues…</p> : top.map(l => <Link key={l.id} to={leaguePath(l.id)} className="side-row"><LeagueMark league={l} /><span><b>{l.name}</b><small>{l.state} · {l.clubCount} clubs</small></span><StarStrength stars={strengthStars(l.strengthScore)} size={10} /></Link>)}</article> }
function LatestNews({ articles }: { articles: Article[] }) { if (!articles.length) return null; return <article className="side-card"><CardHead title="Latest news" to="/news" />{articles.slice(0, 4).map(a => <Link key={a.slug} to={newsPath(a.slug)} className="news-row"><b>{a.title}</b><small>{formatDate(a.date)} · {a.readingTime} min read</small></Link>)}</article> }
function ChampionshipTeaser() { return <Link to="/championship" className="side-card championship"><CalendarDays /><span>Future showcase pathway</span><strong>Future showcase pathway</strong><small>Coming soon</small></Link> }
function CardHead({ title, to }: { title: string; to: string }) { return <header className="card-head"><h2>{title}</h2><Link to={to}>All</Link></header> }
function Movement({ value, compact = false }: { value: number; compact?: boolean }) { const up = value > 0; const down = value < 0; return <span className={`move ${up ? 'up' : down ? 'down' : 'flat'} ${compact ? 'compact' : ''}`}>{up ? '▲' : down ? '▼' : '—'}{value !== 0 ? Math.abs(value) : compact ? '' : ' steady'}</span> }
function Trend({ value }: { value: number }) { const width = Math.max(8, Math.min(100, value)); return <span className="trend"><i style={{ width: `${width}%` }} /></span> }
function LeagueMark({ league }: { league: LeagueRow }) { return <span className="league-mark" aria-hidden>{league.state || league.name.slice(0, 2)}</span> }
function Centered({ children, tone }: { children: React.ReactNode; tone?: 'error' }) { return <div className="centered" style={{ color: tone === 'error' ? RED : MUTED }}>{children}</div> }
function SportsEmpty({ title, copy }: { title: string; copy: string }) { return <div className="sports-empty"><h3>{title}</h3><p>{copy}</p></div> }
function RankingsSkeleton() { return <div className="rankings-layout"><section className="ladder-shell skeleton-shell"><div className="skel hero" /><div className="skel-grid">{Array.from({ length: 6 }).map((_, i) => <span key={i} className="skel" />)}</div>{Array.from({ length: 10 }).map((_, i) => <span key={i} className="skel row" />)}</section><aside className="rankings-sidebar">{Array.from({ length: 4 }).map((_, i) => <span key={i} className="side-card skel side" />)}</aside></div> }
function recordLabel(e: RankingEntry) { return `${e.record.wins}-${e.record.losses}${e.record.draws ? `-${e.record.draws}` : ''}` }
function shortDate(iso: string) { return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) }

function RankingsStyles() { return <style>{`
  .rankings-page{max-width:1560px;margin:0 auto;padding:22px 18px 60px}.rankings-header{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(360px,.65fr);gap:20px;align-items:end;padding:24px;border:1px solid ${LINE};border-radius:18px;background:linear-gradient(135deg,#fff,#f7faff);box-shadow:0 14px 34px rgba(6,42,95,.08);margin-bottom:18px}.live-pill{display:inline-flex;align-items:center;gap:7px;border-radius:999px;background:rgba(215,25,32,.12);color:${PINK};padding:6px 9px;font-size:10px;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.live-pill span{width:7px;height:7px;border-radius:50%;background:${PINK};box-shadow:0 0 0 5px rgba(215,25,32,.14)}.header-copy h1{font-size:clamp(2.8rem,7vw,6.8rem);line-height:.82;margin:14px 0 12px;text-transform:uppercase;letter-spacing:-.075em;color:${NAVY}}.header-copy p{margin:0;color:#42526a;font-size:17px}.header-stats{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.header-stats b{border:1px solid ${LINE};background:#fff;border-radius:999px;padding:7px 10px;color:${NAVY};font-size:12px;text-transform:uppercase;letter-spacing:.08em}.filters-panel{display:grid;gap:10px}.filters-panel label{display:grid;gap:5px}.filters-panel label>span,.search-box>span{color:${MUTED};font-size:10px;font-weight:950;letter-spacing:.15em;text-transform:uppercase}.search-box{display:flex!important;align-items:center;gap:9px;background:#fff;border:1px solid ${LINE};border-radius:12px;padding:0 12px}.search-box input{border:0;outline:0;min-width:0;width:100%;padding:13px 0;font:inherit;color:${TEXT};background:transparent}.filters-panel select{appearance:none;border:1px solid ${LINE};border-radius:12px;background:#fff;color:${TEXT};font-weight:850;padding:13px 12px}.rankings-layout{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:18px;align-items:start}.ladder-shell{min-width:0;border:1px solid ${LINE};border-radius:18px;background:#fff;box-shadow:0 14px 34px rgba(6,42,95,.08);overflow:hidden}.top10-spotlight,.weekly-pulse{padding:18px;border-bottom:1px solid ${LINE};background:#fff}.top10-spotlight header,.weekly-pulse header{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:13px}.top10-spotlight h2,.weekly-pulse h2{margin:0;color:${NAVY};font-size:clamp(1.6rem,3vw,2.6rem);line-height:.9;text-transform:uppercase;letter-spacing:-.05em}.weekly-pulse header span{color:${PINK};font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.16em}.top10-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.top10-card{display:grid;grid-template-columns:auto 1fr;gap:9px;align-items:center;border:1px solid ${LINE};border-radius:15px;padding:12px;text-decoration:none;color:${TEXT};background:#fff;box-shadow:0 8px 20px rgba(6,42,95,.06);transition:transform .18s,box-shadow .18s}.top10-card:hover{transform:translateY(-2px);box-shadow:0 16px 32px rgba(6,42,95,.12)}.top10-card.rank-1,.top10-card.rank-2,.top10-card.rank-3{grid-template-columns:auto auto 1fr;background:linear-gradient(135deg,rgba(215,25,32,.08),#fff);border-top:3px solid ${PINK}}.top10-rank{grid-column:1/-1;color:${NAVY};font-size:22px;font-weight:950;letter-spacing:-.06em;display:flex;align-items:center;gap:5px}.top10-copy,.top10-copy b,.top10-copy small{display:block;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.top10-copy b{font-size:14px}.top10-copy small{color:${MUTED};font-size:11px}.top10-meta{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #edf1f6;padding-top:8px}.top10-meta strong{color:${PINK};font-size:20px}.pulse-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.pulse-card{border:1px solid ${LINE};border-radius:15px;background:#f8fafc;padding:14px}.pulse-card h3{margin:0 0 8px;color:${NAVY};font-size:16px;text-transform:uppercase}.pulse-card a{display:flex;align-items:center;gap:9px;padding:9px 0;border-top:1px solid #e8eef6;color:${TEXT};text-decoration:none}.pulse-card a span{min-width:0;flex:1}.pulse-card a b,.pulse-card a small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pulse-card p{margin:0;color:${MUTED};font-size:13px;font-weight:850}.new-week{grid-column:1/-1}.story-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}.story-card{border:1px solid ${LINE};border-radius:15px;padding:14px;text-decoration:none;color:${TEXT};background:#fff}.story-card span{color:${PINK};font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.14em}.story-card b{display:block;margin-top:8px;line-height:1.15}.story-card small{display:block;margin-top:7px;color:${MUTED}}.ladder-toolbar{display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid ${LINE};background:#f8fafc;color:${MUTED};font-weight:850}.ladder-toolbar b{font-size:22px;color:${NAVY}}.ladder-toolbar a{margin-left:auto;display:flex;gap:6px;align-items:center;color:${PINK};font-weight:950;text-decoration:none;text-transform:uppercase;font-size:12px}.table-wrap{overflow:auto}.rankings-table{width:100%;border-collapse:separate;border-spacing:0;min-width:1060px}.rankings-table thead th{position:sticky;top:0;z-index:2;background:${NAVY};color:#fff;text-align:left;padding:13px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.13em}.rankings-table tbody tr{cursor:pointer;transition:background .16s}.rankings-table tbody tr:hover{background:#f7fbff}.rankings-table tbody tr.podium{background:linear-gradient(90deg,rgba(215,25,32,.08),transparent 42%)}.rankings-table td{padding:13px 12px;border-bottom:1px solid #edf1f6;vertical-align:middle;color:${TEXT};font-size:13px}.rankings-table td small{display:block;color:${MUTED};font-size:11px;margin-top:2px}.rank-num{display:inline-flex;align-items:center;gap:5px;font-size:25px;font-weight:950;color:${NAVY};letter-spacing:-.07em}.club-cell{display:flex;align-items:center;gap:10px;min-width:250px}.club-cell span{min-width:0}.club-cell b,.club-cell small{max-width:290px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rating{font-size:21px;color:${PINK}}.move{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:5px 7px;font-size:10px;font-weight:950;white-space:nowrap;animation:movePop .38s ease both}.move.up{background:#e8f8ee;color:${GREEN}}.move.down{background:#fdecec;color:${RED}}.move.flat{background:#eef2f7;color:${MUTED}}.move.compact{min-width:30px;padding:4px 6px}@keyframes movePop{from{transform:translateY(3px);opacity:.55}to{transform:none;opacity:1}}.trend{display:block;width:70px;height:7px;border-radius:999px;background:#eef2f7;overflow:hidden}.trend i{display:block;height:100%;border-radius:999px;background:${PINK}}.ranking-cards{display:none}.rankings-sidebar{position:sticky;top:16px;display:flex;flex-direction:column;gap:14px}.side-card{display:block;border:1px solid ${LINE};border-radius:16px;background:#fff;box-shadow:0 14px 34px rgba(6,42,95,.08);padding:16px;text-decoration:none;color:${TEXT};overflow:hidden}.side-card.update strong,.championship strong{display:block;font-size:23px;line-height:1.02;margin-top:12px;color:${NAVY}}.side-card small{display:block;color:${MUTED};font-weight:800;margin-top:7px}.card-head{display:flex;align-items:center;justify-content:space-between;margin:-16px -16px 10px;padding:13px 16px;border-bottom:1px solid ${LINE};background:#f8fafc}.card-head h2{margin:0;color:${NAVY};font-size:18px;text-transform:uppercase}.card-head a{color:${PINK};font-weight:950;text-decoration:none;font-size:12px}.side-row{display:flex;align-items:center;gap:9px;padding:11px 0;border-bottom:1px solid #edf1f6;color:${TEXT};text-decoration:none}.side-row span{min-width:0;flex:1}.side-row b,.side-row small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.league-mark{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,${NAVY},${NAVY_2});color:#fff;font-size:10px;font-weight:950;flex-shrink:0}.news-row{display:block;padding:11px 0;border-bottom:1px solid #edf1f6;color:${TEXT};text-decoration:none}.news-row b{display:block;line-height:1.2}.championship{background:linear-gradient(135deg,#071832,${NAVY});color:#fff}.championship span{display:block;color:${PINK};font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.15em;margin:10px 0 8px}.championship strong{color:#fff}.championship small{color:#bfd0e5}.centered{min-height:220px;display:grid;place-items:center;font-size:13px;font-weight:950;letter-spacing:.18em;text-transform:uppercase;text-align:center}.sports-empty{padding:42px 20px;text-align:center}.sports-empty h3{margin:0;color:${NAVY};font-size:32px;line-height:.9;text-transform:uppercase}.sports-empty p{margin:10px auto 0;color:${MUTED};max-width:520px}.empty-copy{color:${MUTED};font-size:12px;font-weight:850}.skel{display:block;border-radius:12px;background:linear-gradient(90deg,#edf2f7,#f8fbff,#edf2f7);background-size:200% 100%;animation:skel 1.1s linear infinite}.skeleton-shell{padding:18px}.skel.hero{height:160px;margin-bottom:14px}.skel-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}.skel-grid .skel{height:84px}.skel.row{height:52px;margin-top:8px}.side.skel{height:130px}@keyframes skel{to{background-position:-200% 0}}
  @media (max-width:1120px){.rankings-layout{grid-template-columns:1fr}.rankings-sidebar{position:static;display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.rankings-header{grid-template-columns:1fr}.filters-panel{grid-template-columns:1fr 1fr}.search-box{grid-column:1/-1}}
  @media (max-width:760px){.rankings-page{padding:14px 12px 38px}.rankings-header{padding:18px;border-radius:16px}.header-copy h1{font-size:3.2rem}.header-copy p{font-size:15px}.filters-panel{grid-template-columns:1fr}.top10-spotlight,.weekly-pulse{padding:14px}.top10-spotlight header,.weekly-pulse header{display:block}.top10-grid,.pulse-grid,.story-row{grid-template-columns:1fr}.top10-card.rank-1,.top10-card.rank-2,.top10-card.rank-3,.top10-card{grid-template-columns:auto auto minmax(0,1fr);min-height:82px}.top10-rank{grid-column:auto;font-size:24px}.top10-meta{grid-column:1/-1}.table-wrap{display:none}.ranking-cards{display:grid;gap:10px;padding:12px}.rank-card{display:grid;grid-template-columns:38px 50px minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid ${LINE};border-radius:14px;padding:12px;min-height:94px;text-decoration:none;color:${TEXT};background:#fff;box-shadow:0 8px 20px rgba(6,42,95,.06)}.rank-card.podium{border-top:3px solid ${PINK};background:linear-gradient(90deg,rgba(215,25,32,.08),#fff)}.card-club{min-width:0}.card-club b,.card-club small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.card-club small{color:${MUTED};font-size:11px}.card-side{display:grid;justify-items:end;gap:7px;min-width:74px}.card-side strong{font-size:22px;color:${PINK}}.card-side .move{font-size:14px;min-width:48px;padding:7px 9px}.rankings-sidebar{display:flex}.rankings-sidebar .side-card{width:100%}.rankings-sidebar .side-card:nth-of-type(2){order:3}.rankings-sidebar .side-card:nth-of-type(3){order:4}.rankings-sidebar .side-card:nth-of-type(4){order:2}.rankings-sidebar .side-card:nth-of-type(5){order:5}.ladder-toolbar a{display:none}.header-stats b{font-size:11px}.rank-num{font-size:24px}.skel-grid{grid-template-columns:1fr}}
`}</style> }
