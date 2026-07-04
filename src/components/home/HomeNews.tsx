/**
 * Latest News: publication-style split. One large feature story, a stack of
 * side stories, category tags, bylines, dates and reading time.
 */
import { Link } from 'react-router-dom'
import { featuredArticles, latestArticles, categoryOf, formatDate, newsPath, type Article } from '../../news/content'
import { EditorialImage } from '../../news/components'
import { Section, SectionHead, Reveal, Tag, TEXT, MUTE, FAINT, LINE, PINK } from './ui'

export default function HomeNews() {
  const feature = featuredArticles()[0] ?? latestArticles(1)[0]
  if (!feature) return null
  const side = latestArticles(5).filter(a => a.slug !== feature.slug).slice(0, 4)

  return (
    <Section band>
      <SectionHead
        kicker="The Country Game, Covered"
        title={<>LATEST <span style={{ color: PINK }}>NEWS</span></>}
        to="/news" toLabel="All stories"
      />
      <div className="news-grid" style={{ display: 'grid', gap: 18 }}>
        <Reveal>
          <FeatureCard a={feature} />
        </Reveal>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {side.map((a, i) => (
            <Reveal key={a.slug} delay={0.06 + i * 0.05}>
              <SideCard a={a} />
            </Reveal>
          ))}
        </div>
      </div>
      <style>{`
        .news-grid { grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); }
        @media (max-width: 860px) { .news-grid { grid-template-columns: 1fr; } }
      `}</style>
    </Section>
  )
}

function Meta({ a }: { a: Article }) {
  return (
    <span className="font-condensed" style={{ display: 'flex', alignItems: 'center', gap: 8, color: FAINT, fontSize: 11.5, letterSpacing: '0.05em', flexWrap: 'wrap' }}>
      <b style={{ color: MUTE }}>{a.author.name}</b>
      <span aria-hidden>·</span>{formatDate(a.date)}
      <span aria-hidden>·</span>{a.readingTime} min read
    </span>
  )
}

function FeatureCard({ a }: { a: Article }) {
  const cat = categoryOf(a.category)
  return (
    <Link to={newsPath(a.slug)} className="gn-card gn-card-hover cnews-card" style={{ display: 'block', textDecoration: 'none', color: TEXT, overflow: 'hidden', height: '100%' }}>
      <EditorialImage seed={a.heroSeed} ratio="16 / 9" rounded={0} />
      <div style={{ padding: '20px 24px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Tag color={cat.accent === '#111111' ? PINK : cat.accent}>{cat.label}</Tag>
          {a.breaking && <Tag color="#dc2626">Breaking</Tag>}
        </div>
        <h3 className="font-display" style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.3rem)', lineHeight: 0.95, margin: '0 0 10px' }}>{a.title.toUpperCase()}</h3>
        <p style={{ color: MUTE, fontSize: 15, lineHeight: 1.6, margin: '0 0 14px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.summary}</p>
        <Meta a={a} />
      </div>
    </Link>
  )
}

function SideCard({ a }: { a: Article }) {
  const cat = categoryOf(a.category)
  return (
    <Link to={newsPath(a.slug)} className="gn-card gn-card-hover cnews-card" style={{ display: 'flex', gap: 14, textDecoration: 'none', color: TEXT, padding: 12, alignItems: 'stretch' }}>
      <span style={{ width: 108, flexShrink: 0 }}>
        <EditorialImage seed={a.heroSeed} ratio="1 / 1" rounded={10} />
      </span>
      <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7, padding: '4px 4px 4px 0' }}>
        <Tag color={cat.accent === '#111111' ? PINK : cat.accent}>{cat.label}</Tag>
        <span className="font-display" style={{ fontSize: 17, lineHeight: 1.02, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {a.title.toUpperCase()}
        </span>
        <span style={{ marginTop: 'auto', borderTop: `1px solid ${LINE}`, paddingTop: 7 }}><Meta a={a} /></span>
      </span>
    </Link>
  )
}
