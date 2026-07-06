import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const experiences = [
  {
    num: '01',
    title: 'Surfers Paradise',
    sub: 'Iconic Beach Destination',
    desc: "The Gold Coast's world-famous strip — white sand beaches, surf, cafes and an electric atmosphere that becomes home base for the championship weekend.",
    accent: '#4dd9f4',
  },
  {
    num: '02',
    title: 'Theme Parks',
    sub: 'World-Class Attractions',
    desc: 'Movie World, Dreamworld, Sea World, Wet\'n\'Wild — all within 30 minutes. The perfect day out for families, kids and anyone who wants to extend the adventure beyond the courts.',
    accent: '#f4c14d',
  },
  {
    num: '03',
    title: 'TopGolf Gold Coast',
    sub: 'Group Entertainment',
    desc: 'Multi-level driving range with food, drinks and serious fun. The go-to for club nights out — whether you play golf or not.',
    accent: '#ff2c91',
  },
  {
    num: '04',
    title: 'Dining & Nightlife',
    sub: 'Food & Entertainment',
    desc: "From beachside breakfast spots to rooftop bars and award-winning restaurants — the Gold Coast's dining scene matches any major city.",
    accent: '#4dd9f4',
  },
  {
    num: '05',
    title: 'Pacific Fair',
    sub: "Australia's Largest Shopping Centre",
    desc: 'Over 400 stores, restaurants and entertainment options — minutes from the championship precinct. A full day for any group.',
    accent: '#f4c14d',
  },
  {
    num: '06',
    title: 'Gold Coast Hinterland',
    sub: 'Natural Escape',
    desc: 'Escape to the ancient Lamington National Park rainforest — waterfalls, glowworms and breathtaking views. Thirty minutes from the coast.',
    accent: '#ff2c91',
  },
]

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function GoldCoast() {
  const [hovered, setHovered] = useState<number | null>(null)
  const prefersReduced = useReducedMotion()

  return (
    <section id="gold-coast" className="relative overflow-hidden" style={{ background: '#f5f4f0' }}>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-16 lg:pt-24 pb-0">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.75, ease }}
          className="mb-12 lg:mb-16"
        >
          <p className="font-condensed font-bold tracking-[0.22em] text-xs uppercase mb-5" style={{ color: '#f4c14d' }}>
            The Destination
          </p>
          <div className="grid lg:grid-cols-[5fr,4fr] gap-8 lg:gap-16 items-end">
            <h2 className="font-display leading-none" style={{ fontSize: 'clamp(3rem, 8vw, 8rem)', color: '#111111' }}>
              GOLD COAST,<br /><span style={{ color: '#ff2c91' }}>QUEENSLAND.</span>
            </h2>
            <div>
              <p style={{ fontSize: 'clamp(1rem, 1.6vw, 1.15rem)', color: 'rgba(17,17,17,0.55)', lineHeight: 1.65, fontWeight: 500 }}>
                Australia's premier holiday destination is the host of the inaugural PlayFooty championship — and there's never been a better reason to visit.
              </p>
            </div>
          </div>
        </motion.div>

      </div>

      {/* Full-bleed experience grid */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        style={{ borderTop: '1px solid rgba(17,17,17,0.07)' }}
      >
        {experiences.map(({ num, title, sub, desc, accent }, i) => (
          <motion.div
            key={num}
            initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.55, delay: prefersReduced ? 0 : i * 0.07, ease }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            animate={{ y: hovered === i ? -3 : 0, transition: { duration: 0.2, ease } }}
            className="flex flex-col px-8 py-10 lg:py-12 cursor-default"
            style={{
              borderTop: `3px solid ${hovered === i ? accent : `${accent}45`}`,
              borderRight: i % 3 !== 2 ? '1px solid rgba(17,17,17,0.07)' : 'none',
              background: hovered === i ? '#ffffff' : 'transparent',
              boxShadow: hovered === i ? '0 8px 40px rgba(0,0,0,0.07)' : 'none',
              transition: 'background 0.25s, box-shadow 0.25s, border-color 0.25s',
            }}
          >
            <span
              className="font-condensed font-bold text-[10px] tracking-[0.3em] uppercase mb-4 block"
              style={{ color: `${accent}99` }}
            >
              {num}
            </span>
            <h3
              className="font-display leading-none mb-1"
              style={{ fontSize: 'clamp(1.3rem, 2.5vw, 2rem)', color: '#111111', lineHeight: 0.92 }}
            >
              {title.toUpperCase()}
            </h3>
            <span
              className="font-condensed font-bold text-[10px] tracking-[0.2em] uppercase mb-4 block"
              style={{ color: 'rgba(17,17,17,0.35)' }}
            >
              {sub}
            </span>
            <div className="mb-4" style={{ height: '1px', width: '2rem', background: accent, opacity: 0.4 }} />
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(17,17,17,0.5)' }}>
              {desc}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Bottom banner */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease }}
        className="relative overflow-hidden"
        style={{ background: '#111111' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 100% at 100% 50%, rgba(255,44,145,0.08) 0%, transparent 70%)' }}
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-8 py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="font-display text-white leading-none" style={{ fontSize: 'clamp(1.2rem, 2.5vw, 2rem)' }}>
            PlayFooty IS YOUR REASON TO MAKE THE TRIP.
          </p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', maxWidth: '40ch', lineHeight: 1.7 }}>
            The Gold Coast is always a good idea. The national championship makes it unmissable.
          </p>
        </div>
      </motion.div>

    </section>
  )
}
