/** Public News page — premium sports newsroom UI only. */
import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Flame, Search, X } from 'lucide-react'
import Nav from '../components/layout/Nav'
import Footer from '../components/layout/Footer'
import { useSeo } from '../lib/seo'
import { fetchRankings, leaguePath, strengthStars, teamPath, useAsync, type RankingEntry, type RankingsResponse } from '../lib/rankings'
import { TeamLogo, StarStrength } from '../components/rankings/bits'
import {
  loadPublished, CATEGORIES, allArticles, featuredArticles, latestArticles, trendingArticles, articlesInCategory, searchArticles,
  uniqueStates, uniqueLeagues, uniqueClubs, formatDate, newsPath, categoryOf, type CategoryId, type NewsFilters, type Article,
} from '../news/content'
import { EditorialImage } from '../news/components'

interface LeagueRow { id: string; name: string; state: string; strengthScore: number; clubCount: number; lastSyncedAt?: string | null }

const NAVY = '#062a5f'
const NAVY_2 = '#0b3f86'
const PINK = '#ff2c91'
const TEXT = '#111827'
const MUTED = '#64748b'
const LINE = '#dbe3ee'
const GREEN = '#16a34a'
const RED = '#dc2626'

const fetchLeagues = () => fetch('/api/leagues').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<{ data: LeagueRow[] }> }).then(r => r.data)

const CATEGORY_NAV: CategoryId[] = ['rankings', 'championship', 'league-news', 'club-news', 'opinion', 'community']

export default function News() {
  const [, bump] = useState(0)
  const rankings = useAsync<RankingsResponse>(fetchRankings, [])
  const leagues = useAsync<LeagueRow[]>(fetchLeagues, [])
  useEffect(() => { loadPublished().then(() => bump(x => x + 1)) }, [])

  const articles = allArticles()
  const hero = featuredArticles()[0] ?? latestArticles(1)[0]
  const latest = latestArticles(10).filter(a => a.slug !== hero?.slug)
  const trending = trendingArticles(5).length ? trendingArticles(5) : latestArticles(5)
  const lastUpdated = articles[0]?.date ?? null
  const categories = CATEGORY_NAV.filter(id => articlesInCategory(id, 1).length)

  useSeo({
    title: 'Got Netty News — Country Netball News & Rankings',
    description: 'The home of Australian country netball news: national rankings movers, transfers, player and coach spotlights, club and league news, opinion and history.',
    path: '/news',
    jsonLd: {
      '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Got Netty News',
      description: 'Australian country netball news and features.', url: 'https://gotnetty.com.au/news',
    },
  })

  return (
    <div style={{ background: '#fff', minHeight: '100vh', color: TEXT }}>
      <Nav />
      <main className="news-page">
        <PageHeader total={articles.length} updated={lastUpdated} categories={categories} />
        {hero && <FeaturedStory article={hero} />}
        <div className="news-layout">
          <section className="news-main" aria-label="Latest stories">
            <SectionTitle title="Latest Stories" />
            <div className="story-grid">{latest.map(a => <StoryCard key={a.slug} article={a} />)}</div>
            <TrendingSection articles={trending} />
            <NewsBrowse />
            <CategorySections categories={categories} />
          </section>
          <aside className="news-sidebar" aria-label="News sidebar">
            <RankingsCard entries={rankings.data?.data ?? []} week={rankings.data?.meta?.weekLabel ?? null} />
            <MoversCard entries={rankings.data?.data ?? []} />
            <StrongestLeagues leagues={leagues.data ?? []} />
            <LatestLeague leagues={leagues.data ?? []} />
            <ChampionshipTeaser />
            <SponsorSlot />
            <RecentArticles articles={latestArticles(5)} />
          </aside>
        </div>
      </main>
      <Footer />
      <NewsPageStyles />
    </div>
  )
}

function PageHeader({ total, updated, categories }: { total: number; updated: string | null; categories: CategoryId[] }) {
  return <header className="news-header">
    <div className="header-copy">
      <span className="live-pill"><span /> Latest updates</span>
      <h1>News</h1>
      <p>The latest country netball news, rankings, league updates and club stories from across Australia.</p>
      <div className="header-stats"><b>{total} published articles</b><b>{updated ? `Last updated ${formatDate(updated)}` : 'Updated weekly'}</b></div>
    </div>
    <nav className="category-nav" aria-label="News categories">{categories.map(id => <a key={id} href={`#cat-${id}`}>{categoryOf(id).label}</a>)}</nav>
  </header>
}

