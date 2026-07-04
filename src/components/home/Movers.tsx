/**
 * Biggest Movers: the week's risers and fallers. Movement is drawn, not just
 * numbered: bars scale to the size of the jump so the week reads at a glance.
 */
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { teamPath, type RankingEntry } from '../../lib/rankings'
import { TeamLogo } from '../rankings/bits'
import { Section, SectionHead, Reveal, Skel, EASE, TEXT, MUTE, FAINT, LINE, UP, DOWN } from './ui'

export default function Movers({ risers, fallers, loading }: { risers: RankingEntry[]; fallers: RankingEntry[]; loading: boolean }) {
  const nothingMoved = !loading && risers.length === 0 && fallers.length === 0
  if (nothingMoved) return null

  return (
    <Section band>
      <SectionHead
        title={<>BIGGEST <span style={{ color: UP }}>MOVERS</span></>}
        sub="Who climbed and who slipped on the national ladder this week."
        to="/rankings" toLabel="See every move"
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
        <MoverColumn label="Risers" tone={UP} rows={risers} loading={loading} />
        <MoverColumn label="Fallers" tone={DOWN} rows={fallers} loading={loading} />
      </div>
    </Section>
  )
}

function MoverColumn({ label, tone, rows, loading }: { label: string; tone: string; rows: RankingEntry[]; loading: boolean }) {
  const reduced = useReducedMotion()
  const max = Math.max(1, ...rows.map(r => Math.abs(r.rankMovement)))
  const up = tone === UP

  return (
    <Reveal>
      <div className="gn-card" style={{ overflow: 'hidden' }}>
        <div className="font-condensed" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '15px 20px', borderBottom: `1px solid ${LINE}`, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: 11.5, color: tone }}>
          <svg width={11} height={11} viewBox="0 0 10 10" aria-hidden style={{ transform: up ? 'none' : 'rotate(180deg)' }}>
            <path d="M5 0 L10 7 L0 7 Z" fill="currentColor" />
          </svg>
          {label}
        </div>

        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 20px', borderBottom: i < 3 ? `1px solid ${LINE}` : 'none' }}>
            <Skel w={34} h={34} r={17} />
            <span style={{ flex: 1 }}><Skel w="52%" h={14} style={{ marginBottom: 6 }} /><Skel w="34%" h={10} /></span>
            <Skel w={40} h={18} />
          </div>
        ))}

        {!loading && rows.length === 0 && (
          <div className="font-condensed" style={{ padding: '30px 20px', color: MUTE, fontSize: 12.5, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center' }}>
            No {label.toLowerCase()} this week
          </div>
        )}

        {!loading && rows.map((e, i) => {
          const delta = Math.abs(e.rankMovement)
          return (
            <Link key={e.clubId} to={teamPath(e.clubId)} className="gn-row" aria-label={`${e.clubName}, ${up ? 'up' : 'down'} ${delta} to ${e.rank}`}
              style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 20px', textDecoration: 'none', color: TEXT, borderBottom: i < rows.length - 1 ? `1px solid ${LINE}` : 'none' }}>
              <TeamLogo name={e.clubName} size={36} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="font-display" style={{ display: 'block', fontSize: 16.5, lineHeight: 1.05, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.clubName.toUpperCase()}</span>
                <span className="font-condensed" style={{ display: 'block', color: MUTE, fontSize: 11.5, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {e.previousRank != null ? <>#{e.previousRank} <span aria-hidden>&rarr;</span> </> : null}
                  <b style={{ color: TEXT }}>#{e.rank}</b> · {e.leagueName}
                </span>
                {/* movement bar: width encodes the size of the jump */}
                <span style={{ display: 'block', height: 3, borderRadius: 3, background: 'rgba(17,17,17,0.06)', marginTop: 7, overflow: 'hidden' }}>
                  <motion.span
                    initial={{ width: reduced ? `${(delta / max) * 100}%` : 0 }}
                    whileInView={{ width: `${(delta / max) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, delay: 0.15 + i * 0.06, ease: EASE }}
                    style={{ display: 'block', height: '100%', borderRadius: 3, background: tone }}
                  />
                </span>
              </span>
              <span className="font-display" style={{ fontSize: 22, color: tone, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <svg width={12} height={12} viewBox="0 0 10 10" aria-hidden style={{ transform: up ? 'none' : 'rotate(180deg)' }}>
                  <path d="M5 0 L10 7 L0 7 Z" fill="currentColor" />
                </svg>
                {delta}
              </span>
            </Link>
          )
        })}

        {!loading && rows.length > 0 && (
          <div className="font-condensed" style={{ padding: '10px 20px 14px', color: FAINT, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Places {up ? 'gained' : 'lost'} since last week
          </div>
        )}
      </div>
    </Reveal>
  )
}
