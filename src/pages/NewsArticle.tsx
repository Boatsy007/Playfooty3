/**
 * PlayFooty News — article page. Premium editorial layout with hero, byline, social
 * share, rich body (paragraphs, headings, pull quotes, image gallery), related
 * stories and "more from league / club". Full SEO (Article + Breadcrumb JSON-LD,
 * OG/Twitter, canonical). Isolated feature — reuses only shared Nav/Footer/useSeo.
 */
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Link2, Clock } from 'lucide-react'
import Nav from '../components/layout/Nav'
import Footer from '../components/layout/Footer'
import { useSeo } from '../lib/seo'
import {
  loadPublished, getArticle, relatedArticles, moreFromLeague, moreFromClub, formatDate, categoryOf, type Block,
} from '../news/content'
import {
  NewsStyles, EditorialImage, ArticleCard, CategoryTag, SectionHead,
  PINK, GOLD_DK, INK, MUTE, FAINT, LINE, PAGE, PAGE_ALT,
} from '../news/components'

export default function NewsArticle() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  useEffect(() => { loadPublished().then(() => setReady(true)) }, [])
  void ready
  const article = getArticle(slug)
  const cat = article ? categoryOf(article.category) : null
  const url = `https://playfooty.com.au/news/${slug}`

  useSeo({
    title: article ? `${article.title} | PlayFooty News` : 'Article | PlayFooty News',
    description: article?.summary ?? 'Community Football news from PlayFooty.',
    path: `/news/${slug}`,
    jsonLd: article ? [
      {
        '@context': 'https://schema.org', '@type': 'NewsArticle', headline: article.title,
        description: article.summary, articleSection: cat?.label,
        datePublished: article.date, dateModified: article.date,
        author: { '@type': 'Person', name: article.author.name },
        publisher: { '@type': 'Organization', name: 'PlayFooty' },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url }, url,
      },
      {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://playfooty.com.au' },
          { '@type': 'ListItem', position: 2, name: 'News', item: 'https://playfooty.com.au/news' },
          { '@type': 'ListItem', position: 3, name: cat?.label ?? 'News', item: `https://playfooty.com.au/news?category=${article.category}` },
          { '@type': 'ListItem', position: 4, name: article.title, item: url },
        ],
      },
    ] : undefined,
  })

  if (!article) {
    return (
      <div style={{ background: PAGE, minHeight: '100vh' }}>
        <NewsStyles /><Nav />
        <div className="font-condensed" style={{ minHeight: '50vh', display: 'grid', placeItems: 'center', color: MUTE, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, fontSize: 13 }}>Article not found.</div>
        <Footer />
      </div>
    )
  }

  const related = relatedArticles(article, 3)
  const league = article.tags.league ? moreFromLeague(article.tags.league, article.slug, 3) : []
  const club = article.tags.club ? moreFromClub(article.tags.club, article.slug, 3) : []

  const share = (net: 'x' | 'fb' | 'copy') => {
    if (net === 'copy') { navigator.clipboard?.writeText(url).catch(() => {}); return }
    const u = encodeURIComponent(url), t = encodeURIComponent(article.title)
    const href = net === 'x' ? `https://twitter.com/intent/tweet?url=${u}&text=${t}` : `https://www.facebook.com/sharer/sharer.php?u=${u}`
    window.open(href, '_blank', 'noopener')
  }

  return (
    <div style={{ background: PAGE, minHeight: '100vh' }}>
      <NewsStyles />
      <Nav />

      {/* Breadcrumb */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '22px 20px 0' }}>
        <button onClick={() => navigate('/news')} className="font-condensed" style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTE, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: 12 }}>
          <ArrowLeft size={14} /> PlayFooty News
        </button>
      </div>

      {/* Header */}
      <header style={{ maxWidth: 820, margin: '0 auto', padding: '16px 20px 8px' }}>
        <div style={{ marginBottom: 14 }}><Link to={`/news?category=${article.category}`} style={{ textDecoration: 'none' }}><CategoryTag id={article.category} /></Link></div>
        <h1 className="font-display cnews-fade" style={{ color: INK, fontSize: 'clamp(2.2rem,6vw,4rem)', lineHeight: 0.92, margin: '0 0 14px' }}>{article.title}</h1>
        <p style={{ color: MUTE, fontSize: 'clamp(1.05rem,2.4vw,1.35rem)', lineHeight: 1.45, margin: '0 0 18px', fontFamily: 'Georgia, serif' }}>{article.subtitle}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, padding: '14px 0' }}>
          <div className="font-condensed" style={{ color: FAINT, fontSize: 13, fontWeight: 700, letterSpacing: '0.02em' }}>
            <span style={{ color: INK }}>By {article.author.name}</span> · {article.author.role}<br />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 3 }}>{formatDate(article.date)} <span style={{ opacity: 0.4 }}>·</span> <Clock size={12} /> {article.readingTime} min read</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <ShareBtn onClick={() => share('x')} label="Share on X"><span style={{ fontWeight: 900, fontSize: 15 }}>𝕏</span></ShareBtn>
            <ShareBtn onClick={() => share('fb')} label="Share on Facebook"><span className="font-display" style={{ fontSize: 18 }}>f</span></ShareBtn>
            <ShareBtn onClick={() => share('copy')} label="Copy link"><Link2 size={16} /></ShareBtn>
          </div>
        </div>
      </header>

      {/* Hero image */}
      <div style={{ maxWidth: 1040, margin: '20px auto 0', padding: '0 20px' }}>
        <EditorialImage seed={article.heroSeed} ratio="16 / 8" label={cat?.label} rounded={18} />
        {article.heroCredit && <div className="font-condensed" style={{ color: FAINT, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 8 }}>{article.heroCredit}</div>}
      </div>

      {/* Body */}
      <article style={{ maxWidth: 720, margin: '0 auto', padding: '34px 20px 20px' }}>
        {article.body.map((b, i) => <BodyBlock key={i} block={b} />)}

        {/* Gallery */}
        {article.gallery && article.gallery.length > 0 && (
          <div style={{ margin: '30px 0' }}>
            <div className="font-condensed" style={{ color: GOLD_DK, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: 11, marginBottom: 10 }}>Gallery</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10 }}>
              {article.gallery.map((g, i) => (
                <figure key={i} style={{ margin: 0 }}>
                  <EditorialImage seed={g.seed} ratio="1 / 1" rounded={10} />
                  {g.caption && <figcaption className="font-condensed" style={{ color: FAINT, fontSize: 11, marginTop: 6, letterSpacing: '0.03em' }}>{g.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </div>
        )}

        {/* Tag chips → internal links */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '28px 0 6px' }}>
          {article.tags.club && <TagChip label={article.tags.club} />}
          {article.tags.league && <TagChip label={article.tags.league} />}
          {article.tags.state && <TagChip label={article.tags.state} />}
        </div>
      </article>

      {/* Related + more-from */}
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '20px 20px 70px' }}>
        {related.length > 0 && <RelatedRow title="Related Stories" items={related} />}
        {league.length > 0 && <RelatedRow title={`More from ${article.tags.league}`} items={league} />}
        {club.length > 0 && <RelatedRow title={`More from ${article.tags.club}`} items={club} />}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/news" className="font-condensed" style={{ color: PINK, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: 13, textDecoration: 'none' }}>Back to all news →</Link>
        </div>
      </div>
      <Footer />
    </div>
  )
}