function FeaturedStory({ article }: { article: Article }) {
  return <section className="featured-story" aria-label="Featured story">
    <Link to={newsPath(article.slug)} className="featured-image"><EditorialImage seed={article.heroSeed} ratio="16 / 9" rounded={0} label={categoryOf(article.category).label} /></Link>
    <div className="featured-copy">
      <StatusBadges article={article} />
      <Link to={newsPath(article.slug)}><h2>{article.title}</h2></Link>
      <p>{article.summary}</p>
      <Meta article={article} />
      <Link to={newsPath(article.slug)} className="read-btn">Read More <ArrowRight size={15} /></Link>
    </div>
  </section>
}

function StoryCard({ article }: { article: Article }) {
  return <Link to={newsPath(article.slug)} className="story-card">
    <EditorialImage seed={article.heroSeed} ratio="16 / 10" rounded={14} label={categoryOf(article.category).label} />
    <div className="story-copy">
      <StatusBadges article={article} />
      <h3>{article.title}</h3>
      <p>{article.summary}</p>
      <Meta article={article} />
      <RelatedLine article={article} />
      <span className="story-cta">Read More <ArrowRight size={14} /></span>
    </div>
  </Link>
}

function TrendingSection({ articles }: { articles: Article[] }) {
  if (!articles.length) return null
  return <section className="trending-section" aria-label="Trending stories">
    <SectionTitle title="Trending" icon={<Flame size={18} />} />
    <div className="trend-grid">{articles.map((a, i) => <Link key={a.slug} to={newsPath(a.slug)} className="trend-row"><b>{i + 1}</b><span>{a.title}<small>{formatDate(a.date)} · {a.readingTime} min read</small></span></Link>)}</div>
  </section>
}

function CategorySections({ categories }: { categories: CategoryId[] }) {
  return <>{categories.map(id => {
    const items = articlesInCategory(id, 3)
    if (!items.length) return null
    return <section key={id} id={`cat-${id}`} className="category-section"><SectionTitle title={categoryOf(id).label} /><div className="story-grid compact">{items.map(a => <StoryCard key={a.slug} article={a} />)}</div></section>
  })}</>
}

