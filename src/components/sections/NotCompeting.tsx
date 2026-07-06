import { useState, useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Hotel, Eye, PartyPopper, Sun, Users, Trophy, ChevronRight } from 'lucide-react'

const features = [
  {
    icon: Hotel,
    emoji: '🏨',
    title: 'Group Accommodation Packages',
    desc: 'Stay together with teammates, families and supporters.',
    accent: '#ff2c91',
  },
  {
    icon: Eye,
    emoji: '🏐',
    title: "Watch Australia's Best Country Clubs",
    desc: 'Experience the national championship atmosphere live.',
    accent: '#f4c14d',
  },
  {
    icon: PartyPopper,
    emoji: '🎉',
    title: 'Celebrate Your Season',
    desc: "Make PlayFooty your club's annual end-of-season trip.",
    accent: '#ff2c91',
  },
  {
    icon: Sun,
    emoji: '☀️',
    title: 'Gold Coast Experience',
    desc: 'Theme parks, beaches, dining, entertainment and more.',
    accent: '#4dd9f4',
  },
  {
    icon: Users,
    emoji: '💗',
    title: 'Travel With Your Football Community',
    desc: 'Bring players, families, supporters and junior teams.',
    accent: '#f4c14d',
  },
  {
    icon: Trophy,
    emoji: '🏆',
    title: 'Be Part Of The Championship Weekend',
    desc: "Even if you're not competing, you're still part of the event.",
    accent: '#ff2c91',
  },
]

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function NotCompeting() {
  const [hovered, setHovered] = useState<number | null>(null)
  const prefersReduced = useReducedMotion()

  const go = useCallback((id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  return (
    <section id="club-travel" className="relative overflow-hidden" style={{ background: '#0d0d0d' }}>

      {/* Ambient background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,44,145,0.07) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-20 lg:py-28">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.75, ease }}
          className="mb-14 lg:mb-18"
        >
          {/* Label */}
          <p className="font-condensed font-bold tracking-[0.22em] text-xs uppercase mb-5" style={{ color: '#f4c14d' }}>
            Club Travel
          </p>

          {/* Headline */}
          <div className="grid lg:grid-cols-[5fr,4fr] gap-8 lg:gap-16 items-end">
            <h2 className="font-display text-white leading-none" style={{ fontSize: 'clamp(3rem, 8vw, 7.5rem)' }}>
              NOT COMPETING?<br /><span style={{ color: '#ff2c91' }}>STILL COME.</span>
            </h2>
            <div>
              <p className="font-condensed font-bold mb-3" style={{ fontSize: 'clamp(1rem, 1.8vw, 1.3rem)', color: 'rgba(255,255,255,0.6)', lineHeight: 1.3 }}>
                PlayFooty isn't just for the clubs chasing the national title.
              </p>
              <p className="leading-relaxed" style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.75 }}>
                While eligible A Grade premier clubs compete for the Community Football Championships Australia title, clubs from across Australia are encouraged to attend and be part of the championship weekend.
              </p>
              <p className="leading-relaxed mt-3" style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.75 }}>
                Whether your season ends with a premiership, a grand final loss, a finals campaign or simply a year worth celebrating, PlayFooty provides an opportunity for players, coaches, families and supporters to enjoy an unforgettable end-of-season trip on the Gold Coast.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Feature grid */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px"
          style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '1.5rem', overflow: 'hidden' }}
        >
          {features.map(({ icon: Icon, title, desc, accent }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.5, delay: prefersReduced ? 0 : i * 0.07, ease }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              animate={{ y: hovered === i ? -3 : 0, transition: { duration: 0.2, ease } }}
              className="relative flex flex-col p-7 lg:p-8 cursor-default min-w-0"
              style={{
                background: hovered === i ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                borderTop: `2px solid ${hovered === i ? accent : `${accent}30`}`,
                transition: 'background 0.25s, border-color 0.25s',
              }}
            >
              {/* Icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 shrink-0"
                style={{
                  background: hovered === i ? `${accent}20` : `${accent}0d`,
                  border: `1px solid ${accent}30`,
                  transition: 'background 0.25s',
                }}
              >
                <Icon size={16} style={{ color: accent }} />
              </div>

              {/* Title */}
              <h3
                className="font-display text-white leading-none mb-3"
                style={{ fontSize: 'clamp(1.1rem, 1.8vw, 1.45rem)', lineHeight: 1.0 }}
              >
                {title.toUpperCase()}
              </h3>

              {/* Accent line */}
              <div
                className="mb-3 shrink-0"
                style={{
                  height: '1px',
                  width: hovered === i ? '3rem' : '1.5rem',
                  background: accent,
                  opacity: hovered === i ? 0.7 : 0.3,
                  transition: 'width 0.3s, opacity 0.3s',
                }}
              />

              {/* Description */}
              <p
                className="text-xs leading-relaxed"
                style={{
                  color: hovered === i ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.3)',
                  transition: 'color 0.25s',
                }}
              >
                {desc}
              </p>

              {/* Radial glow on hover */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at 30% 0%, ${accent}10 0%, transparent 65%)`,
                  opacity: hovered === i ? 1 : 0,
                  transition: 'opacity 0.3s',
                }}
              />
            </motion.div>
          ))}
        </div>

        {/* CTA banner */}
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-30px' }}
          transition={{ duration: 0.7, delay: 0.2, ease }}
          className="mt-12 rounded-2xl overflow-hidden relative"
          style={{
            background: 'linear-gradient(135deg, rgba(255,44,145,0.15) 0%, rgba(255,44,145,0.05) 50%, rgba(244,193,77,0.08) 100%)',
            border: '1px solid rgba(255,44,145,0.2)',
          }}
        >
          {/* Subtle corner accent */}
          <div
            className="absolute top-0 right-0 w-64 h-64 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 100% 0%, rgba(255,44,145,0.12) 0%, transparent 65%)',
            }}
          />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 px-8 py-8 lg:px-10 lg:py-9">
            <div>
              <h3
                className="font-display text-white leading-none mb-2"
                style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.8rem)' }}
              >
                MAKE PlayFooty YOUR <span style={{ color: '#ff2c91' }}>2027 CLUB TRIP</span>
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 }}>
                Not every club will compete for the national title.<br className="hidden sm:block" />
                Every club is welcome to be part of the weekend.
              </p>
            </div>

            <button
              onClick={() => go('#invitation')}
              className="group inline-flex items-center gap-2.5 font-bold rounded-full shrink-0 transition-all duration-200"
              style={{
                background: '#ff2c91',
                color: '#ffffff',
                fontSize: '0.8125rem',
                padding: '0.9rem 2rem',
                letterSpacing: '0.06em',
                boxShadow: '0 8px 32px rgba(255,44,145,0.3)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#cc1f6e'
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(255,44,145,0.45)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#ff2c91'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(255,44,145,0.3)'
              }}
            >
              REGISTER INTEREST
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-200" />
            </button>
          </div>
        </motion.div>

      </div>
    </section>
  )
}
