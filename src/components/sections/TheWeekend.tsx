import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Trophy, Star, Music, Award, Camera, Tv, MapPin, Utensils } from 'lucide-react'

const events = [
  { icon: Trophy,   title: 'National Championship',   desc: 'A Grade premiers compete for the national title.', color: '#ff2c91' },
  { icon: Star,     title: 'Opening Function',         desc: 'A celebration to kick off the championship weekend.', color: '#f4c14d' },
  { icon: Music,    title: 'Live Entertainment',       desc: 'Performances and music across the four days.', color: '#4dd9f4' },
  { icon: Award,    title: 'Awards Presentation',      desc: 'The national champion is crowned in style.', color: '#ff2c91' },
  { icon: Camera,   title: 'Professional Photography', desc: 'Every moment captured by professional photographers.', color: '#f4c14d' },
  { icon: Tv,       title: 'Livestream Coverage',      desc: 'Key matches broadcast live across Australia.', color: '#4dd9f4' },
  { icon: MapPin,   title: 'Gold Coast Experiences',   desc: 'Beaches, dining and world-class attractions nearby.', color: '#ff2c91' },
  { icon: Utensils, title: 'Festival Food Zone',       desc: 'Food trucks and market stalls throughout the event.', color: '#f4c14d' },
]

export default function TheWeekend() {
  const [hovered, setHovered] = useState<number | null>(null)
  const prefersReduced = useReducedMotion()

  return (
    <section id="the-weekend" style={{ background: '#0d0d0d' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-20 lg:py-28">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
          className="mb-14"
        >
          <h2 className="font-display text-white leading-none mb-4" style={{ fontSize: 'clamp(3.5rem, 9vw, 9rem)' }}>
            THE WEEKEND
          </h2>
          <p className="font-condensed font-semibold tracking-wide" style={{ fontSize: 'clamp(1rem, 1.8vw, 1.25rem)', color: 'rgba(255,255,255,0.45)' }}>
            Four days of competition, celebration and connection.
          </p>
        </motion.div>

        {/* Card grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {events.map(({ icon: Icon, title, desc, color }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: prefersReduced ? 0 : 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55, delay: prefersReduced ? 0 : i * 0.07, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
              onHoverStart={() => setHovered(i)}
              onHoverEnd={() => setHovered(null)}
              animate={{
                y: hovered === i ? -6 : 0,
                transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
              }}
              className="relative rounded-2xl p-6 flex flex-col cursor-default overflow-hidden"
              style={{
                background: hovered === i ? `${color}10` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${hovered === i ? `${color}40` : 'rgba(255,255,255,0.07)'}`,
                transition: 'background 0.3s, border-color 0.3s',
              }}
            >
              {/* Glow */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 50% 0%, ${color}18 0%, transparent 70%)`,
                  opacity: hovered === i ? 1 : 0,
                  transition: 'opacity 0.3s',
                }}
              />

              {/* Icon */}
              <div
                className="relative w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                style={{
                  background: hovered === i ? `${color}22` : `${color}12`,
                  border: `1px solid ${color}30`,
                  transition: 'background 0.3s',
                }}
              >
                <Icon size={18} style={{ color }} />
              </div>

              {/* Title */}
              <p className="font-display text-white leading-none mb-2 relative" style={{ fontSize: 'clamp(1.1rem, 2.2vw, 1.4rem)' }}>
                {title.toUpperCase()}
              </p>

              {/* Desc */}
              <p className="text-xs leading-relaxed mt-auto pt-2 relative" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