function RankingsCard({ entries, week }: { entries: RankingEntry[]; week: string | null }) { if (!entries.length) return null; return <Link to="/rankings" className="side-card update"><span className="live-pill"><span /> Latest rankings</span><strong>{week ?? 'Season live'}</strong><small>#{entries[0].rank} {entries[0].clubName} leads {entries.length} ranked clubs</small></Link> }
function MoversCard({ entries }: { entries: RankingEntry[] }) { const movers = entries.filter(e => e.rankMovement !== 0).sort((a, b) => Math.abs(b.rankMovement) - Math.abs(a.rankMovement)).slice(0, 5); if (!movers.length) return null; return <article className="side-card"><CardHead title="Biggest movers" to="/rankings" />{movers.map(e => <Link key={e.clubId} to={teamPath(e.clubId)} className="side-row"><TeamLogo name={e.clubName} size={28} /><span><b>{e.clubName}</b><small>#{e.rank} nationally</small></span><Movement value={e.rankMovement} /></Link>)}</article> }
function StrongestLeagues({ leagues }: { leagues: LeagueRow[] }) { const top = [...leagues].sort((a, b) => b.strengthScore - a.strengthScore).slice(0, 5); if (!top.length) return null; return <article className="side-card"><CardHead title="Strongest leagues" to="/leagues" />{top.map(l => <Link key={l.id} to={leaguePath(l.id)} className="side-row"><LeagueMark league={l} /><span><b>{l.name}</b><small>{l.state} · {l.clubCount} clubs</small></span><StarStrength stars={strengthStars(l.strengthScore)} size={10} /></Link>)}</article> }
function LatestLeague({ leagues }: { leagues: LeagueRow[] }) { const latest = [...leagues].filter(l => l.lastSyncedAt).sort((a, b) => +new Date(b.lastSyncedAt!) - +new Date(a.lastSyncedAt!))[0]; if (!latest) return null; return <Link to={leaguePath(latest.id)} className="side-card latest-league"><span>Latest updated league</span><strong>{latest.name}</strong><small>{latest.state} · updated {updatedLabel(latest.lastSyncedAt)}</small></Link> }
function ChampionshipTeaser() { return <Link to="/championship" className="side-card championship"><CalendarDays /><span>Upcoming championships</span><strong>The national race is building</strong><small>Coming soon</small></Link> }
function SponsorSlot() { return <aside className="side-card sponsor"><span>Sponsor slot</span><strong>Advertise beside the national newsroom</strong><small>Premium editorial placement</small></aside> }
function RecentArticles({ articles }: { articles: Article[] }) { if (!articles.length) return null; return <article className="side-card"><CardHead title="Recent articles" to="/news" />{articles.map(a => <Link key={a.slug} to={newsPath(a.slug)} className="news-row"><b>{a.title}</b><small>{formatDate(a.date)} · {a.readingTime} min read</small></Link>)}</article> }

function NewsBrowse() {
  const url = new URLSearchParams(window.location.search)
  const [f, setF] = useState<NewsFilters>({ q: '', category: (url.get('category') as CategoryId) || '', state: '', league: '', club: '' })
  const set = (k: keyof NewsFilters, v: string) => setF(prev => ({ ...prev, [k]: v }))
  const active = !!(f.q?.trim() || f.category || f.state || f.league || f.club)
  const results = useMemo(() => (active ? searchArticles(f) : []), [f, active])
  return <section className="news-search" aria-label="Search news">
    <SectionTitle title="Search News" />
    <label className="search-box"><Search size={17} /><input value={f.q} onChange={e => set('q', e.target.value)} placeholder="Search news, clubs and leagues" /></label>
    <div className="filter-row">
      <Filter value={f.category ?? ''} onChange={v => set('category', v)} placeholder="All Categories" options={CATEGORIES.map(c => ({ id: c.id, name: c.label }))} />
      <Filter value={f.state ?? ''} onChange={v => set('state', v)} placeholder="All States" options={uniqueStates().map(s => ({ id: s, name: s }))} />
      <Filter value={f.league ?? ''} onChange={v => set('league', v)} placeholder="All Leagues" options={uniqueLeagues().map(s => ({ id: s, name: s }))} />
      <Filter value={f.club ?? ''} onChange={v => set('club', v)} placeholder="All Clubs" options={uniqueClubs().map(s => ({ id: s, name: s }))} />
      {active && <button onClick={() => setF({ q: '', category: '', state: '', league: '', club: '' })} className="clear-btn"><X size={13} /> Clear</button>}
    </div>
    {active && <div className="search-results"><b>{results.length} result{results.length === 1 ? '' : 's'}</b>{results.length ? <div className="story-grid compact">{results.map(a => <StoryCard key={a.slug} article={a} />)}</div> : <p>No stories match your search.</p>}</div>}
  </section>
}

function Filter({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: { id: string; name: string }[]; placeholder: string }) { return <select value={value} onChange={e => onChange(e.target.value)}><option value="">{placeholder}</option>{options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select> }
function SectionTitle({ title, icon }: { title: string; icon?: React.ReactNode }) { return <header className="section-title">{icon}<h2>{title}</h2></header> }
function CardHead({ title, to }: { title: string; to: string }) { return <header className="card-head"><h2>{title}</h2><Link to={to}>All</Link></header> }
function Meta({ article }: { article: Article }) { return <small className="meta">{formatDate(article.date)} · {article.readingTime} min read</small> }
function RelatedLine({ article }: { article: Article }) { const related = [article.tags.league && `League: ${article.tags.league}`, article.tags.club && `Club: ${article.tags.club}`].filter(Boolean); return related.length ? <small className="related">{related.join(' · ')}</small> : null }
function StatusBadges({ article }: { article: Article }) { const cat = categoryOf(article.category); return <span className="badges"><b style={{ background: article.breaking ? RED : cat.accent }}>{article.breaking ? 'BREAKING' : cat.label}</b>{isNew(article.date) && <b>NEW</b>}</span> }
function Movement({ value }: { value: number }) { const up = value > 0; const down = value < 0; return <span className={`move ${up ? 'up' : down ? 'down' : 'flat'}`}>{up ? '▲' : down ? '▼' : '—'}{value !== 0 ? Math.abs(value) : ''}</span> }
function LeagueMark({ league }: { league: LeagueRow }) { return <span className="league-mark" aria-hidden>{league.state || league.name.slice(0, 2)}</span> }
function isNew(iso: string) { return Date.now() - +new Date(iso) < 1000 * 60 * 60 * 24 * 7 }
function updatedLabel(iso?: string | null) { if (!iso) return 'live'; const days = Math.floor((Date.now() - +new Date(iso)) / 86400000); if (days <= 0) return 'today'; if (days === 1) return 'yesterday'; if (days < 7) return `${days}d ago`; return `${Math.floor(days / 7)}w ago` }

function NewsPageStyles() { return <style>{`
  .news-page{max-width:1560px;margin:0 auto;padding:22px 18px 60px}.news-header{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(320px,.65fr);gap:20px;align-items:end;padding:24px;border:1px solid ${LINE};border-radius:18px;background:linear-gradient(135deg,#fff,#f7faff);box-shadow:0 14px 34px rgba(6,42,95,.08);margin-bottom:18px}.live-pill{display:inline-flex;align-items:center;gap:7px;border-radius:999px;background:rgba(255,44,145,.12);color:${PINK};padding:6px 9px;font-size:10px;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.live-pill span{width:7px;height:7px;border-radius:50%;background:${PINK};box-shadow:0 0 0 5px rgba(255,44,145,.14)}.header-copy h1{font-size:clamp(3rem,8vw,7rem);line-height:.82;margin:14px 0 12px;text-transform:uppercase;letter-spacing:-.075em;color:${NAVY}}.header-copy p{margin:0;color:#42526a;font-size:17px}.header-stats{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.header-stats b{border:1px solid ${LINE};background:#fff;border-radius:999px;padding:7px 10px;color:${NAVY};font-size:12px;text-transform:uppercase;letter-spacing:.08em}.category-nav{display:flex;gap:9px;flex-wrap:wrap;justify-content:flex-end}.category-nav a{border:1px solid ${LINE};border-radius:999px;padding:8px 10px;color:${NAVY};text-decoration:none;font-weight:950;font-size:12px;text-transform:uppercase}.featured-story{display:grid;grid-template-columns:minmax(0,1.22fr) minmax(360px,.78fr);gap:0;border:1px solid ${LINE};border-radius:18px;background:#fff;box-shadow:0 18px 44px rgba(6,42,95,.12);overflow:hidden;margin-bottom:18px}.featured-image{display:block}.featured-copy{padding:28px;display:flex;flex-direction:column;justify-content:center}.featured-copy a{text-decoration:none}.featured-copy h2{font-size:clamp(2.8rem,5.8vw,6.4rem);line-height:.84;margin:18px 0 14px;text-transform:uppercase;letter-spacing:-.075em;color:${NAVY}}.featured-copy p{font-size:18px;line-height:1.55;color:#42526a;margin:0 0 16px}.read-btn,.story-cta{display:inline-flex;align-items:center;gap:7px;color:${PINK};font-weight:950;text-transform:uppercase;text-decoration:none;font-size:12px;letter-spacing:.1em;margin-top:16px}.news-layout{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:18px;align-items:start}.news-main{min-width:0}.section-title{display:flex;align-items:center;gap:8px;border-bottom:3px solid ${NAVY};margin:22px 0 14px;padding-bottom:9px;color:${NAVY}}.section-title h2{font-size:26px;text-transform:uppercase;margin:0;letter-spacing:-.04em}.story-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.story-grid.compact{grid-template-columns:repeat(3,minmax(0,1fr))}.story-card{border:1px solid ${LINE};border-radius:16px;background:#fff;box-shadow:0 12px 28px rgba(6,42,95,.08);overflow:hidden;text-decoration:none;color:${TEXT};transition:transform .16s,box-shadow .16s}.story-card:hover{transform:translateY(-2px);box-shadow:0 18px 34px rgba(6,42,95,.12)}.story-copy{padding:16px}.story-copy h3{font-size:25px;line-height:1.02;color:${NAVY};margin:11px 0 8px;text-transform:uppercase;letter-spacing:-.045em}.story-copy p{color:#4b5d73;line-height:1.48;margin:0 0 10px}.badges{display:flex;gap:7px;flex-wrap:wrap}.badges b{display:inline-flex;border-radius:999px;background:${PINK};color:#fff;padding:5px 8px;font-size:10px;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.meta,.related{display:block;color:${MUTED};font-weight:850;font-size:12px;margin-top:6px}.related{color:${NAVY}}.trending-section{margin-top:24px}.trend-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.trend-row{display:flex;gap:10px;border:1px solid ${LINE};border-radius:14px;padding:12px;color:${TEXT};text-decoration:none;background:#fff}.trend-row>b{font-size:30px;color:${PINK};line-height:.9}.trend-row span{font-weight:950}.trend-row small{display:block;color:${MUTED};font-size:11px;margin-top:5px}.news-sidebar{position:sticky;top:16px;display:flex;flex-direction:column;gap:14px}.side-card{display:block;border:1px solid ${LINE};border-radius:16px;background:#fff;box-shadow:0 14px 34px rgba(6,42,95,.08);padding:16px;text-decoration:none;color:${TEXT};overflow:hidden}.side-card.update strong,.latest-league strong,.sponsor strong,.championship strong{display:block;font-size:23px;line-height:1.02;margin-top:10px;color:${NAVY}}.side-card small{display:block;color:${MUTED};font-weight:800;margin-top:7px}.card-head{display:flex;align-items:center;justify-content:space-between;margin:-16px -16px 10px;padding:13px 16px;border-bottom:1px solid ${LINE};background:#f8fafc}.card-head h2{margin:0;color:${NAVY};font-size:18px;text-transform:uppercase}.card-head a{color:${PINK};font-weight:950;text-decoration:none;font-size:12px}.side-row{display:flex;align-items:center;gap:9px;padding:11px 0;border-bottom:1px solid #edf1f6;color:${TEXT};text-decoration:none}.side-row span{min-width:0;flex:1}.side-row b,.side-row small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.league-mark{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,${NAVY},${NAVY_2});color:#fff;font-size:10px;font-weight:950;flex-shrink:0}.news-row{display:block;padding:11px 0;border-bottom:1px solid #edf1f6;color:${TEXT};text-decoration:none}.news-row b{display:block;line-height:1.2}.move{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:4px 6px;min-width:30px;font-size:10px;font-weight:950}.move.up{background:#e8f8ee;color:${GREEN}}.move.down{background:#fdecec;color:${RED}}.move.flat{background:#eef2f7;color:${MUTED}}.championship{background:linear-gradient(135deg,#071832,${NAVY});color:#fff}.championship span,.sponsor span,.latest-league span{display:block;color:${PINK};font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.15em;margin:8px 0}.championship strong{color:#fff}.championship small{color:#bfd0e5}.sponsor{border-style:dashed;background:#fbfdff}.news-search{margin-top:28px}.search-box{display:flex;align-items:center;gap:9px;background:#fff;border:1px solid ${LINE};border-radius:12px;padding:0 12px;max-width:620px}.search-box input{border:0;outline:0;min-width:0;width:100%;padding:13px 0;font:inherit;color:${TEXT};background:transparent}.filter-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}.filter-row select,.clear-btn{border:1px solid ${LINE};border-radius:12px;background:#fff;color:${TEXT};font-weight:850;padding:12px}.clear-btn{display:inline-flex;align-items:center;gap:6px;color:${PINK};cursor:pointer}.search-results{margin-top:16px}.search-results>b{display:block;color:${MUTED};text-transform:uppercase;font-size:12px;letter-spacing:.12em;margin-bottom:12px}.category-section{margin-top:26px}
  @media (max-width:1180px){.news-layout{grid-template-columns:1fr}.news-sidebar{position:static;display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.featured-story{grid-template-columns:1fr}.trend-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.story-grid.compact{grid-template-columns:repeat(2,minmax(0,1fr))}.news-header{grid-template-columns:1fr}.category-nav{justify-content:flex-start}}
  @media (max-width:720px){.news-page{padding:14px 12px 38px}.news-header{padding:18px;border-radius:16px}.header-copy h1{font-size:3.5rem}.header-copy p{font-size:15px}.featured-copy{padding:20px}.featured-copy h2{font-size:3rem;overflow-wrap:anywhere}.story-grid,.story-grid.compact,.trend-grid{grid-template-columns:1fr}.news-sidebar{display:flex}.news-sidebar .side-card{width:100%}.story-card{border-radius:14px}.story-copy h3{font-size:22px;overflow-wrap:anywhere}.category-nav a{font-size:11px;min-height:38px;display:inline-flex;align-items:center}.filter-row{display:grid}.filter-row select,.clear-btn{width:100%;min-height:44px}.trend-row{min-height:72px}}
`}</style> }
