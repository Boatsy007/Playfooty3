import { useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'

const prizes = [
  { title: 'National Title',       desc: 'The highest honour in A Grade country netball.' },
  { title: 'Champion Trophy',      desc: 'Presented at the national awards ceremony.' },
  { title: 'Major Prize Package',  desc: 'Full details announced prior to the event.' },
  { title: 'National Recognition', desc: "Club acknowledged as Australia's best." },
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
        style={{ objectPosition: '65% 40%' }}
      />

      {/* Overlays */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(13,13,13,0.97) 0%, rgba(13,13,13,0.8) 45%, rgba(13,13,13,0.5) 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(13,13,13,0.3) 0%, rgba(13,13,13,0.0) 30%, rgba(13,13,13,0.7) 100%)' }} />

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-24 lg:py-32 h-full flex flex-col justify-center lg:justify-end">
        <div className="grid lg:grid-cols-[6fr,4fr] gap-12 lg:gap-20 items-end">

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: prefersReduced ? 0 : 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, ease }}
          >
            <p className="font-condensed font-bold tracking-[0.28em] text-xs uppercase mb-8" style={{ color: '#f4c14d' }}>
              The Prize
            </p>
            <h2 className="font-display text-white leading-none mb-6" style={{ fontSize: 'clamp(3.5rem, 9vw, 9rem)' }}>
              ONE<br />NATIONAL<br /><span style={{ color: '#ff2c91' }}>CHAMPION</span>
            </h2>
            <p className="text-sm leading-relaxed mb-10" style={{ color: 'rgba(255,255,255,0.4)', maxWidth: '36ch' }}>
              A Grade premiership clubs from across Australia. One championship. One national title. One club crowned champion.
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
            className="border-l pl-8"
            style={{ borderColor: 'rgba(255,255,255,0.1)' }}
          >
            {prizes.map(({ title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: prefersReduced ? 0 : 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: prefersReduced ? 0 : 0.2 + i * 0.08, ease }}
                className="mb-7 last:mb-0"
              >
                <div className="w-4 h-[2px] mb-3 rounded-full" style={{ background: '#f4c14d' }} />
                <p className="font-display text-white leading-none mb-1.5" style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)' }}>
                  {title.toUpperCase()}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {desc}
                </p>
              </motion.div>
            ))}
          </motion.div>

        </div>
      </div>
    </section>
  )
}
