/**
 * Team profile — every ranked team gets a page: national rank, rating, league,
 * league strength, record, goals, %, form, ladder position, qualification, plus
 * placeholder sections (history, contact, honours, photos, sponsors).
 */
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trophy, Star } from 'lucide-react'
import Nav from '../components/layout/Nav'
import Footer from '../components/layout/Footer'
import { useSeo } from '../lib/seo'
import {
  fetchClub, useAsync, leaguePath, strengthStars, strengthLabel, ordinal,
  type ClubProfile,
} from '../lib/rankings'
import { INK, PANEL, PANEL_2, LINE, GOLD, PINK, CYAN, MUTE, FormPips, StarStrength, Movement, QualBadge, Label } from '../components/rankings/bits'
import GlobalSearch from '../components/rankings/GlobalSearch'

export default function TeamProfile() {
  const { clubId = '' } = useParams()
  const { data, loading, error } = useAsync<ClubProfile>(() => fetchClub(clubId), [clubId])
  const navigate = useNavigate()

  useSeo({
    title: data ? `${data.clubName} Netball National Ranking | CNCA` : 'Team Profile | CNCA',
    description: data
      ? `${data.clubName} is ranked #${data.rank} in Australia's country netball A Grade rankings — power rating ${data.powerRating.toFixed(1)}, playing in ${data.leagueName}. ${data.qualified ? 'Currently qualified' : 'Currently outside the cut-off'} for the CNCA Championship.`
      : 'Country netball team profile and national ranking.',
    path: `/team/${clubId}`,
    jsonLd: data ? {
      '@context': 'https://schema.org', '@type': 'SportsTeam', sport: 'Netball',
      name: data.clubName, memberOf: { '@type': 'SportsOrganization', name: data.leagueName },
      url: `https://cnca.com.au/team/${clubId}`,
    } : undefined,
  })

  if (loading) return <Shell><Center>Loading team…</Center></Shell>
  if (error || !data) return <Shell><Center tone="error">Team not found.</Center></Shell>

  const stars = strengthStars(data.leagueStrengthScore)
  const gf = data.goalsFor, ga = data.goalsAgainst
  const diff = gf - ga

  return (
    <Shell>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '110px 20px 90px' }}>
        <button onClick={() => navigate('/rankings')} className="font-condensed"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTE, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: 12, marginBottom: 24 }}>
          <ArrowLeft size={14} /> National Rankings
        </button>

        {/* Hero */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ minWidth: 260 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
              <QualBadge qualified={data.qualified} />
              <Movement current={data.rank} previous={data.previousRank} />
            </div>
            <h1 className="font-display" style={{ fontSize: 'clamp(2.6rem,7vw,5rem)', color: '#fff', lineHeight: 0.9, margin: 0 }}>{data.clubName}</h1>
            <div className="font-condensed" style={{ marginTop: 10, color: MUTE, fontSize: 15, letterSpacing: '0.04em' }}>
              <Link to={leaguePath(data.leagueId)} style={{ color: CYAN, textDecoration: 'none', fontWeight: 700 }}>{data.leagueName}</Link>
              {' · '}{data.state}
            </div>
          </div>
          {/* Rank medallion */}
          <div style={{ textAlign: 'center', padding: '18px 30px', borderRadius: 20, background: PANEL, border: `1px solid ${LINE}` }}>
            <Label>National Rank</Label>
            <div className="font-display" style={{ fontSize: 84, lineHeight: 0.9, color: data.rank <= 3 ? GOLD : '#fff', margin: '4px 0' }}>#{data.rank}</div>
            <div className="font-display" style={{ fontSize: 22, color: PINK }}>{data.powerRating.toFixed(1)} <span style={{ fontSize: 12, color: MUTE }} className="font-condensed">RATING</span></div>
          </div>
        </div>

        {/* Stat grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 16 }}>
          <Stat label="Record" value={`${data.record.wins}-${data.record.losses}${data.record.draws ? `-${data.record.draws}` : ''}`} sub={`${data.record.played} games`} />
          <Stat label="Goals For" value={String(gf)} sub={`${ga} against`} />
          <Stat label="Goal Diff" value={`${diff > 0 ? '+' : ''}${diff}`} accent={diff >= 0 ? '#37d67a' : '#ff6b6b'} />
          <Stat label="Percentage" value={`${data.percentage ? data.percentage.toFixed(1) : '—'}%`} />
          <Stat label="Ladder Position" value={data.ladderPosition ? ordinal(data.ladderPosition) : '—'} sub="in league" />
        </div>

        {/* League strength + form */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12, marginBottom: 28 }}>
          <Panel>
            <Label>League Strength</Label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
              <StarStrength stars={stars} size={20} />
              <span className="font-condensed" style={{ color: '#fff', fontWeight: 700, letterSpacing: '0.06em' }}>{strengthLabel(stars)}</span>
            </div>
            <Link to={leaguePath(data.leagueId)} className="font-condensed" style={{ color: CYAN, fontSize: 12, textDecoration: 'none', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 12, display: 'inline-block' }}>
              View {data.leagueName} →
            </Link>
          </Panel>
          <Panel>
            <Label>Recent Form</Label>
            <div style={{ marginTop: 12 }}><FormPips form={data.recentForm} /></div>
            <div className="font-condensed" style={{ color: MUTE, fontSize: 12, marginTop: 10, letterSpacing: '0.04em' }}>Last 5 results (most recent right)</div>
          </Panel>
          <Panel>
            <Label>Championship Status</Label>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              {data.qualified
                ? <><Trophy size={20} color={GOLD} /><span style={{ color: '#fff', fontWeight: 700 }}>Qualified — Top {data.qualifyCutoff}</span></>
                : <span style={{ color: MUTE }}>Currently outside the Top {data.qualifyCutoff}</span>}
            </div>
            <Link to="/championship" className="font-condensed" style={{ color: GOLD, fontSize: 12, textDecoration: 'none', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 12, display: 'inline-block' }}>
              About the Championship →
            </Link>
          </Panel>
        </div>

        {/* Placeholder sections */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12 }}>
          <Placeholder title="Club History" icon={<Star size={16} color={GOLD} />}>
            A record of {data.clubName}’s honours, premierships and notable seasons will appear here.
          </Placeholder>
          <Placeholder title="Contact & Details">Club contact details, home venue and committee information — coming soon.</Placeholder>
          <Placeholder title="Honours">Premierships, best & fairest and championship appearances.</Placeholder>
          <Placeholder title="Photos">Team and match-day gallery.</Placeholder>
          <Placeholder title="Sponsors">Club partners and supporters.</Placeholder>
        </div>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div style={{ background: INK, minHeight: '100vh' }}><Nav /><GlobalSearch /><main>{children}</main><Footer /></div>
}
function Panel({ children }: { children: React.ReactNode }) {
  return <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 16, padding: 20 }}>{children}</div>
}
function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 14, padding: '16px 18px' }}>
      <Label>{label}</Label>
      <div className="font-display" style={{ fontSize: 34, color: accent ?? '#fff', lineHeight: 1, marginTop: 6 }}>{value}</div>
      {sub && <div className="font-condensed" style={{ color: MUTE, fontSize: 12, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}
function Placeholder({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div style={{ background: PANEL_2, border: `1px dashed ${LINE}`, borderRadius: 16, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>{icon}<Label>{title}</Label></div>
      <p style={{ color: MUTE, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{children}</p>
    </div>
  )
}
function Center({ children, tone }: { children: React.ReactNode; tone?: 'error' }) {
  return <div className="font-condensed" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', color: tone === 'error' ? '#ff6b6b' : MUTE, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, fontSize: 13 }}>{children}</div>
}