function BodyBlock({ block }: { block: Block }) {
  if (block.type === 'h') return <h2 className="font-display" style={{ color: INK, fontSize: 'clamp(1.5rem,4vw,2rem)', margin: '30px 0 12px', lineHeight: 1 }}>{block.text}</h2>
  if (block.type === 'quote') return (
    <blockquote style={{ margin: '28px 0', paddingLeft: 22, borderLeft: `4px solid ${PINK}` }}>
      <p className="font-display" style={{ color: INK, fontSize: 'clamp(1.5rem,4vw,2.1rem)', lineHeight: 1.1, margin: 0 }}>“{block.text}”</p>
      {block.cite && <cite className="font-condensed" style={{ display: 'block', marginTop: 10, color: GOLD_DK, fontStyle: 'normal', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: 12 }}>{block.cite}</cite>}
    </blockquote>
  )
  if (block.type === 'image') return (
    <figure style={{ margin: '24px 0' }}>
      <EditorialImage seed={block.seed} ratio="16 / 9" rounded={12} />
      {block.caption && <figcaption className="font-condensed" style={{ color: FAINT, fontSize: 12, marginTop: 8 }}>{block.caption}</figcaption>}
    </figure>
  )
  return <p style={{ color: '#1a1a1a', fontSize: 18, lineHeight: 1.7, margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>{block.text}</p>
}

function ShareBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return <button onClick={onClick} aria-label={label} title={label} style={{ cursor: 'pointer', width: 38, height: 38, borderRadius: 999, display: 'grid', placeItems: 'center', background: PAGE_ALT, border: `1px solid ${LINE}`, color: INK }}>{children}</button>
}
function TagChip({ label }: { label: string }) {
  return <span className="font-condensed" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: MUTE, background: PAGE_ALT, border: `1px solid ${LINE}`, borderRadius: 999, padding: '6px 12px' }}>{label}</span>
}
function RelatedRow({ title, items }: { title: string; items: Parameters<typeof ArticleCard>[0]['article'][] }) {
  return (
    <section style={{ marginBottom: 34 }}>
      <SectionHead title={title} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 24 }}>
        {items.map(a => <ArticleCard key={a.slug} article={a} />)}
      </div>
    </section>
  )
}
