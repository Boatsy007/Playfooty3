import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const events = [
  { num: '01', title: 'National Championship' },
  { num: '02', title: 'Opening Function' },
  { num: '03', title: 'Awards Night' },
  { num: '04', title: 'Live Entertainment' },
  { num: '05', title: 'Festival Food Zone' },
  { num: '06', title: 'Gold Coast Experiences' },
]

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function TheWeekend() {
  const [hovered, setHovered] = useState<number | null>(null)
  const prefersReduced = useReducedMotion()

  return (
    <section
      id="the-weekend"
      className="relative overflow-hidden flex flex-col"
      style={{ minHeight: 'clamp(680px, 92vh, 1100px)', background: '#0d0d0d' }}
    >
      {/* Full-bleed photo */}
      <img
        src="/hero-photo.webp"
        alt="Championship action"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: '65% 30%' }}
      />

      {/* Overlays — dark top and bottom, open middle */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(13,13,13,0.75) 0%, rgba(13,13,13,0.05) 40%, rgba(13,13,13,0.92) 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(13,13,13,0.5) 0%, transparent 60%)' }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-between flex-1 px-6 sm:px-10 lg:px-16 pt-16 lg:pt-24 pb-12 lg:pb-20">

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.75, ease }}
          className="max-w-4xl"
        >
          <p className="font-condensed font-bold tracking-[0.28em] text-xs uppercase mb-6" style={{ color: '#f4c14d' }}>
            Gold Coast · 5–8 November 2026
          </p>
          <h2 className="font-display text-white leading-none mb-5" style={{ fontSize: 'clamp(3.2rem, 9vw, 9rem)' }}>
            THE <span style={{ color: '#ff2c91' }}>CHAMPIONSHIP</span><br />EXPERIENCE
          </h2>
          <p className="leading-relaxed" style={{ fontSize: 'clamp(0.9rem, 1.6vw, 1.05rem)', color: 'rgba(255,255,255,0.38)', maxWidth: '52ch' }}>
            Four days of competition, connection and celebration as Australia's leading country netball clubs come together on the Gold Coast.
          </p>
        </motion.div>

        {/* Championship highlights — text grid, no cards */}
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7, delay: 0.2, ease }}
          className="grid grid-cols-2 lg:grid-cols-3 mt-auto"
        >
          {events.map(({ num, title }, i) => (
            <div
              key={title}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className="py-5 pr-6 cursor-default"
              style={{
                borderTop: `1px solid ${hovered === i ? 'rgba(255,44,145,0.6)' : 'rgba(255,255,255,0.14)'}`,
                transition: 'border-color 0.25s',
              }}
            >
              <span
                className="font-condensed font-bold text-[10px] tracking-[0.22em] uppercase block mb-2 transition-colors duration-250"
                style={{ color: hovered === i ? '#ff2c91' : 'rgba(255,255,255,0.28)' }}
              >
                {num}
              </span>
              <span
                className="font-display leading-none block transition-colors duration-250"
                style={{
                  fontSize: 'clamp(1.2rem, 2.4vw, 1.75rem)',
                  color: hovered === i ? '#ffffff' : 'rgba(255,255,255,0.75)',
                }}
              >
                {title.toUpperCase()}
              </span>
            </div>
          ))}
        </motion.div>

      </div>
    </section>
  )
}
