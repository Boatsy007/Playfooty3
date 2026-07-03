/**
 * Homepage section — national Top 10 leaderboard preview + "View full rankings".
 * Premium dark; links each team to its profile.
 */
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Trophy } from 'lucide-react'
import { fetchTop, useAsync, teamPath, type RankingsResponse } from '../../lib/rankings'
import { INK, PANEL, LINE, GOLD, MUTE, FormPips, Movement, Label } from '../rankings/bits'

export default function NationalRankingsPreview() {
  const { data, loading } = useAsync<RankingsResponse>(() => fetchTop(10), [])
  const navigate = useNavigate()
  const entries = data?.data ?? []
  const week = data?.meta?.weekLabel

  return (
    <section style={{ background: INK, padding: '90px 20px', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(900px 400px at 50% -20%, rgba(255,44,145,0.10), transparent 60%)' }} />
      <div style={{ position: 'relative', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 34 }}>
          <Label>The National Leaderboard{week ? ` · ${week}` : ''}</Label>
          <h2 className="font-display" style={{ fontSize: 'clamp(2.6rem,7vw,5rem)', color: '#fff', lineHeight: 0.9, margin: '12px 0 10px' }}>
            AUSTRALIA’S TOP 10
          </h2>
          <p style={{ color: MUTE, fontSize: 16, maxWidth: 560, margin: '0 auto' }}>
            The strongest country netball A&nbsp;Grade clubs in the nation, ranked from live ladder data.
          </p>
        </div>

        <div style={{ border: `1px solid ${LINE}`, borderRadius: 18, overflow: 'hidden', background: PANEL }}>
          {loading && <div className="font-condensed" style={{ padding: 40, textAlign: 'center', color: MUTE, letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: 12 }}>Loading…</div>}
          {!loading && entries.map(e => (
            <button key={e.clubId} onClick={() => navigate(teamPath(e.clubId))} className="rank-row"
              style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none', font: 'inherit', color: '#fff',
                display: 'grid', gridTemplateColumns: '52px 1fr auto auto', gap: 12, alignItems: 'center', padding: '15px 18px',
                borderBottom: `1px solid ${LINE}`, background: e.rank <= 3 ? 'linear-gradient(90deg, rgba(244,193,77,0.06), transparent 45%)' : 'transparent' }}>
              <span className="font-display" style={{ fontSize: 26, color: e.rank <= 3 ? GOLD : '#fff', display: 'flex', alignItems: 'center', gap: 4 }}>
                {e.rank === 1 && <Trophy size={16} color={GOLD} />}{e.rank}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.clubName}</span>
                <span className="font-condensed" style={{ display: 'block', color: MUTE, fontSize: 12, letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.leagueName} · {e.state}</span>
              </span>
              <span className="hide-sm"><FormPips form={e.recentForm} /></span>
              <span style={{ textAlign: 'right', minWidth: 64 }}>
                <span className="font-display" style={{ display: 'block', fontSize: 22, color: e.rank <= 3 ? GOLD : '#fff', lineHeight: 1 }}>{e.powerRating.toFixed(1)}</span>
                <span style={{ display: 'block' }}><Movement current={e.rank} previous={e.previousRank} /></span>
              </span>
            </button>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 30 }}>
          <Link to="/rankings" className="btn-pink" style={{ padding: '15px 30px', fontSize: 14, letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            View Full Rankings <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}
