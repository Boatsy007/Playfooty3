/**
 * Got Netty News — landing page. Premium country-netball publication feel.
 * Isolated feature: reuses only the shared Nav/Footer/useSeo; all news UI and
 * styling live in the self-contained src/news module.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ArrowRight, TrendingUp, Flame, X } from 'lucide-react'
import Nav from '../components/layout/Nav'
import Footer from '../components/layout/Footer'
import { useSeo } from '../lib/seo'
import {
  CATEGORIES, featuredArticles, latestArticles, trendingArticles, mostReadArticles,
  breakingHeadlines, articlesInCategory, searchArticles, uniqueStates, uniqueLeagues, uniqueClubs,
  formatDate, newsPath, categoryOf, type CategoryId, type NewsFilters,
} from '../news/content'
import {
  NewsStyles, BreakingBar, ArticleCard, EditorialImage, CategoryTag, Eyebrow, SectionHead,
  PINK, GOLD_DK, INK, MUTE, FAINT, LINE, PAGE, PAGE_ALT,
} from '../news/components'

const RAIL_CATEGORIES: CategoryId[] = ['rankings', 'club-news', 'league-news', 'transfers', 'player-spotlight', 'community', 'opinion', 'history']

export default function News() {
  const featured = featuredArticles()
  const hero = featured[0]
  const moreFeatured = featured.slice(1, 4).length ? featured.slice(1, 4) : latestArticles(4).slice(1, 4)
  const latest = latestArticles(7)
  const trending = trendingArticles(5)
  const mostRead = mostReadArticles(5)

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
    <div style={{ background: PAGE, minHeight: '100vh' }}>
      <NewsStyles />
      <Nav />
      <BreakingBar items={breakingHeadlines()} />

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
        {/* Masthead */}
        <div style={{ padding: '30px 0 18px' }}>
          <Eyebrow>The Country Netball Publication</Eyebrow>
          <h1 className="font-display" style={{ fontSize: 'clamp(2.6rem,7vw,4.6rem)', color: INK, lineHeight: 0.86, margin: '12px 0 0' }}>
            GOT NETTY <span style={{ color: PINK }}>NEWS</span>
          </h1>
        </div>

        {/* Featured hero */}
        {hero && (
          <section className="cnews-fade" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.35fr) minmax(0,1fr)', gap: 28, alignItems: 'center', padding: '8px 0 40px', borderBottom: `1px solid ${LINE}` }}>
            <Link to={newsPath(hero.slug)} className="cnews-link cnews-card cnews-hero-img">
              <div className="cnews-img-wrap" style={{ borderRadius: 18 }}>
                <EditorialImage seed={hero.heroSeed} ratio="16 / 10" label={categoryOf(hero.category).label} rounded={18} />
              </div>
            </Link>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span className="font-condensed" style={{ background: PINK, color: '#fff', fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', fontSize: 10.5, padding: '4px 9px', borderRadius: 6 }}>Featured</span>
                <CategoryTag id={hero.category} />
              </div>
              <Link to={newsPath(hero.slug)} className="cnews-link cnews-card">
                <h2 className="cnews-head font-display" style={{ color: INK, fontSize: 'clamp(2rem,4.4vw,3.4rem)', lineHeight: 0.94, margin: '0 0 12px' }}>{hero.title}</h2>
              </Link>
              <p style={{ color: MUTE, fontSize: 17, lineHeight: 1.5, margin: '0 0 16px', maxWidth: 560 }}>{hero.subtitle}</p>
              <div className="font-condensed" style={{ color: FAINT, fontSize: 13, fontWeight: 700, letterSpacing: '0.03em', marginBottom: 18 }}>
                By {hero.author.name} · {hero.author.role} &nbsp;·&nbsp; {formatDate(hero.date)} · {hero.readingTime} min read
              </div>
              <Link to={newsPath(hero.slug)} className="btn-pink" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 26px', fontSize: 14, letterSpacing: '0.04em' }}>
                Read Story <ArrowRight size={16} />
              </Link>
            </div>
          </section>
        )}

        {/* Featured stories */}
        {moreFeatured.length > 0 && (
          <section style={{ padding: '36px 0' }}>
            <SectionHead title="Featured Stories" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 26 }}>
              {moreFeatured.map(a => <ArticleCard key={a.slug} article={a} variant="large" />)}
            </div>
          </section>
        )}

        {/* Latest + sidebar */}
        <section style={{ padding: '12px 0 44px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 40 }} className="cnews-latest">
          <div>
            <SectionHead title="Latest News" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 24 }}>
              {latest.map(a => <ArticleCard key={a.slug} article={a} />)}
            </div>
          </div>
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
            <RankList title="Trending" icon={<TrendingUp size={15} color={PINK} />} items={trending} />
            <RankList title="Most Read" icon={<Flame size={15} color={GOLD_DK} />} items={mostRead} />
          </aside>
        </section>

        {/* Search & browse */}
        <NewsBrowse />

        {/* Category rails */}
        {RAIL_CATEGORIES.map(id => {
          const items = articlesInCategory(id, 4)
          if (!items.length) return null
          return (
            <section key={id} style={{ padding: '18px 0 30px' }}>
              <SectionHead title={categoryOf(id).label} to={`/news?category=${id}`} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 24 }}>
                {items.map(a => <ArticleCard key={a.slug} article={a} />)}
              </div>
            </section>
          )
        })}
      </main>
      <Footer />

      <style>{`@media (max-width: 860px){ .cnews-latest{ grid-template-columns: 1fr !important } } @media (max-width: 720px){ section[style*="1.35fr"]{ grid-template-columns: 1fr !important } }`}</style>
    </div>
  )
}

