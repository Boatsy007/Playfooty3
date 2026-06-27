import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Trophy, Star, Award, Music, Utensils, MapPin } from 'lucide-react'

const events = [
  {
    num: '01', icon: Trophy, color: '#ff2c91',
    title: 'National Championship',
    desc: "The country's best A Grade clubs competing for one national title.",
  },
  {
    num: '02', icon: Star, color: '#f4c14d',
    title: 'Opening Function',
    desc: 'A championship welcome bringing together clubs from across Australia.',
  },
  {
    num: '03', icon: Award, color: '#ff2c91',
    title: 'Awards Night',
    desc: 'Recognising outstanding players, coaches and clubs from the season.',
  },
  {
    num: '04', icon: Music, color: '#4dd9f4',
    title: 'Live Entertainment',
    desc: 'Music, atmosphere and entertainment throughout the championship weekend.',
  },
  {
    num: '05', icon: Utensils, color: '#f4c14d',
    title: 'Food & Festival Zone',
    desc: 'A central gathering place for players, families and supporters.',
  },
  {
    num: '06', icon: MapPin, color: '#4dd9f4',
    title: 'Gold Coast Experiences',
    desc: 'Beaches, attractions and unforgettable moments beyond the court.',
  },
]

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function TheWeekend() {
  const [hovered, setHovered] = useState<number | null>(null)
  const prefersReduced = useReducedMotion()

  return (
    <section id="the-weekend" style={{ background: '#0d0d0d' }}>

      {/* Photo band with headline overlay */}
      <div className="relative w-full overflow-hidden" style={{ height: 'clamp(260px, 42vw, 500px)' }}>
        <img
          src="/hero-photo.webp"
          alt="Championship action"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: '65% 28%' }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(13,13,13,0.1) 0%, rgba(13,13,13,0.0) 30%, rgba(13,13,13,1) 100%)' }} />
        <div className="absolute inset-x-0 bottom-0 px-6 sm:px-10 lg:px-16 pb-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease }}
            className="font-display text-white leading-none"
            style={{ fontSize: 'clamp(3rem, 9vw, 8.5rem)' }}
          >
            THE <span style={{ color: '#ff2c91' }}>CHAMPIONSHIP</span><br />EXPERIENCE
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15, ease }}
            className="mt-3 leading-relaxed"
            style={{ fontSize: 'clamp(0.85rem, 1.6vw, 1rem)', color: 'rgba(255,255,255,0.38)', maxWidth: '56ch' }}
          >
            Four days of competition, connection and celebration as Australia's leading country netball clubs come together on the Gold Coast.
          </motion.p>
        </div>
      </div>

      {/* Event cards — compact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {events.map(({ num, icon: Icon, color, title, desc }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.5, delay: prefersReduced ? 0 : i * 0.06, ease }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className="relative flex flex-col p-5 lg:p-6 cursor-default overflow-hidden"
            style={{
              borderTop: `2px solid ${hovered === i ? color : 'rgba(255,255,255,0.07)'}`,
              borderRight: '1px solid rgba(255,255,255,0.05)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              background: hovered === i ? `${color}08` : 'transparent',
              transition: 'border-color 0.25s, background 0.25s',
            }}
          >
            {/* Number + icon row */}
            <div className="flex items-center justify-between mb-4">
              <span
                className="font-condensed font-bold text-xs tracking-[0.18em] transition-colors duration-250"
                style={{ color: hovered === i ? color : 'rgba(255,255,255,0.22)' }}
              >
                {num}
              </span>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-250"
                style={{
                  background: hovered === i ? `${color}28` : `${color}12`,
                  border: `1px solid ${color}28`,
                }}
              >
                <Icon size={14} style={{ color }} />
              </div>
            </div>

            {/* Title */}
            <h3
              className="font-display leading-none mb-2 transition-colors duration-250"
              style={{
                fontSize: 'clamp(1.4rem, 2.8vw, 1.9rem)',
                color: hovered === i ? '#ffffff' : 'rgba(255,255,255,0.88)',
              }}
            >
              {title.toUpperCase()}
            </h3>

            {/* Description */}
            <p
              className="text-xs leading-relaxed transition-colors duration-250"
              style={{ color: hovered === i ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)' }}
            >
              {desc}
            </p>

            {/* Radial glow */}
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-300"
              style={{
                background: `radial-gradient(ellipse at 50% 0%, ${color}10 0%, transparent 65%)`,
                opacity: hovered === i ? 1 : 0,
              }}
            />
          </motion.div>
        ))}
      </div>
    </section>
  )
}
