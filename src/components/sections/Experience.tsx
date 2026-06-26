import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const lineup = [
  { cat: 'COMPETE',   label: 'National Championship' },
  { cat: 'SOCIAL',    label: 'Opening Function' },
  { cat: 'SOUNDS',    label: 'Live Entertainment' },
  { cat: 'CELEBRATE', label: 'Awards Presentation' },
  { cat: 'EAT',       label: 'Food Trucks & Festival Zone' },
  { cat: 'EXPLORE',   label: 'Gold Coast Experiences' },
  { cat: 'CAPTURED',  label: 'Professional Photography' },
  { cat: 'LIVE',      label: 'Livestream Coverage' },
  { cat: 'TRAVEL',    label: 'Club Travel Packages' },
]

export default function Experience() {
  const [hovered, setHovered] = useState<number | null>(null)
  const prefersReduced = useReducedMotion()

  return (
    <section id="experience" className="overflow-hidden" style={{ background: '#ff2c91' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-20 lg:py-28">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12"
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-[3px] w-8 bg-white" />
              <span className="font-condensed font-bold text-sm tracking-[0.2em] uppercase text-white/75">The Championship</span>
            </div>
            <h2 className="font-display text-white leading-none" style={{ fontSize: 'clamp(2.8rem, 7vw, 6rem)' }}>
              THE CHAMPIONSHIP<br />EXPERIENCE
            </h2>
          </div>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs pb-1">
            Four days of competition, celebration and connection on the Gold Coast.
          </p>
        </motion.div>

        {/* Festival lineup rows */}
        <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.25)' }}>
          {lineup.map(({ cat, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, x: prefersReduced ? 0 : -32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: prefersReduced ? 0.01 : 0.55, delay: prefersReduced ? 0 : i * 0.06, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
              onHoverStart={() => setHovered(i)}
              onHoverEnd={() => setHovered(null)}
              className="group flex items-center justify-between py-5 sm:py-6 border-b cursor-default transition-all duration-300"
              style={{
                borderColor: 'rgba(255,255,255,0.2)',
                background: hovered === i ? 'rgba(255,255,255,0.12)' : 'transparent',
                marginLeft: hovered === i ? '8px' : '0px',
                paddingLeft: hovered === i ? '12px' : '0px',
              }}
            >
              <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
                <span className="font-condensed font-bold text-xs tracking-[0.18em] uppercase w-5 text-right shrink-0"
                  style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className="font-display leading-none truncate transition-all duration-300"
                  style={{
                    fontSize: 'clamp(1.5rem, 3.5vw, 3rem)',
                    color: hovered === i ? '#ffffff' : 'rgba(255,255,255,0.85)',
                  }}
                >
                  {label.toUpperCase()}
                </span>
              </div>
              <span
                className="shrink-0 ml-4 font-condensed font-bold text-xs tracking-[0.18em] uppercase px-3 py-1.5 rounded-full transition-all duration-300"
                style={{
                  color: hovered === i ? '#ff2c91' : 'rgba(255,255,255,0.8)',
                  background: hovered === i ? '#ffffff' : 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                }}
              >
                {cat}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
