import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const events = [
  { num: '01', title: 'National Championship' },
  { num: '02', title: 'Opening Function' },
  { num: '03', title: 'Awards Night' },
  { num: '04', title: 'Live Entertainment' },
  { num: '05', title: 'Festival Food Zone' },
  { num: '06', title: 'future host city Experiences' },
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

      {/* Overlays */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(13,13,13,0.75) 0%, rgba(13,13,13,0.05) 40%, rgba(13,13,13,0.93) 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(13,13,13,0.5) 0%, transparent 60%)' }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-between flex-1 px-5 sm:px-10 lg:px-16 pt-14 sm:pt-16 lg:pt-24 pb-10 sm:pb-12 lg:pb-20">

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.75, ease }}
          className="max-w-4xl"
        >
          <p className="font-condensed font-bold tracking-[0.28em] text-xs uppercase mb-5" style={{ color: '#f4c14d' }}>
            future host city · Date TBC
          </p>
          <h2 className="font-display text-white leading-none mb-5" style={{ fontSize: 'clamp(3rem, 9vw, 9rem)' }}>
            THE <span style={{ color: '#d71920' }}>EVENT</span><br />EXPERIENCE
          </h2>
          <p className="leading-relaxed" style={{ fontSize: 'clamp(0.85rem, 1.5vw, 1rem)', color: 'rgba(255,255,255,0.45)', maxWidth: '52ch' }}>
            Four days of championship football, club celebrations and future host city experiences. More than a tournament, this is the annual gathering of Australia's community football community.
          </p>
        </motion.div>

        {/* Championship highlights — text grid */}
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7, delay: 0.2, ease }}
          className="grid grid-cols-2 lg:grid-cols-3 mt-6 lg:mt-auto"
        >
          {events.map(({ num, title }, i) => (
            <div
              key={title}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className="py-4 sm:py-5 pr-4 sm:pr-6 cursor-default"
              style={{
                borderTop: `1px solid ${hovered === i ? 'rgba(215,25,32,0.65)' : 'rgba(255,255,255,0.15)'}`,
                transition: 'border-color 0.25s',
              }}
            >
              <span
                className="font-condensed font-bold tracking-[0.2em] block mb-2 transition-colors duration-250"
                style={{ fontSize: '0.7rem', color: hovered === i ? '#d71920' : 'rgba(255,255,255,0.38)' }}
              >
                {num}
              </span>
              <span
                className="font-display leading-none block transition-colors duration-250"
                style={{
                  fontSize: 'clamp(1.3rem, 2.6vw, 1.85rem)',
                  color: hovered === i ? '#ffffff' : 'rgba(255,255,255,0.82)',
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
