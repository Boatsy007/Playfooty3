import { motion } from 'framer-motion'
import { Trophy, ChevronRight } from 'lucide-react'

export default function Prize() {
  const go = (id: string) => document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section className="relative overflow-hidden py-24 lg:py-32" style={{ background: '#faf9f6' }}>
      {/* Subtle gold radial */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 55% 45% at 50% 50%, rgba(232,160,32,0.08) 0%, transparent 70%)' }} />

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
            style={{ background: 'rgba(232,160,32,0.12)', border: '1px solid rgba(232,160,32,0.3)' }}>
            <Trophy size={28} style={{ color: '#c8880a' }} />
          </div>

          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-6">
            <div className="h-[2px] w-6" style={{ background: '#c8880a' }} />
            <span className="text-[11px] font-bold tracking-[0.22em] uppercase" style={{ color: '#c8880a' }}>The Prize</span>
            <div className="h-[2px] w-6" style={{ background: '#c8880a' }} />
          </div>

          {/* Headline */}
          <h2 className="font-display leading-none mb-8" style={{ fontSize: 'clamp(3rem, 8vw, 7rem)', color: '#111111' }}>
            CHAMPIONSHIP<br />
            <span style={{ color: '#c8880a' }}>PRIZE</span>
          </h2>

          {/* Copy */}
          <p className="text-base lg:text-lg leading-relaxed mb-3 max-w-xl font-semibold" style={{ color: 'rgba(17,17,17,0.6)' }}>
            A major prize package will be awarded to the 2026 CNCA Champion Club.
          </p>
          <p className="text-sm leading-relaxed mb-12 max-w-md" style={{ color: 'rgba(17,17,17,0.38)' }}>
            Full details announced prior to the event.
          </p>

          {/* Divider */}
          <div className="w-px h-12 mb-10" style={{ background: 'rgba(17,17,17,0.12)' }} />

          {/* CTA */}
          <button
            onClick={() => go('#invitation')}
            className="group inline-flex items-center gap-2.5 font-bold text-sm px-8 py-4 rounded-full transition-all duration-200"
            style={{ background: '#111111', color: '#ffffff' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#333333')}
            onMouseLeave={e => (e.currentTarget.style.background = '#111111')}
          >
            Request Invitation
            <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-200" />
          </button>
        </motion.div>
      </div>
    </section>
  )
}
