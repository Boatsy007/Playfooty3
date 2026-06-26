import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, MapPin, Lock, Trophy } from 'lucide-react'
import WhatsOnDrawer from '../ui/WhatsOnDrawer'

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

const badges = [
  { icon: Calendar, label: '5–8 Nov 2026', gold: true },
  { icon: MapPin, label: 'Gold Coast, QLD', gold: false },
  { icon: Lock, label: 'Invite Only', pink: true },
  { icon: Trophy, label: 'A Grade Premiers', gold: false },
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
        alt="Netball action — Gold Coast"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: '65% center' }}
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.82) 100%)' }} />
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(to right, rgba(13,13,13,0.85) 0%, rgba(13,13,13,0.4) 45%, transparent 75%)' }} />
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, rgba(255,44,145,0.18) 0%, transparent 50%)' }} />

      {/* Main content — pushes to bottom on mobile, centers on large */}
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
        <div className="mb-6 overflow-hidden">
          {['COUNTRY', 'NETBALL', 'CHAMPIONSHIPS'].map((word, i) => (
            <div key={word} className="overflow-hidden">
              <motion.span
                initial={{ y: '110%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 0.7, delay: 0.18 + i * 0.09, ease }}
                className="block font-display leading-[0.88] text-white"
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

        {/* The concept — single clear sentence each */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.55, ease }}
          className="mb-8 space-y-1"
        >
          <p className="font-semibold text-white leading-snug" style={{ fontSize: 'clamp(0.95rem, 2vw, 1.2rem)' }}>
            Your A Grade premiers compete for the national title.
          </p>
          <p className="font-semibold leading-snug" style={{ fontSize: 'clamp(0.95rem, 2vw, 1.2rem)', color: 'rgba(255,255,255,0.5)' }}>
            Your whole club comes to celebrate.
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
            className="btn-pink font-bold rounded-full"
            style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)', padding: 'clamp(0.9rem, 1.5vw, 1.1rem) clamp(2rem, 3vw, 3rem)' }}
          >
            Request an Invitation
          </motion.button>
          <motion.button
            whileHover={{ borderColor: '#ff2c91', color: '#ff2c91', y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (window.innerWidth < 1024) setDrawerOpen(true)
              else go('#experience')
            }}
            className="font-semibold rounded-full border-2 transition-all duration-200"
            style={{
              fontSize: 'clamp(0.875rem, 1.5vw, 1rem)',
              padding: 'clamp(0.9rem, 1.5vw, 1.1rem) clamp(1.8rem, 2.5vw, 2.5rem)',
              borderColor: 'rgba(255,255,255,0.28)',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            What's On
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
              className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full backdrop-blur-sm"
              style={
                gold
                  ? { background: 'rgba(244,193,77,0.15)', border: '1px solid rgba(244,193,77,0.4)', color: '#f4c14d' }
                  : pink
                  ? { background: 'rgba(255,44,145,0.15)', border: '1px solid rgba(255,44,145,0.4)', color: '#ff2c91' }
                  : { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }
              }
            >
              <Icon size={10} />
              {label}
            </span>
          ))}
        </motion.div>
      </div>
      <WhatsOnDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </section>
  )
}
