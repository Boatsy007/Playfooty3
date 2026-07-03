/**
 * League profile — bright championship style. League name, strength rating,
 * nationally-ranked teams (→ team profiles), the current ladder, and a details
 * placeholder.
 */
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Nav from '../components/layout/Nav'
import ProductSearch from '../components/rankings/ProductSearch'
import Footer from '../components/layout/Footer'
import { useSeo } from '../lib/seo'
import { fetchLeague, useAsync, teamPath, strengthStars, strengthLabel, type LeagueDetail } from '../lib/rankings'
import { PAGE, PAGE_ALT, TEXT, LINE, GOLD_DK, PINK, MUTE, FAINT, StarStrength, QualBadge, Eyebrow } from '../components/rankings/bits'

export default function LeagueProfile() {
  const { leagueId = '' } = useParams()
  const { data, loading, error } = useAsync<LeagueDetail>(() => fetchLeague(leagueId), [leagueId])
  const navigate = useNavigate()

  useSeo({
    title: data ? `${data.name} Rankings & Ladder | CNCA` : 'League | CNCA',
    description: data
      ? `${data.name} — league strength ${strengthStars(data.strengthScore)}/5. See the ${data.rankedTeams.length} nationally-ranked teams and current ladder in Australia's country netball rankings.`
      : 'Country netball league rankings and ladder.',
    path: `/league/${leagueId}`,
    jsonLd: data ? { '@context': 'https://schema.org', '@type': 'SportsOrganization', sport: 'Netball', name: data.name, url: `https://cnca.com.au/league/${leagueId}` } : undefined,
  })

  if (loading) return <Shell><Center>Loading league…</Center></Shell>
  if (error || !data) return <Shell><Center tone="error">League not found.</Center></Shell>

  const stars = strengthStars(data.strengthScore)

  return (
    <Shell>
      <header style={{ position: 'relative', overflow: 'hidden', background: PAGE_ALT, borderBottom: `1px solid ${LINE}` }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(640px 320px at 12% -20%, rgba(244,193,77,0.16), transparent 60%)' }} />
        <div style={{ position: 'relative', maxWidth: 1000, margin: '0 auto', padding: '28px 20px 36px' }}>
          <button onClick={() => navigate('/leagues')} className="font-condensed"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTE, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: 12, marginBottom: 20 }}>
            <ArrowLeft size={14} /> All Leagues
          </button>
          <Eyebrow accent={GOLD_DK}>League · {data.stateName ?? data.state}{data.association ? ` · ${data.association}` : ''}</Eyebrow>
          <h1 className="font-display" style={{ fontSize: 'clamp(2.4rem,6.5vw,4.8rem)', color: TEXT, lineHeight: 0.9, margin: '12px 0 12px' }}>{data.name.toUpperCase()}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <StarStrength stars={stars} size={20} />
            <span className="font-condensed" style={{ color: TEXT, fontWeight: 700, letterSpacing: '0.05em' }}>{strengthLabel(stars)} · Strength {stars}/5</span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '34px 20px 80px' }}>
        {/* Ranked teams */}
        <section style={{ marginBottom: 40 }}>
          <SectionHead>Nationally Ranked Teams</SectionHead>
          <div style={{ borderTop: `2px solid ${TEXT}` }}>
            {data.rankedTeams.length === 0 && <Empty>No teams from this league are nationally ranked yet.</Empty>}
            {data.rankedTeams.map(t => (
              <button key={t.clubId} onClick={() => navigate(teamPath(t.clubId))} className="rank-row-lt"
                style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none', font: 'inherit', color: TEXT, display: 'grid', gridTemplateColumns: '58px 1fr auto auto', gap: 12, alignItems: 'center', padding: '14px 10px', borderBottom: `1px solid ${LINE}`, background: PAGE }}>
                <span className="font-display" style={{ fontSize: 24, color: t.rank <= 3 ? GOLD_DK : TEXT }}>#{t.rank}</span>
                <span className="font-display" style={{ fontSize: 17 }}>{t.clubName.toUpperCase()}</span>
                <span className="font-display" style={{ fontSize: 18, color: PINK }}>{t.powerRating.toFixed(1)}</span>
                <QualBadge qualified={t.qualified} small />
              </button>
            ))}
          </div>
        </section>

        {/* Ladder */}
        <section style={{ marginBottom: 40 }}>
          <SectionHead>Current League Ladder</SectionHead>
          <div style={{ borderTop: `2px solid ${TEXT}`, overflowX: 'auto' }}>
            <div className="font-condensed" style={{ display: 'grid', gridTemplateColumns: '40px 1fr 44px 44px 60px 56px', gap: 8, padding: '12px 10px', borderBottom: `1px solid ${LINE}`, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: FAINT }}>
              <div>#</div><div>Team</div><div style={{ textAlign: 'center' }}>P</div><div style={{ textAlign: 'center' }}>W</div><div style={{ textAlign: 'right' }}>%</div><div style={{ textAlign: 'right' }}>Pts</div>
            </div>
            {data.ladder.length === 0 && <Empty>Ladder data not available.</Empty>}
            {data.ladder.map((r, i) => (
              <button key={r.clubId} onClick={() => navigate(teamPath(r.clubId))} className="rank-row-lt"
                style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none', font: 'inherit', color: TEXT, display: 'grid', gridTemplateColumns: '40px 1fr 44px 44px 60px 56px', gap: 8, alignItems: 'center', padding: '12px 10px', borderBottom: `1px solid ${LINE}`, background: PAGE }}>
                <span className="font-display" style={{ fontSize: 18, color: FAINT }}>{r.position ?? i + 1}</span>
                <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.clubName}</span>
                <span style={{ textAlign: 'center', color: MUTE, fontSize: 13 }}>{r.played}</span>
                <span style={{ textAlign: 'center', fontSize: 13 }}>{r.wins}</span>
                <span style={{ textAlign: 'right', color: MUTE, fontSize: 13 }}>{r.percentage ? r.percentage.toFixed(0) : '—'}</span>
                <span style={{ textAlign: 'right', fontWeight: 700, fontSize: 13 }}>{r.points}</span>
              </button>
            ))}
          </div>
        </section>

        <div style={{ background: PAGE_ALT, border: `1px solid ${LINE}`, borderRadius: 16, padding: 22 }}>
          <div className="font-condensed" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD_DK }}>League Details</div>
          <p style={{ color: MUTE, fontSize: 14.5, lineHeight: 1.6, margin: '8px 0 0' }}>Contact information, competition format and season details for {data.name} — coming soon.</p>
        </div>
      </main>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div style={{ background: PAGE, minHeight: '100vh' }}><Nav /><ProductSearch /><main>{children}</main><Footer /></div>
}
function SectionHead({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display" style={{ color: TEXT, fontSize: 'clamp(1.4rem,4vw,2rem)', margin: '0 0 12px' }}>{children}</h2>
}
function Center({ children, tone }: { children: React.ReactNode; tone?: 'error' }) {
  return <div className="font-condensed" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', color: tone === 'error' ? '#dc2626' : MUTE, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, fontSize: 13 }}>{children}</div>
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="font-condensed" style={{ padding: 20, color: MUTE, fontSize: 13, letterSpacing: '0.04em' }}>{children}</div>
}
