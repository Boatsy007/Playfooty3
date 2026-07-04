/**
 * About Got Netty: the closing statement. Quiet, editorial, one message.
 */
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Section, Reveal, TEXT, MUTE, PINK, LINE } from './ui'

export default function AboutStrip() {
  return (
    <Section band>
      <Reveal>
        <div style={{ maxWidth: 760 }}>
          <h2 className="font-display" style={{ fontSize: 'clamp(2rem, 4.4vw, 3.2rem)', color: TEXT, lineHeight: 0.94, margin: 0 }}>
            ONE QUESTION.<br /><span style={{ color: PINK }}>SETTLED EVERY WEEK.</span>
          </h2>
          <p style={{ color: MUTE, fontSize: 16, lineHeight: 1.7, margin: '18px 0 0' }}>
            Got Netty exists to answer one question better than anyone else: who are the best country
            netball clubs and leagues in Australia? Every week of the season we collect A&nbsp;Grade results
            from country and regional leagues nationwide and rank every club on one national ladder.
            Never on ladder position alone, and always with the reasoning shown.
          </p>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 22, paddingTop: 18, borderTop: `1px solid ${LINE}`, flexWrap: 'wrap' }}>
            <Link to="/about" className="font-condensed" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: TEXT, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: 12, textDecoration: 'none' }}>
              How the rankings work <ArrowRight size={14} />
            </Link>
            <Link to="/rankings" className="font-condensed" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: PINK, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: 12, textDecoration: 'none' }}>
              View the national ladder <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </Reveal>
    </Section>
  )
}
