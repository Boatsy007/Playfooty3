import { motion } from 'framer-motion'
import { Trophy, ChevronRight } from 'lucide-react'

export default function Prize() {
  const go = (id: string) => document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section className="relative overflow-hidden py-24 lg:py-32" style={{ background: '#0d0d0d' }}>
      {/* Subtle radial glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(244,193,77,0.07) 0%, transparent 70%)' }} />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 text-center">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
          className="flex flex-col items-center"
        >
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8"
            style={{ background: 'rgba(244,193,77,0.1)', border: '1px solid rgba(244,193,77,0.25)' }}>
            <Trophy size={28} style={{ color: '#f4c14d' }} />
          </div>

          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-6">
            <div className="h-[2px] w-6" style={{ background: '#f4c14d' }} />
            <span className="text-[11px] font-bold tracking-[0.22em] uppercase" style={{ color: '#f4c14d' }}>The Prize</span>
            <div className="h-[2px] w-6" style={{ background: '#f4c14d' }} />
          </div>

          {/* Headline */}
          <h2 className="font-display text-white leading-none mb-8"
            style={{ fontSize: 'clamp(3rem, 8vw, 7rem)' }}>
            CHAMPIONSHIP<br />
            <span style={{ color: '#f4c14d' }}>PRIZE</span>
          </h2>

          {/* Copy */}
          <p className="text-white/50 text-base lg:text-lg leading-relaxed mb-3 max-w-xl">
            A major prize package will be awarded to the 2026 CNCA Champion Club.
          </p>
          <p className="text-white/30 text-sm leading-relaxed mb-12 max-w-md">
            Full details announced prior to the event.
          </p>

          {/* Divider */}
          <div className="w-px h-12 mb-10" style={{ background: 'rgba(255,255,255,0.1)' }} />

          {/* CTA */}
          <button
            onClick={() => go('#invitation')}
            className="group inline-flex items-center gap-2.5 font-bold text-sm px-8 py-4 rounded-full transition-all duration-200"
            style={{ background: '#f4c14d', color: '#0d0d0d' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#d4a832')}
            onMouseLeave={e => (e.currentTarget.style.background = '#f4c14d')}
          >
            Request Invitation
            <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-200" />
          </button>
        </motion.div>
      </div>
    </section>
  )
}
