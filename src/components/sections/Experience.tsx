import { useState } from 'react'
import { motion } from 'framer-motion'

const lineup = [
  { cat: 'COMPETE',   label: 'National Championship',      color: '#ff2c91' },
  { cat: 'SOCIAL',    label: 'Opening Function',           color: '#f4c14d' },
  { cat: 'SOUNDS',    label: 'Live Entertainment',         color: '#4dd9f4' },
  { cat: 'CELEBRATE', label: 'Awards Presentation',        color: '#ff2c91' },
  { cat: 'EAT',       label: 'Food Trucks & Festival Zone',color: '#f4c14d' },
  { cat: 'EXPLORE',   label: 'Gold Coast Experiences',     color: '#4dd9f4' },
  { cat: 'CAPTURED',  label: 'Professional Photography',   color: '#ff2c91' },
  { cat: 'LIVE',      label: 'Livestream Coverage',        color: '#f4c14d' },
  { cat: 'TRAVEL',    label: 'Club Travel Packages',       color: '#4dd9f4' },
]

export default function Experience() {
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <section id="experience" className="overflow-hidden" style={{ background: '#111111' }}>
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
              <div className="h-[3px] w-8 bg-[#ff2c91]" />
              <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-[#ff2c91]">The Championship</span>
            </div>
            <h2 className="font-display text-white leading-none" style={{ fontSize: 'clamp(2.8rem, 7vw, 6rem)' }}>
              THE CHAMPIONSHIP<br />EXPERIENCE
            </h2>
          </div>
          <p className="text-white/35 text-sm leading-relaxed max-w-xs pb-1">
            Four days of competition, celebration and connection on the Gold Coast.
          </p>
        </motion.div>

        {/* Festival lineup rows */}
        <div className="border-t border-white/10">
          {lineup.map(({ cat, label, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, x: -32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
              onHoverStart={() => setHovered(i)}
              onHoverEnd={() => setHovered(null)}
              className="group flex items-center justify-between py-5 sm:py-6 border-b border-white/10 cursor-default transition-colors duration-300"
              style={{ background: hovered === i ? `${color}0d` : 'transparent' }}
            >
              <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
                <span
                  className="font-bold text-[10px] tracking-[0.18em] uppercase w-5 text-right shrink-0 transition-colors duration-300"
                  style={{ color: hovered === i ? color : 'rgba(255,255,255,0.2)' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <motion.span
                  className="font-display leading-none truncate transition-colors duration-300"
                  style={{
                    fontSize: 'clamp(1.5rem, 3.5vw, 3rem)',
                    color: hovered === i ? color : '#ffffff',
                  }}
                >
                  {label.toUpperCase()}
                </motion.span>
              </div>
              <motion.span
                className="shrink-0 ml-4 text-[9px] font-bold tracking-[0.22em] uppercase px-3 py-1.5 rounded-full transition-all duration-300"
                style={{
                  color: hovered === i ? '#111111' : color,
                  background: hovered === i ? color : `${color}18`,
                  border: `1px solid ${color}40`,
                }}
              >
                {cat}
              </motion.span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
