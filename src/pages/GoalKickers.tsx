import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import Nav from '../components/layout/Nav'
import Footer from '../components/layout/Footer'
import { useSeo } from '../lib/seo'
import { TeamLogo } from '../components/rankings/bits'
import { leaguePath, teamPath } from '../lib/rankings'

const NAVY = '#062a5f'
const PINK = '#d71920'
const LINE = '#dbe3ee'
const TEXT = '#111827'
const MUTED = '#64748b'

type Mode = 'raw' | 'adjusted'

interface GoalKickerRow {
  rank: number
  playerName: string
  clubName: string
  clubId: string | null
  leagueName: string
  leagueId: string | null
  season: string
  grade: string | null
  goals: number
  matches: number | null
  leagueStrength: number
  adjustedGoals: number
}

function PlayerLink({ row, className, children }: { row: GoalKickerRow; className: string; children: ReactNode }) {
  const to = row.clubId ? teamPath(row.clubId) : '/goal-kickers'
  return <Link to={to} className={className}>{children}</Link>
}

interface GoalKickersResponse { data: GoalKickerRow[]; meta: { total: number; mode: Mode; limit: number } }

async function fetchGoalKickers(mode: Mode): Promise<GoalKickersResponse> {
  const res = await fetch(`/api/goal-kickers?mode=${mode}&limit=100`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<GoalKickersResponse>
}

export default function GoalKickers() {
  const [mode, setMode] = useState<Mode>('raw')
  const [data, setData] = useState<GoalKickersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useSeo({
    title: 'Country Goal Kicking Ladder | PlayFooty',
    description: 'Australia-wide community football goal kicking ladder with raw goals and strength-adjusted scoring.',
    path: '/goal-kickers',
  })

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    fetchGoalKickers(mode)
      .then(next => { if (alive) setData(next) })
      .catch(err => { if (alive) setError(String(err)) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [mode])

  const rows = data?.data ?? []
  const topTen = useMemo(() => rows.slice(0, 10), [rows])

  return <div style={{ background: '#fff', minHeight: '100vh', color: TEXT }}>
    <Nav />
    <main className="gk-page">
      <header className="gk-hero">
        <div className="header-copy">
          <span className="live-pill"><span /> Goal kicking ladder</span>
          <h1>Country Goal Kicking Ladder</h1>
          <p>Track community football&rsquo;s leading goal kickers by raw goals or a simple league-strength adjusted score.</p>
          <div className="header-stats"><b>Current ladder</b><b>{mode === 'adjusted' ? 'Strength adjusted' : 'Raw goals'}</b><b>{rows.length} players shown</b></div>
        </div>
        <div className="mode-toggle" role="group" aria-label="Goal kicking ranking mode">
          <button className={mode === 'raw' ? 'active' : ''} onClick={() => setMode('raw')}>Raw Goals</button>
          <button className={mode === 'adjusted' ? 'active' : ''} onClick={() => setMode('adjusted')}>Strength Adjusted</button>
        </div>
      </header>

      <section className="ladder-shell" aria-label="Country goal kicking ladder">
        {topTen.length > 0 && <section className="top10-spotlight" aria-label="Top 10 goal kickers spotlight">
          <header><span className="live-pill"><span /> Top 10 spotlight</span><h2>{mode === 'adjusted' ? 'Strength adjusted leaders' : 'Raw goal leaders'}</h2></header>
          <div className="top10-grid">
            {topTen.map(row => <PlayerLink row={row} key={`spotlight-${row.season}-${row.grade ?? 'all'}-${row.playerName}-${row.clubName}-${row.leagueName}`} className={`top10-card rank-${row.rank}`}>
              <span className="top10-rank">{row.rank <= 3 && <Trophy size={15} />}#{row.rank}</span>
              <TeamLogo name={row.clubName} size={row.rank <= 3 ? 56 : 44} />
              <span className="top10-copy"><b>{row.playerName}</b><small>{row.clubName} · {row.leagueName}</small></span>
              <span className="top10-meta"><strong>{mode === 'adjusted' ? row.adjustedGoals.toFixed(1) : row.goals}</strong><em>{mode === 'adjusted' ? 'adjusted' : 'goals'}</em></span>
            </PlayerLink>)}
          </div>
        </section>}

        <div className="ladder-toolbar"><b>{rows.length}</b><span>players shown</span><em>{mode === 'adjusted' ? 'Adjusted score' : 'Raw goals'}</em></div>
        {loading && <div className="empty">Loading goal kickers…</div>}
        {error && !loading && <div className="empty error">Unable to load goal kickers.</div>}
        {!loading && !error && rows.length === 0 && <div className="empty">No goal kickers imported yet.</div>}
        {!loading && !error && rows.length > 0 && <>
          <div className="table-wrap">
            <table className="goal-rankings-table">
              <thead><tr><th>Rank</th><th>Player</th><th>Club</th><th>League</th><th>Season</th><th>Matches</th><th>Goals</th>{mode === 'adjusted' && <th>Adjusted</th>}</tr></thead>
              <tbody>{rows.map(row => <tr key={`${row.season}-${row.grade ?? 'all'}-${row.playerName}-${row.clubName}-${row.leagueName}`} className={row.rank <= 3 ? 'podium' : undefined}>
                <td><span className="rank-num">{row.rank <= 3 && <Trophy size={15} />}#{row.rank}</span></td>
                <td><PlayerLink row={row} className="player-cell"><TeamLogo name={row.clubName} size={38} /><span><b>{row.playerName}</b><small>{row.grade ?? 'All grades'}</small></span></PlayerLink></td>
                <td>{row.clubId ? <Link to={teamPath(row.clubId)}>{row.clubName}</Link> : row.clubName}</td>
                <td>{row.leagueId ? <Link to={leaguePath(row.leagueId)}>{row.leagueName}</Link> : row.leagueName}</td>
                <td>{row.season}</td>
                <td>{row.matches ?? '—'}</td>
                <td><strong className="rating">{row.goals}</strong></td>
                {mode === 'adjusted' && <td><strong className="rating">{row.adjustedGoals.toFixed(1)}</strong></td>}
              </tr>)}</tbody>
            </table>
          </div>
          <div className="ranking-cards">{rows.map(row => <PlayerLink row={row} className={`rank-card ${row.rank <= 3 ? 'podium' : ''}`} key={`card-${row.season}-${row.grade ?? 'all'}-${row.playerName}-${row.clubName}-${row.leagueName}`}>
            <span className="rank-num">#{row.rank}</span><TeamLogo name={row.clubName} size={48} /><span className="card-player"><b>{row.playerName}</b><small>{row.clubName} · {row.leagueName}</small></span><span className="card-side"><strong>{mode === 'adjusted' ? row.adjustedGoals.toFixed(1) : row.goals}</strong><small>{mode === 'adjusted' ? 'adjusted' : 'goals'}</small></span>
          </PlayerLink>)}</div>
        </>}
      </section>
    </main>
    <Footer />
    <style>{`
      .gk-page{max-width:1560px;margin:0 auto;padding:22px 18px 60px}.gk-hero{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(360px,.65fr);gap:20px;align-items:end;padding:24px;border:1px solid ${LINE};border-radius:18px;background:linear-gradient(135deg,#fff,#f7faff);box-shadow:0 14px 34px rgba(6,42,95,.08);margin-bottom:18px}.live-pill{display:inline-flex;align-items:center;gap:7px;border-radius:999px;background:rgba(215,25,32,.12);color:${PINK};padding:6px 9px;font-size:10px;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.live-pill span{width:7px;height:7px;border-radius:50%;background:${PINK};box-shadow:0 0 0 5px rgba(215,25,32,.14)}.header-copy h1{font-size:clamp(2.8rem,7vw,6.8rem);line-height:.82;margin:14px 0 12px;text-transform:uppercase;letter-spacing:-.075em;color:${NAVY}}.header-copy p{margin:0;color:#42526a;font-size:17px}.header-stats{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.header-stats b{border:1px solid ${LINE};background:#fff;border-radius:999px;padding:7px 10px;color:${NAVY};font-size:12px;text-transform:uppercase;letter-spacing:.08em}.mode-toggle{display:grid;gap:10px}.mode-toggle button{border:1px solid ${LINE};border-radius:12px;background:#fff;color:${NAVY};font-weight:950;padding:13px 12px;cursor:pointer;text-align:left;text-transform:uppercase;letter-spacing:.08em}.mode-toggle button.active{background:${PINK};border-color:${PINK};color:#fff}.ladder-shell{min-width:0;border:1px solid ${LINE};border-radius:18px;background:#fff;box-shadow:0 14px 34px rgba(6,42,95,.08);overflow:hidden}.top10-spotlight{padding:18px;border-bottom:1px solid ${LINE};background:#fff}.top10-spotlight header{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:13px}.top10-spotlight h2{margin:0;color:${NAVY};font-size:clamp(1.6rem,3vw,2.6rem);line-height:.9;text-transform:uppercase;letter-spacing:-.05em}.top10-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.top10-card{display:grid;grid-template-columns:auto 1fr;gap:9px;align-items:center;border:1px solid ${LINE};border-radius:15px;padding:12px;text-decoration:none;color:${TEXT};background:#fff;box-shadow:0 8px 20px rgba(6,42,95,.06);transition:transform .18s,box-shadow .18s}.top10-card:hover{transform:translateY(-2px);box-shadow:0 16px 32px rgba(6,42,95,.12)}.top10-card.rank-1,.top10-card.rank-2,.top10-card.rank-3{grid-template-columns:auto auto 1fr;background:linear-gradient(135deg,rgba(215,25,32,.08),#fff);border-top:3px solid ${PINK}}.top10-rank{grid-column:1/-1;color:${NAVY};font-size:22px;font-weight:950;letter-spacing:-.06em;display:flex;align-items:center;gap:5px}.top10-copy,.top10-copy b,.top10-copy small{display:block;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.top10-copy b{font-size:14px}.top10-copy small{color:${MUTED};font-size:11px}.top10-meta{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #edf1f6;padding-top:8px}.top10-meta strong{color:${PINK};font-size:20px}.top10-meta em{font-style:normal;color:${MUTED};font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.12em}.ladder-toolbar{display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid ${LINE};background:#f8fafc;color:${MUTED};font-weight:850}.ladder-toolbar b{font-size:22px;color:${NAVY}}.ladder-toolbar em{margin-left:auto;color:${PINK};font-style:normal;font-weight:950;text-transform:uppercase;font-size:12px}.table-wrap{overflow:auto}.goal-rankings-table{width:100%;border-collapse:separate;border-spacing:0;min-width:1060px}.goal-rankings-table thead th{position:sticky;top:0;z-index:2;background:${NAVY};color:#fff;text-align:left;padding:13px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.13em}.goal-rankings-table tbody tr{transition:background .16s}.goal-rankings-table tbody tr:hover{background:#f7fbff}.goal-rankings-table tbody tr.podium{background:linear-gradient(90deg,rgba(215,25,32,.08),transparent 42%)}.goal-rankings-table td{padding:13px 12px;border-bottom:1px solid #edf1f6;vertical-align:middle;color:${TEXT};font-size:13px}.goal-rankings-table td a{color:${TEXT};text-decoration:none;font-weight:900}.goal-rankings-table td small{display:block;color:${MUTED};font-size:11px;margin-top:2px}.rank-num{display:inline-flex;align-items:center;gap:5px;font-size:25px;font-weight:950;color:${NAVY};letter-spacing:-.07em}.player-cell{display:flex;align-items:center;gap:10px;min-width:250px;color:${TEXT};text-decoration:none}.player-cell span{min-width:0}.player-cell b,.player-cell small{max-width:290px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rating{font-size:21px;color:${PINK}}.ranking-cards{display:none}.empty{min-height:220px;display:grid;place-items:center;color:${MUTED};font-size:13px;font-weight:950;letter-spacing:.18em;text-transform:uppercase;text-align:center}.empty.error{color:${PINK}}@media(max-width:1120px){.gk-hero{grid-template-columns:1fr}.mode-toggle{grid-template-columns:1fr 1fr}.top10-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.gk-page{padding:14px 12px 38px}.gk-hero{padding:18px;border-radius:16px}.header-copy h1{font-size:3.2rem}.header-copy p{font-size:15px}.mode-toggle{grid-template-columns:1fr}.top10-spotlight{padding:14px}.top10-spotlight header{display:block}.top10-grid{grid-template-columns:1fr}.top10-card.rank-1,.top10-card.rank-2,.top10-card.rank-3,.top10-card{grid-template-columns:auto auto minmax(0,1fr);min-height:82px}.top10-rank{grid-column:auto;font-size:24px}.top10-meta{grid-column:1/-1}.table-wrap{display:none}.ranking-cards{display:grid;gap:10px;padding:12px}.rank-card{display:grid;grid-template-columns:38px 50px minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid ${LINE};border-radius:14px;padding:12px;min-height:94px;text-decoration:none;color:${TEXT};background:#fff;box-shadow:0 8px 20px rgba(6,42,95,.06)}.rank-card.podium{border-top:3px solid ${PINK};background:linear-gradient(90deg,rgba(215,25,32,.08),#fff)}.card-player{min-width:0}.card-player b,.card-player small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.card-player small{color:${MUTED};font-size:11px}.card-side{display:grid;justify-items:end;gap:7px;min-width:74px}.card-side strong{font-size:22px;color:${PINK}}.card-side small{color:${MUTED};font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.12em}.ladder-toolbar em{display:none}}
    `}</style>
  </div>
}
