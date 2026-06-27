import { useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'

const prizes = [
  'National Championship Trophy',
  'Official Champion Recognition',
  'Major Prize Package',
  'National Exposure',
]

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function OneNationalChampion() {
  const go = useCallback((id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })
  }, [])
  const prefersReduced = useReducedMotion()

  return (
    <section className="relative overflow-hidden" style={{ minHeight: 'clamp(600px, 85vh, 1000px)', background: '#0d0d0d' }}>
      {/* Full-bleed photo */}
      <img
        src="/hero-photo.webp"
        alt="Championship moment"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: '65% 35%' }}
      />

      {/* Overlays */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(13,13,13,0.97) 0%, rgba(13,13,13,0.82) 45%, rgba(13,13,13,0.55) 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(13,13,13,0.5) 0%, transparent 60%)' }} />

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 h-full flex flex-col justify-center py-24 lg:py-32">
        <div className="grid lg:grid-cols-[6fr,4fr] gap-12 lg:gap-24 items-center">

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: prefersReduced ? 0 : 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, ease }}
          >
            <h2 className="font-display text-white leading-none mb-8" style={{ fontSize: 'clamp(3.5rem, 9vw, 9rem)' }}>
              ONE<br />NATIONAL<br /><span style={{ color: '#ff2c91' }}>CHAMPION</span>
            </h2>
            <p className="leading-relaxed mb-10" style={{ fontSize: 'clamp(0.95rem, 1.6vw, 1.05rem)', color: 'rgba(255,255,255,0.45)', maxWidth: '40ch' }}>
              Only one club will leave the Gold Coast as the 2026 CNCA Champion.
            </p>
            <button
              onClick={() => go('#invitation')}
              className="group inline-flex items-center gap-2.5 font-bold rounded-full transition-all duration-200"
              style={{ background: '#ff2c91', color: '#ffffff', fontSize: '0.875rem', padding: '1rem 2.5rem', letterSpacing: '0.06em' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#cc1f6e')}
              onMouseLeave={e => (e.currentTarget.style.background = '#ff2c91')}
            >
              REQUEST INVITATION
              <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-200" />
            </button>
          </motion.div>

          {/* Prize list */}
          <motion.div
            initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, delay: 0.15, ease }}
          >
            <p className="font-condensed font-bold tracking-[0.22em] text-xs uppercase mb-8" style={{ color: '#f4c14d' }}>
              The Winning Club Receives
            </p>
            <div className="space-y-0">
              {prizes.map((prize, i) => (
                <motion.div
                  key={prize}
                  initial={{ opacity: 0, x: prefersReduced ? 0 : 12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: prefersReduced ? 0 : 0.2 + i * 0.08, ease }}
                  className="flex items-center gap-4 py-4"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#f4c14d' }} />
                  <span className="font-display text-white leading-none" style={{ fontSize: 'clamp(1.1rem, 2.2vw, 1.4rem)' }}>
                    {prize.toUpperCase()}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
