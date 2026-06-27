import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Trophy, Star, Award, Music, Utensils, MapPin } from 'lucide-react'

const events = [
  {
    num: '01', icon: Trophy, color: '#ff2c91',
    title: 'National Championship',
    desc: "Australia's leading A Grade country clubs compete for one national title.",
  },
  {
    num: '02', icon: Star, color: '#f4c14d',
    title: 'Opening Function',
    desc: 'Clubs from across Australia come together to launch championship weekend.',
  },
  {
    num: '03', icon: Award, color: '#ff2c91',
    title: 'Awards Night',
    desc: 'Celebrate the players, coaches and clubs that define the season.',
  },
  {
    num: '04', icon: Music, color: '#4dd9f4',
    title: 'Live Entertainment',
    desc: 'Music, atmosphere and celebration throughout the championship.',
  },
  {
    num: '05', icon: Utensils, color: '#f4c14d',
    title: 'Food & Festival Zone',
    desc: 'A central meeting place for players, families and supporters.',
  },
  {
    num: '06', icon: MapPin, color: '#4dd9f4',
    title: 'Gold Coast Experiences',
    desc: 'Extend the trip and enjoy everything the Gold Coast has to offer.',
  },
]

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function TheWeekend() {
  const [hovered, setHovered] = useState<number | null>(null)
  const prefersReduced = useReducedMotion()

  return (
    <section id="the-weekend" style={{ background: '#0d0d0d' }}>

      {/* Photo band */}
      <div className="relative w-full overflow-hidden" style={{ height: 'clamp(260px, 42vw, 500px)' }}>
        <img
          src="/hero-photo.webp"
          alt="Championship action"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: '65% 28%' }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(13,13,13,0.1) 0%, rgba(13,13,13,0.0) 35%, rgba(13,13,13,1) 100%)' }} />
        <div className="absolute inset-x-0 bottom-0 px-6 sm:px-10 lg:px-16 pb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease }}
            className="font-display text-white leading-none"
            style={{ fontSize: 'clamp(3.5rem, 10vw, 9rem)' }}
          >
            THE <span style={{ color: '#ff2c91' }}>WEEKEND</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15, ease }}
            className="font-condensed font-semibold tracking-wide mt-2"
            style={{ fontSize: 'clamp(0.9rem, 1.8vw, 1.1rem)', color: 'rgba(255,255,255,0.4)' }}
          >
            Four days of competition, celebration and unforgettable country netball moments.
          </motion.p>
        </div>
      </div>

      {/* Event cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {events.map(({ num, icon: Icon, color, title, desc }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.55, delay: prefersReduced ? 0 : i * 0.07, ease }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className="relative flex flex-col p-8 lg:p-10 cursor-default overflow-hidden"
            style={{
              borderTop: `3px solid ${hovered === i ? color : 'rgba(255,255,255,0.07)'}`,
              borderRight: '1px solid rgba(255,255,255,0.05)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              background: hovered === i ? `${color}08` : 'transparent',
              transition: 'border-color 0.3s, background 0.3s',
            }}
          >
            {/* Number */}
            <span
              className="font-condensed font-bold text-xs tracking-[0.18em] mb-6 block transition-colors duration-300"
              style={{ color: hovered === i ? color : 'rgba(255,255,255,0.2)' }}
            >
              {num}
            </span>

            {/* Icon */}
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-6 transition-all duration-300"
              style={{
                background: hovered === i ? `${color}25` : `${color}12`,
                border: `1px solid ${color}30`,
              }}
            >
              <Icon size={18} style={{ color }} />
            </div>

            {/* Title */}
            <h3
              className="font-display text-white leading-none mb-3 transition-colors duration-300"
              style={{
                fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                color: hovered === i ? '#ffffff' : 'rgba(255,255,255,0.85)',
              }}
            >
              {title.toUpperCase()}
            </h3>

            {/* Description */}
            <p
              className="text-sm leading-relaxed transition-colors duration-300"
              style={{ color: hovered === i ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.28)' }}
            >
              {desc}
            </p>

            {/* Glow on hover */}
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-300"
              style={{
                background: `radial-gradient(ellipse at 50% 0%, ${color}12 0%, transparent 70%)`,
                opacity: hovered === i ? 1 : 0,
              }}
            />
          </motion.div>
        ))}
      </div>
    </section>
  )
}
