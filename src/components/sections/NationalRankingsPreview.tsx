/**
 * Homepage section — national Top 10 leaderboard preview + "View full rankings".
 * Bright championship style matching the homepage; rows link to team profiles.
 */
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Trophy } from 'lucide-react'
import { fetchTop, useAsync, teamPath, type RankingsResponse } from '../../lib/rankings'
import { PAGE_ALT, TEXT, LINE, GOLD_DK, PINK, MUTE, FAINT, FormPips, Movement, Eyebrow } from '../rankings/bits'

export default function NationalRankingsPreview() {
  const { data, loading } = useAsync<RankingsResponse>(() => fetchTop(10), [])
  const navigate = useNavigate()
  const entries = data?.data ?? []
  const week = data?.meta?.weekLabel

  return (
    <section style={{ background: PAGE_ALT }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '64px 20px 72px' }}>
        <div style={{ marginBottom: 30 }}>
          <Eyebrow>The National Leaderboard{week ? ` · ${week}` : ''}</Eyebrow>
          <h2 className="font-display" style={{ fontSize: 'clamp(2.8rem,7vw,5.5rem)', color: TEXT, lineHeight: 0.88, margin: '14px 0 10px' }}>
            AUSTRALIA’S <span style={{ color: PINK }}>TOP 10</span>
          </h2>
          <p style={{ color: MUTE, fontSize: 15.5, maxWidth: 520 }}>
            The strongest country netball A&nbsp;Grade clubs in the nation, ranked from live ladder data.
          </p>
        </div>

        <div style={{ borderTop: `2px solid ${TEXT}` }}>
          {loading && <div className="font-condensed" style={{ padding: 40, textAlign: 'center', color: MUTE, letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: 12 }}>Loading…</div>}
          {!loading && entries.map(e => (
            <button key={e.clubId} onClick={() => navigate(teamPath(e.clubId))} className="rank-row-lt"
              style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none', font: 'inherit', color: TEXT,
                display: 'grid', gridTemplateColumns: '54px 1fr auto auto', gap: 12, alignItems: 'center', padding: '15px 10px',
                borderBottom: `1px solid ${LINE}`, background: e.rank <= 3 ? 'linear-gradient(90deg, rgba(244,193,77,0.14), transparent 45%)' : 'transparent' }}>
              <span className="font-display" style={{ fontSize: 26, color: e.rank <= 3 ? GOLD_DK : TEXT, display: 'flex', alignItems: 'center', gap: 4 }}>
                {e.rank === 1 && <Trophy size={16} color={GOLD_DK} />}{e.rank}
              </span>
              <span style={{ minWidth: 0 }}>
                <span className="font-display" style={{ display: 'block', fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.05 }}>{e.clubName.toUpperCase()}</span>
                <span className="font-condensed" style={{ display: 'block', color: MUTE, fontSize: 12, letterSpacing: '0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.leagueName} · {e.state}</span>
              </span>
              <span className="hide-sm"><FormPips form={e.recentForm} /></span>
              <span style={{ textAlign: 'right', minWidth: 64 }}>
                <span className="font-display" style={{ display: 'block', fontSize: 22, color: e.rank <= 3 ? GOLD_DK : PINK, lineHeight: 1 }}>{e.powerRating.toFixed(1)}</span>
                <span style={{ display: 'flex', justifyContent: 'flex-end' }}><Movement current={e.rank} previous={e.previousRank} /></span>
              </span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 28, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link to="/rankings" className="btn-pink" style={{ padding: '15px 30px', fontSize: 14, letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            View Full Rankings <ArrowRight size={16} />
          </Link>
          <span className="font-condensed" style={{ color: FAINT, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: 12 }}>Top 32 qualify for the Championship</span>
        </div>
      </div>
    </section>
  )
}
