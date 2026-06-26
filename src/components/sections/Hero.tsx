import { useState, useCallback } from 'react'
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

const headline = ['COUNTRY NETBALL', 'CHAMPIONSHIPS']

export default function Hero() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const go = useCallback((id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  return (
    <section className="relative overflow-hidden flex flex-col" style={{ minHeight: 'calc(100svh - 108px)' }}>

      {/* Full-bleed photo */}
      <img
        src="/hero-photo.webp"
        alt="CNCA Country Netball Championships Australia"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: '65% center' }}
      />

      {/* Overlays */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 35%, rgba(0,0,0,0.88) 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(13,13,13,0.92) 0%, rgba(13,13,13,0.5) 55%, transparent 85%)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(255,44,145,0.12) 0%, transparent 45%)' }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end lg:justify-center flex-1 px-6 sm:px-10 lg:px-16 pb-10 pt-8 lg:py-0 max-w-5xl">

        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease }}
          className="font-condensed font-bold tracking-[0.28em] uppercase mb-6"
          style={{ fontSize: '0.8rem', color: '#f4c14d', letterSpacing: '0.28em' }}
        >
          GOLD COAST, QUEENSLAND &nbsp;•&nbsp; 5–8 NOVEMBER 2026
        </motion.p>

        {/* Headline — two-line stacked */}
        <div className="mb-6">
          {headline.map((line, i) => (
            <div key={line} className="overflow-hidden">
              <motion.span
                initial={{ y: '105%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 0.75, delay: 0.2 + i * 0.1, ease }}
                className="block font-display leading-[0.88]"
                style={{
                  fontSize: 'clamp(2.8rem, 8.5vw, 9rem)',
                  color: i === 0 ? '#ffffff' : '#ff2c91',
                }}
              >
                {line}
              </motion.span>
            </div>
          ))}
        </div>

        {/* Subtext */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.45, ease }}
          className="mb-9 space-y-1.5"
        >
          <p className="font-semibold text-white" style={{ fontSize: 'clamp(0.95rem, 1.8vw, 1.1rem)' }}>
            Australia's premier A Grade country netball championship.
          </p>
          <p className="font-semibold" style={{ fontSize: 'clamp(0.85rem, 1.6vw, 1rem)', color: 'rgba(255,255,255,0.4)' }}>
            One championship. One national title.
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.58, ease }}
          className="flex flex-wrap gap-3 mb-10"
        >
          <motion.button
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => go('#invitation')}
            className="btn-pink font-bold rounded-full"
            style={{ fontSize: 'clamp(0.78rem, 1.3vw, 0.9rem)', padding: 'clamp(0.85rem, 1.4vw, 1rem) clamp(1.8rem, 2.8vw, 2.8rem)', letterSpacing: '0.08em' }}
          >
            REQUEST INVITATION
          </motion.button>
          <motion.button
            whileHover={{ borderColor: '#ff2c91', color: '#ff2c91', y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(true); else go('#the-weekend') }}
            className="font-semibold rounded-full border-2 transition-all duration-200"
            style={{ fontSize: 'clamp(0.78rem, 1.3vw, 0.9rem)', padding: 'clamp(0.85rem, 1.4vw, 1rem) clamp(1.6rem, 2.2vw, 2.2rem)', letterSpacing: '0.08em', borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.65)' }}
          >
            EXPLORE EVENT
          </motion.button>
        </motion.div>

        {/* Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.75 }}
          className="flex flex-wrap gap-2"
        >
          {badges.map(({ icon: Icon, label, gold, pink }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 font-condensed font-bold px-3 py-1.5 rounded-full backdrop-blur-sm"
              style={{
                fontSize: '0.68rem',
                letterSpacing: '0.15em',
                ...(gold
                  ? { background: 'rgba(244,193,77,0.12)', border: '1px solid rgba(244,193,77,0.3)', color: '#f4c14d' }
                  : pink
                  ? { background: 'rgba(255,44,145,0.12)', border: '1px solid rgba(255,44,145,0.3)', color: '#ff2c91' }
                  : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }),
              }}
            >
              <Icon size={9} />
              {label.toUpperCase()}
            </span>
          ))}
        </motion.div>
      </div>

      <WhatsOnDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </section>
  )
}
