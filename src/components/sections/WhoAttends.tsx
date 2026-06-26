import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Trophy, Target, Briefcase, Heart, Users } from 'lucide-react'

const attendees = [
  {
    icon: Trophy,
    title: 'PLAYERS',
    desc: 'A Grade premiers competing for the national title.',
    color: '#ff2c91',
    bg: 'rgba(255,44,145,0.06)',
  },
  {
    icon: Target,
    title: 'COACHES',
    desc: 'Leading teams from across Australia.',
    color: '#f4c14d',
    bg: 'rgba(244,193,77,0.06)',
  },
  {
    icon: Briefcase,
    title: 'CLUB OFFICIALS',
    desc: 'Committee members and administrators.',
    color: '#4dd9f4',
    bg: 'rgba(77,217,244,0.06)',
  },
  {
    icon: Heart,
    title: 'FAMILIES',
    desc: 'Supporting the journey.',
    color: '#ff2c91',
    bg: 'rgba(255,44,145,0.06)',
  },
  {
    icon: Users,
    title: 'SUPPORTERS',
    desc: 'Celebrating the season together.',
    color: '#f4c14d',
    bg: 'rgba(244,193,77,0.06)',
  },
]

export default function WhoAttends() {
  const [hovered, setHovered] = useState<number | null>(null)
  const prefersReduced = useReducedMotion()

  return (
    <section id="who-attends" style={{ background: '#f5f4f0' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-20 lg:py-28">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
          className="mb-14"
        >
          <h2 className="font-display leading-none mb-4" style={{ fontSize: 'clamp(3.2rem, 8vw, 8rem)', color: '#111111' }}>
            THE WHOLE CLUB
          </h2>
          <p className="font-condensed font-semibold tracking-wide" style={{ fontSize: 'clamp(1rem, 1.8vw, 1.25rem)', color: 'rgba(17,17,17,0.45)' }}>
            Country netball is built by more than players alone.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {attendees.map(({ icon: Icon, title, desc, color, bg }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: prefersReduced ? 0 : i * 0.08, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
              onHoverStart={() => setHovered(i)}
              onHoverEnd={() => setHovered(null)}
              animate={{ y: hovered === i ? -6 : 0, transition: { duration: 0.25 } }}
              className="rounded-2xl p-6 flex flex-col cursor-default"
              style={{
                background: hovered === i ? bg : '#ffffff',
                border: `1px solid ${hovered === i ? `${color}30` : 'rgba(17,17,17,0.07)'}`,
                boxShadow: hovered === i
                  ? `0 12px 40px ${color}15, 0 4px 16px rgba(0,0,0,0.06)`
                  : '0 2px 12px rgba(0,0,0,0.04)',
                transition: 'background 0.3s, border-color 0.3s, box-shadow 0.3s',
              }}
            >
              {/* Accent line */}
              <div
                className="w-full h-0.5 mb-6 rounded-full"
                style={{ background: hovered === i ? color : 'rgba(17,17,17,0.08)', transition: 'background 0.3s' }}
              />

              {/* Icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                style={{
                  background: `${color}14`,
                  border: `1px solid ${color}25`,
                }}
              >
                <Icon size={17} style={{ color }} />
              </div>

              {/* Title */}
              <p className="font-condensed font-bold leading-none mb-2" style={{ fontSize: 'clamp(1.1rem, 2.2vw, 1.35rem)', color: '#111111', letterSpacing: '0.02em' }}>
                {title}
              </p>

              {/* Desc */}
              <p className="text-xs leading-relaxed mt-auto pt-1" style={{ color: 'rgba(17,17,17,0.5)' }}>
                {desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
