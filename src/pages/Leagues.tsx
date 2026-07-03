/**
 * Leagues index — every tracked country netball league, grouped by state, with
 * strength rating, linking to league profiles. Bright championship style.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RankingsNav from '../components/rankings/RankingsNav'
import Footer from '../components/layout/Footer'
import { useSeo } from '../lib/seo'
import { useAsync, leaguePath, strengthStars } from '../lib/rankings'
import { PAGE, PAGE_ALT, TEXT, LINE, GOLD_DK, PINK, MUTE, FAINT, StarStrength, Eyebrow } from '../components/rankings/bits'

interface LeagueRow { id: string; name: string; state: string; stateName: string; strengthScore: number; clubCount: number }
const fetchLeagues = () => fetch('/api/leagues').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<{ data: LeagueRow[] }> }).then(r => r.data)

export default function Leagues() {
  const { data, loading, error } = useAsync<LeagueRow[]>(fetchLeagues, [])
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  useSeo({
    title: 'Country Netball Leagues — National Strength Ratings | CNCA',
    description: 'Every country netball league tracked by CNCA, with league strength ratings and nationally-ranked teams. Browse leagues by state.',
    path: '/leagues',
  })

  const grouped = useMemo(() => {
    const rows = (data ?? []).filter(l => !q.trim() || l.name.toLowerCase().includes(q.trim().toLowerCase()) || l.stateName.toLowerCase().includes(q.trim().toLowerCase()))
    const byState = new Map<string, { name: string; leagues: LeagueRow[] }>()
    for (const l of rows) {
      const g = byState.get(l.state) ?? { name: l.stateName, leagues: [] }
      g.leagues.push(l); byState.set(l.state, g)
    }
    for (const g of byState.values()) g.leagues.sort((a, b) => b.strengthScore - a.strengthScore)
    return [...byState.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name))
  }, [data, q])

  return (
    <div style={{ background: PAGE, minHeight: '100vh' }}>
      <RankingsNav />
      <header style={{ background: PAGE_ALT, borderBottom: `1px solid ${LINE}`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(680px 320px at 12% -20%, rgba(244,193,77,0.16), transparent 62%)' }} />
        <div style={{ position: 'relative', maxWidth: 1000, margin: '0 auto', padding: '40px 20px 30px' }}>
          <Eyebrow accent={GOLD_DK}>National Leagues</Eyebrow>
          <h1 className="font-display" style={{ fontSize: 'clamp(2.6rem,8vw,5.4rem)', color: TEXT, lineHeight: 0.88, margin: '12px 0 8px' }}>
            THE <span style={{ color: PINK }}>LEAGUES.</span>
          </h1>
          <p style={{ color: MUTE, fontSize: 15.5, maxWidth: 520 }}>Every country netball league we rank, by strength, across the nation.</p>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter leagues"
            className="font-condensed" style={{ marginTop: 20, width: '100%', maxWidth: 420, borderRadius: 12, outline: 'none', color: TEXT, fontSize: 15, background: PAGE, border: `1px solid ${LINE}`, padding: '12px 16px' }} />
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '30px 20px 90px' }}>
        {loading && <Centered>Loading leagues…</Centered>}
        {error && <Centered tone="error">Unable to load leagues right now.</Centered>}
        {!loading && !error && grouped.length === 0 && <Centered>No leagues found.</Centered>}

        {grouped.map(([code, g]) => (
          <section key={code} style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <h2 className="font-display" style={{ color: TEXT, fontSize: 'clamp(1.5rem,4vw,2.2rem)', margin: 0 }}>{g.name}</h2>
              <span className="font-condensed" style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#fff', background: TEXT, padding: '3px 8px', borderRadius: 6 }}>{code}</span>
              <div style={{ flex: 1, height: 1, background: LINE }} />
            </div>
            <div style={{ borderTop: `2px solid ${TEXT}` }}>
              {g.leagues.map(l => (
                <button key={l.id} onClick={() => navigate(leaguePath(l.id))} className="rank-row-lt"
                  style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none', font: 'inherit', color: TEXT, display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 14, alignItems: 'center', padding: '15px 10px', borderBottom: `1px solid ${LINE}`, background: PAGE }}>
                  <span className="font-display" style={{ fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name.toUpperCase()}</span>
                  <span className="hide-sm"><StarStrength stars={strengthStars(l.strengthScore)} size={14} /></span>
                  <span className="font-condensed" style={{ fontSize: 12, color: FAINT, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{l.clubCount} teams</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </main>
      <Footer />
    </div>
  )
}

function Centered({ children, tone }: { children: React.ReactNode; tone?: 'error' }) {
  return <div className="font-condensed" style={{ minHeight: 160, display: 'grid', placeItems: 'center', color: tone === 'error' ? '#dc2626' : MUTE, fontSize: 13, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{children}</div>
}
