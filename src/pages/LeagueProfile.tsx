/**
 * League profile — every league gets a page: name, strength rating, ranked teams
 * (link to team profiles), the league ladder, and a placeholder details section.
 */
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Nav from '../components/layout/Nav'
import Footer from '../components/layout/Footer'
import { useSeo } from '../lib/seo'
import { fetchLeague, useAsync, teamPath, strengthStars, strengthLabel, type LeagueDetail } from '../lib/rankings'
import { INK, PANEL, PANEL_2, LINE, GOLD, CYAN, MUTE, StarStrength, QualBadge, Label } from '../components/rankings/bits'
import GlobalSearch from '../components/rankings/GlobalSearch'

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
    jsonLd: data ? {
      '@context': 'https://schema.org', '@type': 'SportsOrganization', sport: 'Netball',
      name: data.name, url: `https://cnca.com.au/league/${leagueId}`,
    } : undefined,
  })

  if (loading) return <Shell><Center>Loading league…</Center></Shell>
  if (error || !data) return <Shell><Center tone="error">League not found.</Center></Shell>

  const stars = strengthStars(data.strengthScore)

  return (
    <Shell>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '110px 20px 90px' }}>
        <button onClick={() => navigate('/rankings')} className="font-condensed"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTE, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: 12, marginBottom: 24 }}>
          <ArrowLeft size={14} /> National Rankings
        </button>

        <header style={{ marginBottom: 28 }}>
          <Label>League · {data.stateName ?? data.state}{data.association ? ` · ${data.association}` : ''}</Label>
          <h1 className="font-display" style={{ fontSize: 'clamp(2.4rem,6.5vw,4.6rem)', color: '#fff', lineHeight: 0.92, margin: '10px 0' }}>{data.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <StarStrength stars={stars} size={20} />
            <span className="font-condensed" style={{ color: '#fff', fontWeight: 700, letterSpacing: '0.06em' }}>{strengthLabel(stars)} · Strength {stars}/5</span>
          </div>
        </header>

        {/* Ranked teams */}
        <section style={{ marginBottom: 30 }}>
          <Label>Nationally Ranked Teams</Label>
          <div style={{ marginTop: 12, border: `1px solid ${LINE}`, borderRadius: 16, overflow: 'hidden', background: PANEL }}>
            {data.rankedTeams.length === 0 && <Empty>No teams from this league are nationally ranked yet.</Empty>}
            {data.rankedTeams.map(t => (
              <button key={t.clubId} onClick={() => navigate(teamPath(t.clubId))}
                style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none', font: 'inherit', color: '#fff',
                  display: 'grid', gridTemplateColumns: '54px 1fr auto auto', gap: 12, alignItems: 'center', padding: '14px 18px', borderBottom: `1px solid ${LINE}`, background: 'transparent' }}>
                <span className="font-display" style={{ fontSize: 24, color: t.rank <= 3 ? GOLD : '#fff' }}>#{t.rank}</span>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{t.clubName}</span>
                <span className="font-display" style={{ fontSize: 18, color: '#fff' }}>{t.powerRating.toFixed(1)}</span>
                <QualBadge qualified={t.qualified} small />
              </button>
            ))}
          </div>
        </section>

        {/* Ladder */}
        <section style={{ marginBottom: 30 }}>
          <Label>Current League Ladder</Label>
          <div style={{ marginTop: 12, border: `1px solid ${LINE}`, borderRadius: 16, overflow: 'hidden', background: PANEL }}>
            <div className="font-condensed" style={{ display: 'grid', gridTemplateColumns: '40px 1fr 44px 44px 60px 56px', gap: 8, padding: '12px 16px', borderBottom: `1px solid ${LINE}`, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTE, background: 'rgba(255,255,255,0.02)' }}>
              <div>#</div><div>Team</div><div style={{ textAlign: 'center' }}>P</div><div style={{ textAlign: 'center' }}>W</div><div style={{ textAlign: 'right' }}>%</div><div style={{ textAlign: 'right' }}>Pts</div>
            </div>
            {data.ladder.length === 0 && <Empty>Ladder data not available.</Empty>}
            {data.ladder.map((r, i) => (
              <button key={r.clubId} onClick={() => navigate(teamPath(r.clubId))}
                style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none', font: 'inherit', color: '#fff',
                  display: 'grid', gridTemplateColumns: '40px 1fr 44px 44px 60px 56px', gap: 8, alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${LINE}`, background: 'transparent' }}>
                <span className="font-display" style={{ fontSize: 18, color: MUTE }}>{r.position ?? i + 1}</span>
                <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.clubName}</span>
                <span style={{ textAlign: 'center', color: MUTE, fontSize: 13 }}>{r.played}</span>
                <span style={{ textAlign: 'center', fontSize: 13 }}>{r.wins}</span>
                <span style={{ textAlign: 'right', color: MUTE, fontSize: 13 }}>{r.percentage ? r.percentage.toFixed(0) : '—'}</span>
                <span style={{ textAlign: 'right', fontWeight: 700, fontSize: 13 }}>{r.points}</span>
              </button>
            ))}
          </div>
        </section>

        <div style={{ background: PANEL_2, border: `1px dashed ${LINE}`, borderRadius: 16, padding: 20 }}>
          <Label>League Details</Label>
          <p style={{ color: MUTE, fontSize: 14, lineHeight: 1.6, margin: '8px 0 0' }}>
            Contact information, competition format and season details for {data.name} — coming soon.
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: 30 }}>
          <Link to="/directory" className="font-condensed" style={{ color: CYAN, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: 13, textDecoration: 'none' }}>
            Browse all leagues →
          </Link>
        </div>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div style={{ background: INK, minHeight: '100vh' }}><Nav /><GlobalSearch /><main>{children}</main><Footer /></div>
}
function Center({ children, tone }: { children: React.ReactNode; tone?: 'error' }) {
  return <div className="font-condensed" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', color: tone === 'error' ? '#ff6b6b' : MUTE, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, fontSize: 13 }}>{children}</div>
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="font-condensed" style={{ padding: '20px', color: MUTE, fontSize: 13, letterSpacing: '0.06em' }}>{children}</div>
}
