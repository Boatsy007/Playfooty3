import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const roles = [
  { title: 'PLAYERS',   desc: "Compete against Australia's leading country clubs.",          accent: '#ff2c91' },
  { title: 'COACHES',   desc: 'Lead your club on the national stage.',                       accent: '#f4c14d' },
  { title: 'OFFICIALS', desc: 'Celebrate the season with your committee and volunteers.',    accent: '#4dd9f4' },
  { title: 'FAMILIES',  desc: 'Support your club and enjoy the Gold Coast.',                accent: '#ff2c91' },
  { title: 'SUPPORTERS',desc: 'Travel with your team and be part of the atmosphere.',       accent: '#f4c14d' },
]

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function WhyTravel() {
  const [hovered, setHovered] = useState<number | null>(null)
  const prefersReduced = useReducedMotion()

  return (
    <section style={{ background: '#f5f4f0' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 lg:py-24">

        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease }}
          className="mb-10"
        >
          <h2 className="font-display leading-none mb-4" style={{ fontSize: 'clamp(2.8rem, 7vw, 6.5rem)', color: '#111111' }}>
            MORE THAN A<br /><span style={{ color: '#ff2c91' }}>TEAM TRIP</span>
          </h2>
          <p className="leading-relaxed" style={{ fontSize: '0.95rem', color: 'rgba(17,17,17,0.45)', maxWidth: '56ch' }}>
            The Country Netball Championships is designed for more than players. Clubs travel together, celebrate together and create memories that last long after the final whistle.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {roles.map(({ title, desc, accent }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.5, delay: prefersReduced ? 0 : i * 0.08, ease }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className="relative flex flex-col p-5 rounded-xl cursor-default overflow-hidden"
              style={{
                background: hovered === i ? '#111111' : '#ffffff',
                borderTop: `2px solid ${hovered === i ? accent : 'rgba(17,17,17,0.1)'}`,
                boxShadow: hovered === i
                  ? `0 8px 32px rgba(0,0,0,0.18)`
                  : '0 1px 8px rgba(0,0,0,0.05)',
                transition: 'background 0.25s, border-color 0.25s, box-shadow 0.25s',
              }}
            >
              <h3
                className="font-display leading-none mb-3 transition-colors duration-250"
                style={{
                  fontSize: 'clamp(1.4rem, 2.5vw, 1.9rem)',
                  color: hovered === i ? '#ffffff' : '#111111',
                }}
              >
                {title}
              </h3>
              <p
                className="text-xs leading-relaxed transition-colors duration-250"
                style={{ color: hovered === i ? 'rgba(255,255,255,0.45)' : 'rgba(17,17,17,0.45)' }}
              >
                {desc}
              </p>

              {/* Pink accent line bottom */}
              <div
                className="absolute bottom-0 left-0 h-[2px] rounded-full transition-all duration-300"
                style={{
                  background: accent,
                  width: hovered === i ? '60%' : '0%',
                }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