function RankList({ title, icon, items }: { title: string; icon: React.ReactNode; items: { slug: string; title: string; category: CategoryId; date: string; readingTime: number }[] }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: `2px solid ${INK}`, paddingBottom: 8, marginBottom: 6 }}>
        {icon}<h3 className="font-display" style={{ color: INK, fontSize: 20, margin: 0 }}>{title}</h3>
      </div>
      {items.map((a, i) => (
        <Link key={a.slug} to={newsPath(a.slug)} className="cnews-link cnews-card" style={{ display: 'grid', gridTemplateColumns: '30px 1fr', gap: 10, alignItems: 'start', padding: '12px 0', borderBottom: `1px solid ${LINE}` }}>
          <span className="font-display" style={{ fontSize: 26, color: i < 3 ? PINK : 'rgba(17,17,17,0.2)', lineHeight: 0.9 }}>{i + 1}</span>
          <span>
            <CategoryTag id={a.category} />
            <span className="cnews-head font-display" style={{ display: 'block', color: INK, fontSize: 16, margin: '5px 0 4px', lineHeight: 1.05 }}>{a.title}</span>
            <span className="font-condensed" style={{ color: FAINT, fontSize: 11.5, fontWeight: 700 }}>{formatDate(a.date)} · {a.readingTime} min</span>
          </span>
        </Link>
      ))}
    </div>
  )
}

// ── Search + filters ─────────────────────────────────────────────────────────
function NewsBrowse() {
  const url = new URLSearchParams(window.location.search)
  const [f, setF] = useState<NewsFilters>({ q: '', category: (url.get('category') as CategoryId) || '', state: '', league: '', club: '' })
  const set = (k: keyof NewsFilters, v: string) => setF(prev => ({ ...prev, [k]: v }))
  const active = !!(f.q?.trim() || f.category || f.state || f.league || f.club)
  const results = useMemo(() => (active ? searchArticles(f) : []), [f, active])

  return (
    <section style={{ padding: '10px 0 40px', borderTop: `1px solid ${LINE}` }}>
      <div style={{ padding: '28px 0 18px' }}><Eyebrow>Search & Browse</Eyebrow></div>
      <div style={{ position: 'relative', maxWidth: 620, marginBottom: 12 }}>
        <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: MUTE }} />
        <input value={f.q} onChange={e => set('q', e.target.value)} placeholder="Search news, players, clubs, leagues"
          className="font-condensed" style={{ width: '100%', borderRadius: 12, outline: 'none', color: INK, fontSize: 16, background: PAGE_ALT, border: `1px solid ${LINE}`, padding: '14px 16px 14px 46px' }} />
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Filter value={f.category ?? ''} onChange={v => set('category', v)} placeholder="All Categories" options={CATEGORIES.map(c => ({ id: c.id, name: c.label }))} />
        <Filter value={f.state ?? ''} onChange={v => set('state', v)} placeholder="All States" options={uniqueStates().map(s => ({ id: s, name: s }))} />
        <Filter value={f.league ?? ''} onChange={v => set('league', v)} placeholder="All Leagues" options={uniqueLeagues().map(s => ({ id: s, name: s }))} wide />
        <Filter value={f.club ?? ''} onChange={v => set('club', v)} placeholder="All Clubs" options={uniqueClubs().map(s => ({ id: s, name: s }))} />
        {active && <button onClick={() => setF({ q: '', category: '', state: '', league: '', club: '' })} className="font-condensed" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: 'none', border: `1px solid ${LINE}`, borderRadius: 10, padding: '10px 14px', color: MUTE, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 12 }}><X size={13} /> Clear</button>}
      </div>

      {active && (
        <div style={{ marginTop: 24 }}>
          <div className="font-condensed" style={{ color: FAINT, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: 12, marginBottom: 12 }}>{results.length} result{results.length === 1 ? '' : 's'}</div>
          {results.length === 0
            ? <div className="font-condensed" style={{ color: MUTE, padding: '20px 0', letterSpacing: '0.06em' }}>No stories match your search.</div>
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 24 }}>{results.map(a => <ArticleCard key={a.slug} article={a} />)}</div>}
        </div>
      )}
    </section>
  )
}

function Filter({ value, onChange, options, placeholder, wide }: { value: string; onChange: (v: string) => void; options: { id: string; name: string }[]; placeholder: string; wide?: boolean }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)} className="font-condensed"
        style={{ appearance: 'none', cursor: 'pointer', background: value ? PINK : PAGE, color: value ? '#fff' : INK, border: `1px solid ${value ? PINK : LINE}`, borderRadius: 10, padding: '11px 32px 11px 14px', fontWeight: 700, letterSpacing: '0.03em', fontSize: 13.5, minWidth: wide ? 190 : 130, maxWidth: wide ? 240 : undefined }}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: value ? '#fff' : MUTE, fontSize: 11 }}>▾</span>
    </div>
  )
}
