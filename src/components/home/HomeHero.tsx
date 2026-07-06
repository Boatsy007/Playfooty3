/**
 * Homepage masthead. No stock photography: a drawn football-court geometry over
 * layered stadium-light gradients, with a quiet season-live indicator. The one
 * dark block on the page; everything below is bright editorial.
 */
import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { EASE, PINK, GOLD } from './ui'

const INK = '#0c0e13'

export default function HomeHero({ weekLabel }: { weekLabel: string | null }) {
  const navigate = useNavigate()
  const reduced = useReducedMotion()

  const rise = (delay: number) => ({
    initial: { opacity: 0, y: reduced ? 0 : 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: EASE },
  })

  return (
    <section aria-label="PlayFooty" style={{ position: 'relative', overflow: 'hidden', background: INK, minHeight: 'min(88svh, 760px)', display: 'flex' }}>

      {/* Stadium lighting: two soft sources + floor wash */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: `
        radial-gradient(58% 46% at 78% 8%, rgba(255,44,145,0.22), transparent 68%),
        radial-gradient(46% 40% at 12% 20%, rgba(244,193,77,0.12), transparent 70%),
        radial-gradient(90% 44% at 50% 108%, rgba(255,255,255,0.05), transparent 70%)` }} />

      {/* Court geometry: centre circle + third lines + goal arcs, drawn in */}
      <svg aria-hidden viewBox="0 0 1200 640" preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.5 }}>
        <g fill="none" stroke="rgba(255,255,255,0.11)" strokeWidth="1.5">
          <motion.circle cx="920" cy="330" r="190"
            initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, ease: EASE, delay: 0.2 }} />
          <motion.circle cx="920" cy="330" r="322" stroke="rgba(255,255,255,0.06)"
            initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.9, ease: EASE, delay: 0.35 }} />
          <motion.path d="M 660 -40 L 660 700" stroke="rgba(255,255,255,0.07)"
            initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: EASE, delay: 0.5 }} />
          <motion.path d="M 1180 -40 L 1180 700" stroke="rgba(255,255,255,0.07)"
            initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: EASE, delay: 0.6 }} />
          {/* goal-circle arc, bottom left */}
          <motion.path d="M -60 640 A 300 300 0 0 1 540 640" stroke={`${PINK}55`} strokeWidth="1.8"
            initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, ease: EASE, delay: 0.45 }} />
          <motion.path d="M 40 640 A 200 200 0 0 1 440 640" stroke="rgba(255,255,255,0.09)"
            initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: EASE, delay: 0.65 }} />
        </g>
        <circle cx="920" cy="330" r="3.5" fill={GOLD} opacity="0.85" />
      </svg>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1120, margin: '0 auto', padding: 'clamp(56px, 9vh, 110px) 20px clamp(48px, 7vh, 84px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%' }}>

        <motion.div {...rise(0.05)} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 26 }}>
          <span className="gn-live-dot" aria-hidden />
          <span className="font-condensed" style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', fontSize: 11 }}>
            {weekLabel ? `Season live · ${weekLabel}` : 'Season live'}
          </span>
        </motion.div>

        <h1 style={{ margin: 0 }}>
          <motion.span {...rise(0.12)} className="font-condensed" style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', fontSize: 'clamp(0.72rem, 1.4vw, 0.92rem)', marginBottom: 14 }}>
            Australia&rsquo;s Home of
          </motion.span>
          <span style={{ display: 'block' }}>
            {['COUNTRY', 'FOOTBALL'].map((line, i) => (
              <span key={line} style={{ display: 'block', overflow: 'hidden' }}>
                <motion.span
                  initial={{ y: reduced ? 0 : '108%' }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.85, delay: 0.2 + i * 0.09, ease: EASE }}
                  className="font-display"
                  style={{ display: 'block', lineHeight: 0.86, fontSize: 'clamp(4rem, 13vw, 11rem)', color: i === 0 ? '#ffffff' : PINK, letterSpacing: '0.005em' }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </span>
        </h1>

        <motion.p {...rise(0.42)} style={{ color: 'rgba(255,255,255,0.62)', fontSize: 'clamp(0.98rem, 1.9vw, 1.14rem)', maxWidth: '46ch', lineHeight: 1.65, margin: '26px 0 0', fontWeight: 500 }}>
          National rankings, league ladders, club profiles, news and statistics.
          One place. One national ranking.
        </motion.p>

        <motion.div {...rise(0.52)} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 34 }}>
          <button onClick={() => navigate('/rankings')} className="btn-pink font-condensed"
            style={{ fontSize: '0.92rem', fontWeight: 800, letterSpacing: '0.12em', padding: '1rem 2.3rem', display: 'inline-flex', alignItems: 'center', gap: 9, border: 'none', cursor: 'pointer' }}>
            VIEW NATIONAL RANKINGS <ArrowRight size={16} />
          </button>
          <button onClick={() => navigate('/leagues')} className="btn-ghost on-dark font-condensed"
            style={{ fontSize: '0.92rem', fontWeight: 800, letterSpacing: '0.12em', padding: '1rem 2rem', cursor: 'pointer' }}>
            BROWSE LEAGUES
          </button>
        </motion.div>
      </div>
    </section>
  )
}
