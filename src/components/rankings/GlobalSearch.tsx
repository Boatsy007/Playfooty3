/**
 * Global search overlay — clubs/teams, leagues and frontend news results.
 * Controlled by the nav via useSearchController(); also opens on Cmd/Ctrl+K.
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Search, X } from 'lucide-react'
import { fetchSearch, teamPath, leaguePath, strengthStars, type SearchResults } from '../../lib/rankings'
import { TeamLogo, StarStrength } from './bits'
import { loadPublished, searchArticles, latestArticles, formatDate, newsPath, categoryOf, type Article } from '../../news/content'
import { EditorialImage } from '../../news/components'

const NAVY = '#062a5f'
const NAVY_2 = '#0b3f86'
const PINK = '#d71920'
const TEXT = '#111827'
const MUTED = '#64748b'
const LINE = '#dbe3ee'
const PAGE = '#ffffff'

export interface SearchController {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

export function useSearchController(): SearchController {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen(o => !o), [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); toggle() }
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, close])
  return { isOpen, open, close, toggle }
}

export default function GlobalSearch({ controller }: { controller: SearchController }) {
  const { isOpen, close } = controller
  const [q, setQ] = useState('')
  const [res, setRes] = useState<SearchResults>({ teams: [], leagues: [] })
  const [loading, setLoading] = useState(false)
  const [, bump] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const active = q.trim().length >= 2
  const news = useMemo(() => active ? searchArticles({ q: q.trim(), category: '', state: '', league: '', club: '' }).slice(0, 6) : [], [q, active])
  const suggestions = latestArticles(4)
  const hasResults = res.teams.length > 0 || res.leagues.length > 0 || news.length > 0
  const go = useCallback((path: string) => { close(); setQ(''); navigate(path) }, [navigate, close])

  useEffect(() => { loadPublished().then(() => bump(x => x + 1)) }, [])
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 40) }, [isOpen])

  useEffect(() => {
    if (!active) { setRes({ teams: [], leagues: [] }); return }
    setLoading(true)
    const id = setTimeout(() => {
      fetchSearch(q.trim()).then(setRes).catch(() => setRes({ teams: [], leagues: [] })).finally(() => setLoading(false))
    }, 220)
    return () => clearTimeout(id)
  }, [q, active])

  if (!isOpen) return null

  return (
    <div className="gn-search-backdrop" onClick={close}>
      <div className="gn-search-shell" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Search PlayFooty">
        <header className="gn-search-head">
          <div>
            <span className="gn-search-live"><span /> Search</span>
            <h2>Search PlayFooty</h2>
            <p>Find clubs, leagues, teams and news from across Australian community football.</p>
          </div>
          <button onClick={close} className="gn-search-close" aria-label="Close search"><X size={19} /></button>
        </header>

        <label className="gn-search-input">
          <Search size={21} />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Search club, team, league or news" />
          <kbd>CTRL K</kbd>
        </label>

        <div className="gn-search-results">
          {!active && <EmptyState suggestions={suggestions} go={go} />}
          {active && loading && <Hint>Searching clubs and leagues…</Hint>}
          {active && !loading && !hasResults && <NoResults query={q} suggestions={suggestions} go={go} />}

          {res.teams.length > 0 && <ResultGroup title="Clubs & Teams">{res.teams.map(t => <ClubResult key={t.clubId} team={t} go={go} />)}</ResultGroup>}
          {res.leagues.length > 0 && <ResultGroup title="Leagues">{res.leagues.map(l => <LeagueResult key={l.id} league={l} go={go} />)}</ResultGroup>}
          {news.length > 0 && <ResultGroup title="News">{news.map(a => <NewsResult key={a.slug} article={a} go={go} />)}</ResultGroup>}
        </div>
      </div>
      <SearchStyles />
    </div>
  )
}

type TeamResult = SearchResults['teams'][number]
type LeagueResultType = SearchResults['leagues'][number]

function ClubResult({ team, go }: { team: TeamResult; go: (path: string) => void }) {
  return <button onClick={() => go(teamPath(team.clubId))} className="gn-result-card club-result">
    <TeamLogo name={team.clubName} size={42} />
    <span><b>{team.clubName}</b><small>{team.leagueName} · {team.state}</small></span>
    <em>#{team.rank}</em>
  </button>
}

function LeagueResult({ league, go }: { league: LeagueResultType; go: (path: string) => void }) {
  return <button onClick={() => go(leaguePath(league.id))} className="gn-result-card league-result">
    <span className="league-mark">{league.state}</span>
    <span><b>{league.name}</b><small>{league.state} · Strength rating</small></span>
    <StarStrength stars={strengthStars(league.strengthScore)} size={10} />
  </button>
}

function NewsResult({ article, go }: { article: Article; go: (path: string) => void }) {
  const category = categoryOf(article.category)
  return <button onClick={() => go(newsPath(article.slug))} className="gn-result-card news-result">
    <EditorialImage seed={article.heroSeed} ratio="4 / 3" rounded={10} label={category.label} />
    <span><i style={{ background: category.accent }}>{category.label}</i><b>{article.title}</b><small>{formatDate(article.date)} · {article.readingTime} min read</small><small>{article.summary}</small></span>
  </button>
}

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="gn-result-group"><h3>{title}</h3><div>{children}</div></section>
}

function EmptyState({ suggestions, go }: { suggestions: Article[]; go: (path: string) => void }) {
  return <div className="gn-empty-state">
    <h3>Start with a club, league or story.</h3>
    <p>Try “Geelong”, “Gippsland”, “rankings” or “championship”.</p>
    {suggestions.length > 0 && <div className="suggestions"><span>Recent articles</span>{suggestions.map(a => <button key={a.slug} onClick={() => go(newsPath(a.slug))}>{a.title}<ArrowRight size={13} /></button>)}</div>}
  </div>
}

function NoResults({ query, suggestions, go }: { query: string; suggestions: Article[]; go: (path: string) => void }) {
  return <div className="gn-empty-state"><h3>No matches for “{query.trim()}”.</h3><p>Try a club name, league name, state, rankings or championship.</p>{suggestions.length > 0 && <div className="suggestions"><span>Popular reads</span>{suggestions.slice(0, 3).map(a => <button key={a.slug} onClick={() => go(newsPath(a.slug))}>{a.title}<ArrowRight size={13} /></button>)}</div>}</div>
}

function Hint({ children }: { children: React.ReactNode }) {
  return <div className="gn-search-hint">{children}</div>
}

function SearchStyles() { return <style>{`
  .gn-search-backdrop{position:fixed;inset:0;z-index:120;background:rgba(7,24,50,.58);backdrop-filter:blur(8px);display:flex;justify-content:center;align-items:flex-start;padding:7vh 16px 0}.gn-search-shell{width:100%;max-width:980px;max-height:86vh;display:flex;flex-direction:column;background:${PAGE};border:1px solid ${LINE};border-radius:22px;overflow:hidden;box-shadow:0 40px 120px rgba(0,0,0,.28)}.gn-search-head{display:flex;justify-content:space-between;gap:18px;padding:22px 24px;background:linear-gradient(135deg,#fff,#f7faff);border-bottom:1px solid ${LINE}}.gn-search-head h2{font-size:clamp(2.2rem,5vw,4.6rem);line-height:.82;margin:12px 0 8px;text-transform:uppercase;letter-spacing:-.075em;color:${NAVY}}.gn-search-head p{margin:0;color:#42526a;font-size:15px}.gn-search-live{display:inline-flex;align-items:center;gap:7px;border-radius:999px;background:rgba(215,25,32,.12);color:${PINK};padding:6px 9px;font-size:10px;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.gn-search-live span{width:7px;height:7px;border-radius:50%;background:${PINK};box-shadow:0 0 0 5px rgba(215,25,32,.14)}.gn-search-close{align-self:flex-start;border:1px solid ${LINE};border-radius:12px;background:#fff;color:${MUTED};padding:10px;cursor:pointer}.gn-search-input{display:flex;align-items:center;gap:12px;margin:16px 18px;border:2px solid ${NAVY};border-radius:16px;padding:0 16px;background:#fff}.gn-search-input svg{color:${PINK}}.gn-search-input input{flex:1;min-width:0;border:0;outline:0;padding:17px 0;font-size:18px;color:${TEXT};background:transparent}.gn-search-input kbd{border:1px solid ${LINE};border-radius:8px;padding:4px 7px;color:${MUTED};font-size:11px;font-weight:850}.gn-search-results{overflow:auto;padding:0 18px 18px}.gn-result-group{margin-top:10px}.gn-result-group h3{position:sticky;top:0;z-index:1;margin:0 -18px 10px;padding:11px 18px;background:${NAVY};color:#fff;font-size:12px;text-transform:uppercase;letter-spacing:.16em}.gn-result-group>div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.gn-result-card{width:100%;border:1px solid ${LINE};border-radius:15px;background:#fff;color:${TEXT};padding:12px;text-align:left;cursor:pointer;text-decoration:none;display:flex;align-items:center;gap:11px;min-width:0;transition:transform .16s,box-shadow .16s}.gn-result-card:hover{transform:translateY(-2px);box-shadow:0 14px 28px rgba(6,42,95,.12)}.gn-result-card span{min-width:0;flex:1}.gn-result-card b{display:block;color:${NAVY};font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gn-result-card small{display:block;color:${MUTED};font-size:12px;font-weight:750;margin-top:3px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.gn-result-card em{font-style:normal;font-size:24px;font-weight:950;color:${PINK}}.league-mark{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,${NAVY},${NAVY_2});color:#fff;font-size:10px;font-weight:950;flex-shrink:0}.news-result{align-items:stretch}.news-result>.cnews-img-wrap{width:112px;flex-shrink:0}.news-result i{display:inline-flex;border-radius:999px;color:#fff;padding:4px 7px;font-style:normal;font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.1em;margin-bottom:5px}.gn-empty-state,.gn-search-hint{padding:34px 8px;text-align:center;color:${MUTED}}.gn-empty-state h3{font-size:28px;line-height:1;margin:0 0 8px;color:${NAVY};text-transform:uppercase;letter-spacing:-.04em}.gn-empty-state p{margin:0 0 18px}.suggestions{display:grid;gap:8px;max-width:620px;margin:0 auto}.suggestions span{color:${PINK};font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.14em}.suggestions button{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid ${LINE};border-radius:12px;background:#fff;color:${TEXT};padding:11px 13px;cursor:pointer;text-align:left;font-weight:850}.gn-search-hint{font-weight:950;text-transform:uppercase;letter-spacing:.14em}.gn-result-card:focus,.gn-search-close:focus,.suggestions button:focus{outline:3px solid rgba(215,25,32,.28);outline-offset:2px}
  @media (max-width:720px){.gn-search-backdrop{padding:0}.gn-search-shell{max-height:100vh;height:100vh;border-radius:0;border:0}.gn-search-head{padding:18px}.gn-search-head h2{font-size:3rem}.gn-search-input{margin:12px}.gn-search-input input{font-size:16px}.gn-search-input kbd{display:none}.gn-search-results{padding:0 12px 18px}.gn-result-group h3{margin:0 -12px 10px;padding:11px 12px}.gn-result-group>div{grid-template-columns:1fr}.gn-result-card{min-height:72px}.news-result>.cnews-img-wrap{width:96px}.gn-empty-state h3{font-size:24px}.suggestions button{min-height:46px}}
`}</style> }
