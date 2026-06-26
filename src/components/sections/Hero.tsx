import { useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Lock, Trophy, Star } from 'lucide-react'
import WhatsOnDrawer from '../ui/WhatsOnDrawer'

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

const badges = [
  { icon: Trophy, label: 'A Grade Premiers', gold: true },
  { icon: Lock,   label: 'Invitation Only',  pink: true },
  { icon: Star,   label: 'National Title',   gold: true },
  { icon: MapPin, label: 'Gold Coast',       gold: false },
]

export default function Hero() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const go = (id: string) => document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section
      className="relative overflow-hidden flex flex-col"
      style={{ minHeight: 'calc(100svh - 108px)' }}
    >
      {/* Full-bleed photo */}
      <img
        src="/hero-photo.webp"
        alt="CNCA — Country Netball Championships Australia"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: '65% center' }}
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.85) 100%)' }} />
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(to right, rgba(13,13,13,0.9) 0%, rgba(13,13,13,0.4) 50%, transparent 80%)' }} />
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, rgba(255,44,145,0.15) 0%, transparent 50%)' }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end lg:justify-center flex-1 px-6 sm:px-10 lg:px-16 pb-8 pt-8 lg:py-0 max-w-5xl">

        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease }}
          className="font-bold tracking-[0.25em] uppercase mb-5 text-[11px]"
          style={{ color: '#f4c14d' }}
        >
          Gold Coast, Queensland · November 2026
        </motion.p>

        {/* Headline */}
        <div className="mb-4">
          {['COUNTRY', 'NETBALL', 'CHAMPIONSHIPS'].map((word, i) => (
            <div key={word} className="overflow-hidden">
              <motion.span
                initial={{ y: '110%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 0.7, delay: 0.18 + i * 0.09, ease }}
                className="block font-display leading-[0.88]"
                style={{
                  fontSize: 'clamp(2.6rem, 7.8vw, 8rem)',
                  color: word === 'NETBALL' ? '#ff2c91' : '#ffffff',
                }}
              >
                {word}
              </motion.span>
            </div>
          ))}
        </div>

        {/* Sub-brand line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5, ease }}
          className="font-display text-white/40 mb-6 leading-none tracking-wide"
          style={{ fontSize: 'clamp(0.85rem, 1.6vw, 1.1rem)', letterSpacing: '0.08em' }}
        >
          AUSTRALIA
        </motion.p>

        {/* Declarative copy */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.55, ease }}
          className="mb-8 space-y-1"
        >
          <p className="font-semibold text-white leading-snug" style={{ fontSize: 'clamp(0.95rem, 2vw, 1.15rem)' }}>
            A Grade premiership clubs from across Australia.
          </p>
          <p className="font-semibold leading-snug" style={{ fontSize: 'clamp(0.95rem, 2vw, 1.15rem)', color: 'rgba(255,255,255,0.45)' }}>
            One championship. One national title.
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.68, ease }}
          className="flex flex-wrap gap-3 mb-10"
        >
          <motion.button
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => go('#invitation')}
            className="btn-pink font-bold rounded-full tracking-wide"
            style={{ fontSize: 'clamp(0.8rem, 1.4vw, 0.95rem)', padding: 'clamp(0.9rem, 1.5vw, 1.1rem) clamp(2rem, 3vw, 3rem)', letterSpacing: '0.06em' }}
          >
            REQUEST INVITATION
          </motion.button>
          <motion.button
            whileHover={{ borderColor: '#ff2c91', color: '#ff2c91', y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (window.innerWidth < 1024) setDrawerOpen(true)
              else go('#experience')
            }}
            className="font-semibold rounded-full border-2 transition-all duration-200 tracking-wide"
            style={{
              fontSize: 'clamp(0.8rem, 1.4vw, 0.95rem)',
              padding: 'clamp(0.9rem, 1.5vw, 1.1rem) clamp(1.8rem, 2.5vw, 2.5rem)',
              letterSpacing: '0.06em',
              borderColor: 'rgba(255,255,255,0.28)',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            EXPLORE EVENT
          </motion.button>
        </motion.div>

        {/* Info badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.82 }}
          className="flex flex-wrap gap-2"
        >
          {badges.map(({ icon: Icon, label, gold, pink }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full backdrop-blur-sm tracking-wide"
              style={
                gold
                  ? { background: 'rgba(244,193,77,0.12)', border: '1px solid rgba(244,193,77,0.35)', color: '#f4c14d' }
                  : pink
                  ? { background: 'rgba(255,44,145,0.12)', border: '1px solid rgba(255,44,145,0.35)', color: '#ff2c91' }
                  : { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.65)' }
              }
            >
              <Icon size={10} />
              {label.toUpperCase()}
            </span>
          ))}
        </motion.div>
      </div>

      <WhatsOnDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </section>
  )
}
