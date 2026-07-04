/**
 * National Top 10: the hero feature. Editorial leaderboard with large crests,
 * movement, form, league strength and a live indicator. Rows are real links.
 */
import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { teamPath, strengthStars, type RankingEntry } from '../../lib/rankings'
import { TeamLogo, FormPips, StarStrength } from '../rankings/bits'
import { Section, SectionHead, Reveal, Skel, Move, TEXT, MUTE, FAINT, LINE, PINK, GOLD, GOLD_DK } from './ui'

export default function TopTen({ entries, weekLabel, generatedAt, loading }: {
  entries: RankingEntry[]; weekLabel: string | null; generatedAt: string | null; loading: boolean
}) {
  const top = entries.slice(0, 10)
  const updated = generatedAt
    ? new Date(generatedAt).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
    : null

  return (
    <Section id="rankings">
      <SectionHead
        kicker="The National Leaderboard"
        title={<>AUSTRALIA&rsquo;S <span style={{ color: PINK }}>TOP 10</span></>}
        sub="Every A Grade country netball club in the nation on one ladder, recalculated from live results each week."
        to="/rankings" toLabel="Full rankings"
      />

      {updated && (
        <Reveal>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
            <span className="gn-live-dot" aria-hidden />
            <span className="font-condensed" style={{ color: MUTE, fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              {weekLabel ? `${weekLabel} · ` : ''}Updated {updated}
            </span>
          </div>
        </Reveal>
      )}

      <Reveal>
        <div className="gn-card" style={{ overflow: 'hidden' }}>
          {loading && Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '17px 20px', borderBottom: i < 9 ? `1px solid ${LINE}` : 'none' }}>
              <Skel w={30} h={26} /><Skel w={44} h={44} r={22} />
              <span style={{ flex: 1 }}><Skel w="46%" h={17} style={{ marginBottom: 7 }} /><Skel w="30%" h={11} /></span>
              <Skel w={54} h={22} />
            </div>
          ))}

          {!loading && top.map((e, i) => {
            const podium = e.rank <= 3
            return (
              <Link key={e.clubId} to={teamPath(e.clubId)} className="gn-row" aria-label={`${e.clubName}, ranked ${e.rank}`}
                style={{
                  display: 'grid', gridTemplateColumns: 'clamp(40px, 5vw, 56px) 1fr auto', alignItems: 'center', gap: 'clamp(10px, 2vw, 18px)',
                  padding: 'clamp(13px, 2vw, 17px) clamp(14px, 2.5vw, 24px)', textDecoration: 'none', color: TEXT,
                  borderBottom: i < top.length - 1 ? `1px solid ${LINE}` : 'none',
                  background: podium ? 'linear-gradient(90deg, rgba(244,193,77,0.09), transparent 38%)' : 'transparent',
                }}>
                <span className="font-display" aria-hidden style={{ fontSize: podium ? 'clamp(26px, 3.4vw, 34px)' : 'clamp(21px, 2.8vw, 26px)', lineHeight: 1, color: podium ? GOLD_DK : FAINT, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {e.rank === 1 && <Trophy size={15} color={GOLD_DK} aria-hidden />}{e.rank}
                </span>

                <span style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 'clamp(10px, 1.6vw, 14px)' }}>
                  <TeamLogo name={e.clubName} size={podium ? 46 : 40} />
                  <span style={{ minWidth: 0 }}>
                    <span className="font-display" style={{ display: 'block', fontSize: 'clamp(16px, 2.4vw, 20px)', lineHeight: 1.05, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {e.clubName.toUpperCase()}
                    </span>
                    <span className="font-condensed" style={{ display: 'flex', alignItems: 'center', gap: 8, color: MUTE, fontSize: 12, letterSpacing: '0.03em', marginTop: 3, minWidth: 0 }}>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.leagueName} · {e.state}</span>
                      <span className="hide-sm" style={{ flexShrink: 0 }}><StarStrength stars={strengthStars(e.componentScores?.leagueStrength)} size={10} /></span>
                    </span>
                  </span>
                </span>

                <span style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 2vw, 26px)' }}>
                  <span className="hide-sm"><FormPips form={e.recentForm} /></span>
                  <span style={{ textAlign: 'right', minWidth: 58 }}>
                    <span className="font-display" style={{ display: 'block', fontSize: 'clamp(19px, 2.6vw, 23px)', lineHeight: 1, color: podium ? GOLD_DK : PINK }}>
                      {e.powerRating.toFixed(1)}
                    </span>
                    <span style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 3 }}><Move delta={e.rankMovement} /></span>
                  </span>
                </span>
              </Link>
            )
          })}

          {!loading && top.length === 0 && (
            <div className="font-condensed" style={{ padding: 44, textAlign: 'center', color: MUTE, fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Rankings publish with the first round of the season.
            </div>
          )}
        </div>
      </Reveal>

      {!loading && top.length > 0 && (
        <Reveal delay={0.1}>
          <div className="font-condensed" style={{ display: 'flex', gap: 18, marginTop: 14, color: FAINT, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', flexWrap: 'wrap' }}>
            <span><span style={{ color: GOLD, marginRight: 5 }}>&#9679;</span>Podium</span>
            <span><span style={{ color: '#22c55e', marginRight: 5 }}>&#9650;&#xFE0E;</span>Risen</span>
            <span><span style={{ color: '#dc2626', marginRight: 5 }}>&#9660;&#xFE0E;</span>Fallen</span>
            <span>Rating weighs record, percentage, form and league strength</span>
          </div>
        </Reveal>
      )}
    </Section>
  )
}
