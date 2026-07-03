/**
 * Full National Rankings — the complete leaderboard (every ranked team), styled
 * as an official national championship leaderboard in the bright homepage style.
 * Top-32 qualification cut-off divider, qualified marking, rows → team profiles.
 */
import { useNavigate, Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import RankingsNav from '../components/rankings/RankingsNav'
import Footer from '../components/layout/Footer'
import { useSeo } from '../lib/seo'
import {
  fetchRankings, useAsync, teamPath, strengthStars, QUALIFY_CUTOFF,
  type RankingsResponse, type RankingEntry,
} from '../lib/rankings'
import { PAGE, PAGE_ALT, TEXT, LINE, GOLD, GOLD_DK, PINK, MUTE, FAINT, FormPips, StarStrength, Movement, QualBadge, Eyebrow } from '../components/rankings/bits'

const COLS = '54px minmax(0,1fr) 88px 118px 92px 54px 98px 96px'

export default function FullRankings() {
  const { data, loading, error } = useAsync<RankingsResponse>(fetchRankings, [])
  const navigate = useNavigate()
  const entries = data?.data ?? []
  const week = data?.meta?.weekLabel

  useSeo({
    title: 'Full National Rankings — Country Netball A Grade | CNCA',
    description: 'The complete CNCA national rankings of Australia’s country netball A Grade teams. The top 32 qualify for the Country Netball Championship on the Gold Coast.',
    path: '/rankings',
    jsonLd: entries.length ? {
      '@context': 'https://schema.org', '@type': 'ItemList', name: 'CNCA National Country Netball Rankings',
      numberOfItems: entries.length, itemListElement: entries.slice(0, 100).map(e => ({ '@type': 'ListItem', position: e.rank, name: e.clubName })),
    } : undefined,
  })

  return (
    <div style={{ background: PAGE, minHeight: '100vh' }}>
      <RankingsNav />

      {/* Hero */}
      <header style={{ position: 'relative', overflow: 'hidden', background: PAGE_ALT, borderBottom: `1px solid ${LINE}` }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(700px 340px at 12% -20%, rgba(255,44,145,0.10), transparent 62%)' }} />
        <div style={{ position: 'relative', maxWidth: 1120, margin: '0 auto', padding: '44px 20px 34px' }}>
          <Eyebrow>National Leaderboard{week ? ` · ${week}` : ''}</Eyebrow>
          <h1 className="font-display" style={{ fontSize: 'clamp(3rem,9vw,6.5rem)', color: TEXT, lineHeight: 0.86, margin: '14px 0 12px' }}>
            THE NATIONAL<br /><span style={{ color: PINK }}>RANKINGS</span>
          </h1>
          <p style={{ color: MUTE, maxWidth: 640, fontSize: 16, lineHeight: 1.55 }}>
            Every ranked country netball A&nbsp;Grade team in Australia, ordered by power rating.
            The top <strong style={{ color: GOLD_DK }}>{QUALIFY_CUTOFF}</strong> currently qualify for the Championship on the Gold Coast.
          </p>
          {!loading && !error && <div className="font-condensed" style={{ marginTop: 14, color: FAINT, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: 12 }}>{entries.length} teams ranked</div>}
        </div>
      </header>

      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '10px 20px 90px' }}>
        {loading && <Centered>Loading national rankings…</Centered>}
        {error && <Centered tone="error">Unable to load rankings right now.</Centered>}

        {!loading && !error && entries.length > 0 && (
          <div>
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
          <Link to="/championship" className="font-condensed" style={{ color: GOLD_DK, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: 13, textDecoration: 'none' }}>
            How championship qualification works →
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}

function HeaderRow() {
  const c = { fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: FAINT }
  return (
    <div className="font-condensed hide-sm" style={{ display: 'grid', gridTemplateColumns: COLS, gap: 12, alignItems: 'center', padding: '14px 12px', borderBottom: `2px solid ${TEXT}` }}>
      <div style={c}>#</div><div style={c}>Team</div>
      <div style={{ ...c, textAlign: 'center' }}>Record</div>
      <div style={{ ...c, textAlign: 'center' }}>Form</div>
      <div style={{ ...c, textAlign: 'center' }}>GF / GA</div>
      <div style={{ ...c, textAlign: 'center' }}>%</div>
      <div style={{ ...c, textAlign: 'center' }}>Strength</div>
      <div style={{ ...c, textAlign: 'right' }}>Rating</div>
    </div>
  )
}

function RankRow({ entry, onClick }: { entry: RankingEntry; onClick: () => void }) {
  const qualified = entry.rank <= QUALIFY_CUTOFF
  const podium = entry.rank <= 3
  const stars = strengthStars(entry.componentScores?.leagueStrength)
  const rec = entry.record
  return (
    <button onClick={onClick} className="rank-row-lt"
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none', font: 'inherit', color: TEXT,
        display: 'grid', gridTemplateColumns: COLS, gap: 12, alignItems: 'center', padding: '15px 12px',
        borderBottom: `1px solid ${LINE}`, borderLeft: `3px solid ${qualified ? GOLD : 'transparent'}`,
        background: podium ? 'linear-gradient(90deg, rgba(244,193,77,0.12), transparent 42%)' : PAGE,
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {entry.rank === 1 && <Trophy size={15} color={GOLD_DK} />}
        <span className="font-display" style={{ fontSize: 28, lineHeight: 1, color: podium ? GOLD_DK : TEXT }}>{entry.rank}</span>
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="font-display" style={{ fontSize: 19, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.05 }}>{entry.clubName.toUpperCase()}</div>
        <div className="font-condensed" style={{ fontSize: 12, color: MUTE, letterSpacing: '0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.leagueName} · {entry.state}</div>
        <div className="show-sm" style={{ marginTop: 8, gap: 10, alignItems: 'center' }}>
          <span className="font-condensed" style={{ fontSize: 12, color: TEXT, fontWeight: 700 }}>{rec.wins}-{rec.losses}{rec.draws ? `-${rec.draws}` : ''}</span>
          <FormPips form={entry.recentForm} />
          {qualified && <QualBadge qualified small />}
        </div>
      </div>
      <div className="hide-sm" style={{ textAlign: 'center' }}>
        <div className="font-display" style={{ fontSize: 18 }}>{rec.wins}-{rec.losses}{rec.draws ? `-${rec.draws}` : ''}</div>
        <div className="font-condensed" style={{ fontSize: 10, color: FAINT, letterSpacing: '0.08em' }}>{rec.played} GP</div>
      </div>
      <div className="hide-sm" style={{ display: 'flex', justifyContent: 'center' }}><FormPips form={entry.recentForm} /></div>
      <div className="hide-sm" style={{ textAlign: 'center', fontSize: 13, color: TEXT }}>{entry.goalsFor}<span style={{ color: FAINT }}> / {entry.goalsAgainst}</span></div>
      <div className="hide-sm" style={{ textAlign: 'center', fontSize: 13, color: TEXT }}>{entry.percentage ? entry.percentage.toFixed(0) : '—'}</div>
      <div className="hide-sm" style={{ display: 'flex', justifyContent: 'center' }}><StarStrength stars={stars} size={12} /></div>
      <div style={{ textAlign: 'right' }}>
        <div className="font-display" style={{ fontSize: 24, color: podium ? GOLD_DK : PINK, lineHeight: 1 }}>{entry.powerRating.toFixed(1)}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}><Movement current={entry.rank} previous={entry.previousRank} /></div>
      </div>
    </button>
  )
}

function CutoffLine() {
  return (
    <div style={{ padding: '16px 12px', background: 'rgba(244,193,77,0.14)', borderBottom: `1px solid ${LINE}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1, height: 2, background: `linear-gradient(90deg, transparent, ${GOLD})` }} />
        <div className="font-condensed" style={{ textAlign: 'center', color: GOLD_DK, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: 12, whiteSpace: 'nowrap' }}>
          <Trophy size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
          Championship Qualification Cut-Off — Top {QUALIFY_CUTOFF} currently qualify
        </div>
        <div style={{ flex: 1, height: 2, background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
      </div>
    </div>
  )
}

function Centered({ children, tone }: { children: React.ReactNode; tone?: 'error' }) {
  return <div className="font-condensed" style={{ minHeight: 200, display: 'grid', placeItems: 'center', color: tone === 'error' ? '#dc2626' : MUTE, fontSize: 13, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{children}</div>
}
