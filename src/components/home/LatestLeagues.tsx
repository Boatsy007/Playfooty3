/**
 * Latest Updated Leagues: a snap rail of league cards ordered by most recent
 * data refresh. Communicates that the platform is alive week to week.
 */
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { leaguePath, strengthStars } from '../../lib/rankings'
import { StarStrength } from '../rankings/bits'
import { Section, SectionHead, Reveal, Skel, TEXT, MUTE, FAINT, LINE, CYANISH } from './ui'
import type { LeagueRow } from './useHomeData'

export default function LatestLeagues({ leagues, loading }: { leagues: LeagueRow[]; loading: boolean }) {
  if (!loading && leagues.length === 0) return null
  return (
    <Section band>
      <SectionHead
        title={<>FRESH FROM <span style={{ color: CYANISH }}>THE LEAGUES</span></>}
        sub="The most recently updated competitions on the platform."
        to="/leagues" toLabel="All leagues"
      />
      <Reveal>
        <div className="gn-rail" role="list">
          {loading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="gn-card" style={{ width: 250, padding: 20 }}>
              <Skel w="40%" h={11} style={{ marginBottom: 14 }} />
              <Skel w="85%" h={20} style={{ marginBottom: 10 }} />
              <Skel w="55%" h={12} />
            </div>
          ))}
          {!loading && leagues.map(l => {
            const stars = strengthStars(l.strengthScore)
            return (
              <Link key={l.id} role="listitem" to={leaguePath(l.id)} className="gn-card gn-card-hover"
                style={{ width: 250, padding: '18px 20px', textDecoration: 'none', color: TEXT, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span className="font-condensed" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: FAINT }}>
                  {l.state}
                  {l.lastSyncedAt && <span style={{ color: '#16a34a' }}>{updatedLabel(l.lastSyncedAt)}</span>}
                </span>
                <span className="font-display" style={{ fontSize: 20, lineHeight: 1, minHeight: 40, display: 'flex', alignItems: 'center' }}>{l.name.toUpperCase()}</span>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${LINE}`, paddingTop: 10 }}>
                  <StarStrength stars={stars} size={11} />
                  <span className="font-condensed" style={{ color: MUTE, fontSize: 11.5, fontWeight: 700 }}>{l.clubCount} clubs</span>
                </span>
              </Link>
            )
          })}
          {!loading && (
            <Link to="/leagues" className="gn-card gn-card-hover" aria-label="Browse all leagues"
              style={{ width: 170, padding: 20, textDecoration: 'none', color: MUTE, display: 'grid', placeItems: 'center' }}>
              <span className="font-condensed" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: 11.5 }}>
                All leagues <ArrowRight size={14} />
              </span>
            </Link>
          )}
        </div>
      </Reveal>
    </Section>
  )
}

function updatedLabel(iso: string): string {
  const days = Math.floor((Date.now() - +new Date(iso)) / 86400000)
  if (days <= 0) return 'Updated today'
  if (days === 1) return 'Updated yesterday'
  if (days < 7) return `Updated ${days}d ago`
  return `Updated ${Math.floor(days / 7)}w ago`
}
