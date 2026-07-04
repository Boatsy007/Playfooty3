/**
 * Team profile — a premium national sports page in the bright homepage style
 * (white, black display headings, pink highlights, gold championship accents).
 * Editorial hero, stat strip, league strength / form / qualification, editorial
 * placeholder sections, and a "Claim this club profile" CTA.
 */
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trophy, ChevronRight } from 'lucide-react'
import Nav from '../components/layout/Nav'
import ProductSearch from '../components/rankings/ProductSearch'
import Footer from '../components/layout/Footer'
import { useSeo } from '../lib/seo'
import { fetchClub, useAsync, leaguePath, strengthStars, strengthLabel, ordinal, type ClubProfile } from '../lib/rankings'
import { PAGE, PAGE_ALT, TEXT, LINE, GOLD, GOLD_DK, PINK, MUTE, FAINT, FormPips, StarStrength, Movement, QualBadge, TeamLogo } from '../components/rankings/bits'

export default function TeamProfile() {
  const { clubId = '' } = useParams()
  const { data, loading, error } = useAsync<ClubProfile>(() => fetchClub(clubId), [clubId])
  const navigate = useNavigate()

  useSeo({
    title: data ? `${data.clubName} Netball National Ranking | Got Netty` : 'Club Profile | Got Netty',
    description: data
      ? (data.rank != null
          ? `${data.clubName} is ranked #${data.rank} in Australia's country netball A Grade rankings — power rating ${data.powerRating?.toFixed(1) ?? '—'}, playing in ${data.leagueName ?? 'its league'}. Record, form and national ranking on Got Netty.`
          : `${data.clubName} — country netball club profile${data.leagueName ? ` in ${data.leagueName}` : ''}. Record, form and national ranking on Got Netty.`)
      : 'Country netball club profile and national ranking.',
    path: `/team/${clubId}`,
    jsonLd: data ? {
      '@context': 'https://schema.org', '@type': 'SportsTeam', sport: 'Netball', name: data.clubName,
      memberOf: { '@type': 'SportsOrganization', name: data.leagueName }, url: `https://gotnetty.com.au/team/${clubId}`,
    } : undefined,
  })

  if (loading) return <Shell><Center>Loading team…</Center></Shell>
  if (error || !data) return <Shell><Center tone="error">Team not found.</Center></Shell>

  const stars = strengthStars(data.leagueStrengthScore)
  const diff = data.goalsFor - data.goalsAgainst

  return (
    <Shell>
      {/* Hero */}
      <header style={{ position: 'relative', overflow: 'hidden', background: PAGE_ALT, borderBottom: `1px solid ${LINE}` }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(640px 340px at 10% -20%, rgba(255,44,145,0.12), transparent 60%), radial-gradient(560px 300px at 100% 0%, rgba(244,193,77,0.14), transparent 60%)' }} />
        <div style={{ position: 'relative', maxWidth: 1040, margin: '0 auto', padding: '28px 20px 36px' }}>
          <button onClick={() => navigate('/rankings')} className="font-condensed"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTE, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: 12, marginBottom: 20 }}>
            <ArrowLeft size={14} /> National Rankings
          </button>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
            <div className="font-display" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {data.rank != null && data.rank <= 3 && <Trophy size={30} color={GOLD_DK} />}
              <span style={{ fontSize: data.rank != null ? 'clamp(3.4rem,12vw,7rem)' : 'clamp(2.4rem,8vw,4.4rem)', lineHeight: 0.8, color: data.rank != null && data.rank <= 3 ? GOLD_DK : TEXT }}>{data.rank != null ? `#${data.rank}` : 'NR'}</span>
            </div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                {data.ranked ? <QualBadge qualified={data.qualified} /> : <span className="font-condensed" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '5px 12px', borderRadius: 999, color: MUTE, background: 'rgba(17,17,17,0.05)', border: `1px solid ${LINE}` }}>Not Nationally Ranked</span>}
                {data.rank != null && <Movement current={data.rank} previous={data.previousRank} />}
                <span className="font-condensed" style={{ color: FAINT, fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{data.rank != null ? 'National Rank' : 'Country Netball'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <TeamLogo name={data.clubName} size={56} />
                <h1 className="font-display" style={{ fontSize: 'clamp(2.6rem,8vw,5.4rem)', color: TEXT, lineHeight: 0.86, margin: 0, minWidth: 0 }}>{data.clubName.toUpperCase()}</h1>
              </div>
              <div className="font-condensed" style={{ marginTop: 8, color: MUTE, fontSize: 15, letterSpacing: '0.02em' }}>
                {data.leagueId
                  ? <Link to={leaguePath(data.leagueId)} style={{ color: PINK, textDecoration: 'none', fontWeight: 700 }}>{data.leagueName}</Link>
                  : <span style={{ fontWeight: 700 }}>{data.leagueName ?? '—'}</span>}
                {data.state ? ` · ${data.state}` : ''}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="font-condensed" style={{ color: FAINT, fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Power Rating</div>
              <div className="font-display" style={{ fontSize: 'clamp(3rem,9vw,5rem)', color: PINK, lineHeight: 0.85 }}>{data.powerRating != null ? data.powerRating.toFixed(1) : '—'}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Stat strip */}
      <section style={{ borderBottom: `1px solid ${LINE}`, background: PAGE }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))' }}>
          <StatCell label="Record" value={`${data.record.wins}-${data.record.losses}${data.record.draws ? `-${data.record.draws}` : ''}`} sub={`${data.record.played} games`} first />
          <StatCell label="Goals For" value={String(data.goalsFor)} />
          <StatCell label="Goals Against" value={String(data.goalsAgainst)} />
          <StatCell label="Goal Diff" value={`${diff > 0 ? '+' : ''}${diff}`} accent={diff >= 0 ? '#16a34a' : '#dc2626'} />
          <StatCell label="Percentage" value={data.percentage ? `${data.percentage.toFixed(0)}%` : '—'} />
          <StatCell label="Ladder" value={data.ladderPosition ? ordinal(data.ladderPosition) : '—'} sub="in league" />
        </div>
      </section>

      <main style={{ maxWidth: 1040, margin: '0 auto', padding: '36px 20px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 30, marginBottom: 40 }}>
          <Block title="League Strength">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <StarStrength stars={stars} size={20} />
              <span className="font-condensed" style={{ color: TEXT, fontWeight: 700, letterSpacing: '0.04em' }}>{strengthLabel(stars)}</span>
            </div>
            {data.leagueId && <Link to={leaguePath(data.leagueId)} className="font-condensed" style={linkStyle}>View {data.leagueName} <ChevronRight size={13} style={{ verticalAlign: '-2px' }} /></Link>}
          </Block>
          <Block title="Recent Form">
            <FormPips form={data.recentForm} />
            <div className="font-condensed" style={{ color: MUTE, fontSize: 12, marginTop: 10, letterSpacing: '0.03em' }}>Last 5 · most recent right</div>
          </Block>
          <Block title="National Standing">
            {data.rank != null
              ? <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Trophy size={20} color={GOLD_DK} /><span style={{ color: TEXT, fontWeight: 700 }}>Ranked #{data.rank} in Australia</span></div>
              : <span style={{ color: MUTE }}>Not yet ranked this season</span>}
            <Link to="/rankings" className="font-condensed" style={linkStyle}>Full National Rankings <ChevronRight size={13} style={{ verticalAlign: '-2px' }} /></Link>
          </Block>
        </div>

        {[
          ['Club History', `A record of ${data.clubName}’s premierships, notable seasons and rivalries will live here.`],
          ['Honours', 'Premierships, best & fairest awards and national ranking history.'],
          ['Contact & Details', 'Home venue, committee and contact information — coming soon.'],
          ['Photos', 'Team and match-day gallery.'],
          ['Sponsors', 'Club partners and supporters.'],
        ].map(([t, body]) => (
          <section key={t} style={{ borderTop: `1px solid ${LINE}`, padding: '22px 0' }}>
            <div className="font-condensed" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 20, height: 3, background: GOLD }} />
              <h2 className="font-display" style={{ color: TEXT, fontSize: 26, margin: 0 }}>{t}</h2>
            </div>
            <p style={{ color: MUTE, fontSize: 15, lineHeight: 1.6, margin: '10px 0 0', maxWidth: 620 }}>{body}</p>
          </section>
        ))}

        {/* Claim CTA */}
        <div style={{ marginTop: 34, padding: '32px 28px', borderRadius: 22, background: TEXT, display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="font-condensed" style={{ color: GOLD, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', fontSize: 11, marginBottom: 8 }}>Club Owners</div>
            <h3 className="font-display" style={{ color: '#fff', fontSize: 'clamp(1.8rem,5vw,2.6rem)', margin: '0 0 8px', lineHeight: 0.95 }}>IS THIS YOUR CLUB?</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14.5, margin: 0, maxWidth: 520 }}>Claim {data.clubName} to add your crest, history, honours, photos, contacts and sponsors — and keep your national profile current.</p>
          </div>
          <a href={`mailto:hello@gotnetty.com.au?subject=${encodeURIComponent(`Claim club profile — ${data.clubName}`)}`} className="btn-pink" style={{ padding: '15px 28px', fontSize: 14, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
            Claim This Club Profile
          </a>
        </div>
      </main>
    </Shell>
  )
}

const linkStyle: React.CSSProperties = { color: PINK, fontSize: 12, textDecoration: 'none', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 14, display: 'inline-block' }

function Shell({ children }: { children: React.ReactNode }) {
  return <div style={{ background: PAGE, minHeight: '100vh' }}><Nav /><ProductSearch /><main>{children}</main><Footer /></div>
}
function StatCell({ label, value, sub, accent, first }: { label: string; value: string; sub?: string; accent?: string; first?: boolean }) {
  return (
    <div style={{ padding: '20px 8px', borderRight: `1px solid ${LINE}`, borderLeft: first ? `1px solid ${LINE}` : undefined, textAlign: 'center' }}>
      <div className="font-condensed" style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: FAINT }}>{label}</div>
      <div className="font-display" style={{ fontSize: 34, color: accent ?? TEXT, lineHeight: 1, marginTop: 6 }}>{value}</div>
      {sub && <div className="font-condensed" style={{ color: FAINT, fontSize: 11, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-condensed" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD_DK, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}
function Center({ children, tone }: { children: React.ReactNode; tone?: 'error' }) {
  return <div className="font-condensed" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', color: tone === 'error' ? '#dc2626' : MUTE, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, fontSize: 13 }}>{children}</div>
}
