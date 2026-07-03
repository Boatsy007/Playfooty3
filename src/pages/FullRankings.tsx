/**
 * Full National Rankings — every ranked team, with the Top-32 championship
 * qualification cut-off line and qualified marking. Rows link to team profiles.
 */
import { useNavigate, Link } from 'react-router-dom'
import Nav from '../components/layout/Nav'
import Footer from '../components/layout/Footer'
import { useSeo } from '../lib/seo'
import {
  fetchRankings, useAsync, teamPath, QUALIFY_CUTOFF,
  type RankingsResponse, type RankingEntry,
} from '../lib/rankings'
import { INK, PANEL, LINE, GOLD, MUTE, FormPips, Movement, QualBadge, Label } from '../components/rankings/bits'
import GlobalSearch from '../components/rankings/GlobalSearch'

export default function FullRankings() {
  const { data, loading, error } = useAsync<RankingsResponse>(fetchRankings, [])
  const navigate = useNavigate()
  const entries = data?.data ?? []
  const week = data?.meta?.weekLabel

  useSeo({
    title: 'Full National Rankings — Country Netball A Grade | CNCA',
    description: 'The complete CNCA national rankings of Australia’s country netball A Grade teams. Top 32 qualify for the Country Netball Championships on the Gold Coast.',
    path: '/rankings',
    jsonLd: entries.length ? {
      '@context': 'https://schema.org', '@type': 'ItemList',
      name: 'CNCA National Country Netball Rankings',
      numberOfItems: entries.length,
      itemListElement: entries.slice(0, 100).map(e => ({ '@type': 'ListItem', position: e.rank, name: e.clubName })),
    } : undefined,
  })

  return (
    <div style={{ background: INK, minHeight: '100vh' }}>
      <Nav />
      <GlobalSearch />
      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '120px 20px 100px' }}>
        <header style={{ textAlign: 'center', marginBottom: 40 }}>
          <Label>National Leaderboard{week ? ` · ${week}` : ''}</Label>
          <h1 className="font-display" style={{ fontSize: 'clamp(3rem,8vw,6rem)', color: '#fff', lineHeight: 0.9, margin: '14px 0 10px' }}>
            THE NATIONAL RANKINGS
          </h1>
          <p style={{ color: MUTE, maxWidth: 640, margin: '0 auto', fontSize: 16 }}>
            Every ranked country netball A&nbsp;Grade team in Australia, ordered by power rating.
            The top <strong style={{ color: GOLD }}>{QUALIFY_CUTOFF}</strong> qualify for the Championship on the Gold Coast.
          </p>
        </header>

        {loading && <Centered>Loading national rankings…</Centered>}
        {error && <Centered tone="error">Unable to load rankings right now.</Centered>}

        {!loading && !error && entries.length > 0 && (
          <div style={{ border: `1px solid ${LINE}`, borderRadius: 18, overflow: 'hidden', background: PANEL }}>
            <HeaderRow />
            {entries.map((e, i) => (
              <div key={e.clubId}>
                <RankRow entry={e} onClick={() => navigate(teamPath(e.clubId))} />
                {e.rank === QUALIFY_CUTOFF && i < entries.length - 1 && <CutoffLine />}
              </div>
            ))}
          </div>
        )}

        {!loading && !error && entries.length === 0 && <Centered>No rankings published yet.</Centered>}

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link to="/championship" className="font-condensed"
            style={{ color: GOLD, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: 13, textDecoration: 'none' }}>
            How championship qualification works →
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}

function HeaderRow() {
  const cell = { fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: MUTE }
  return (
    <div className="font-condensed" style={{
      display: 'grid', gridTemplateColumns: '56px 1fr 90px 120px 120px', gap: 12, alignItems: 'center',
      padding: '14px 20px', borderBottom: `1px solid ${LINE}`, background: 'rgba(255,255,255,0.02)',
    }}>
      <div style={cell}>Rank</div>
      <div style={cell}>Team</div>
      <div style={{ ...cell, textAlign: 'right' }}>Rating</div>
      <div style={{ ...cell }} className="hide-sm">Form</div>
      <div style={{ ...cell, textAlign: 'right' }} className="hide-sm">Status</div>
    </div>
  )
}

function RankRow({ entry, onClick }: { entry: RankingEntry; onClick: () => void }) {
  const qualified = entry.rank <= QUALIFY_CUTOFF
  const podium = entry.rank <= 3
  return (
    <button onClick={onClick} className="rank-row"
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none',
        display: 'grid', gridTemplateColumns: '56px 1fr 90px 120px 120px', gap: 12, alignItems: 'center',
        padding: '16px 20px', borderBottom: `1px solid ${LINE}`,
        background: qualified ? 'linear-gradient(90deg, rgba(244,193,77,0.05), transparent 40%)' : 'transparent',
        color: '#fff', font: 'inherit',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="font-display" style={{ fontSize: 26, lineHeight: 1, color: podium ? GOLD : qualified ? '#fff' : MUTE, minWidth: 30 }}>
          {entry.rank}
        </span>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {entry.clubName}
        </div>
        <div className="font-condensed" style={{ fontSize: 12, color: MUTE, letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {entry.leagueName} · {entry.state}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="font-display" style={{ fontSize: 22, color: podium ? GOLD : '#fff', lineHeight: 1 }}>{entry.powerRating.toFixed(1)}</div>
        <div style={{ marginTop: 2 }}><Movement current={entry.rank} previous={entry.previousRank} /></div>
      </div>
      <div className="hide-sm"><FormPips form={entry.recentForm} /></div>
      <div className="hide-sm" style={{ display: 'flex', justifyContent: 'flex-end' }}><QualBadge qualified={qualified} small /></div>
    </button>
  )
}

function CutoffLine() {
  return (
    <div style={{ position: 'relative', padding: '18px 20px', background: 'rgba(244,193,77,0.06)', borderBottom: `1px solid ${LINE}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD})` }} />
        <div className="font-condensed" style={{ textAlign: 'center', color: GOLD, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', fontSize: 12 }}>
          Championship Qualification Cut-Off · Top {QUALIFY_CUTOFF} Qualify
        </div>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
      </div>
    </div>
  )
}

function Centered({ children, tone }: { children: React.ReactNode; tone?: 'error' }) {
  return (
    <div className="font-condensed" style={{
      minHeight: 160, display: 'grid', placeItems: 'center', color: tone === 'error' ? '#ff6b6b' : MUTE,
      fontSize: 13, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
      border: `1px solid ${LINE}`, borderRadius: 18, background: PANEL,
    }}>{children}</div>
  )
}
