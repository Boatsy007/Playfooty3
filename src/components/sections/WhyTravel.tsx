import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Users, Target, Briefcase, Heart, Star } from 'lucide-react'

const roles = [
  { icon: Users,     title: 'A GRADE PLAYERS', desc: "Australia's leading country premiership teams competing for one national title.", accent: '#ff2c91', span: false },
  { icon: Target,    title: 'COACHES',          desc: 'Coaching groups leading their clubs onto a national stage.',                    accent: '#f4c14d', span: false },
  { icon: Briefcase, title: 'CLUB OFFICIALS',   desc: 'The committee members, volunteers and administrators who keep Community Football moving.', accent: '#ff2c91', span: false },
  { icon: Heart,     title: 'FAMILIES',         desc: 'A Gold Coast championship weekend built around the people who support the players all season.', accent: '#4dd9f4', span: false },
  { icon: Star,      title: 'SUPPORTERS',       desc: 'Club supporters travelling together, celebrating together and creating the event atmosphere.', accent: '#f4c14d', span: true },
]

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function WhyTravel() {
  const [hovered, setHovered] = useState<number | null>(null)
  const prefersReduced = useReducedMotion()

  return (
    <section id="who-attends" style={{ background: '#f5f4f0' }}>
      {/* Heading — mirrors Stats heading padding */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-14 lg:pt-20 pb-10">
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease }}
        >
          {/* Section label — matches gold condensed label style used across the site */}
          <p className="font-condensed font-bold tracking-[0.22em] text-xs uppercase mb-5" style={{ color: '#f4c14d' }}>
            Who Attends
          </p>
          <h2 className="font-display leading-none mb-4" style={{ fontSize: 'clamp(3rem, 7vw, 6rem)', color: '#111111' }}>
            MORE THAN A<br /><span style={{ color: '#ff2c91' }}>CHAMPIONSHIP.</span>
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'rgba(17,17,17,0.45)', maxWidth: '52ch' }}>
            A national A Grade championship built for the clubs, families and communities behind the game.
          </p>
        </motion.div>
      </div>

      {/* Grid — same border treatment as Stats tiles */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4"
        style={{ borderTop: '1px solid rgba(17,17,17,0.07)' }}
      >
        {roles.slice(0, 4).map(({ icon: Icon, title, desc, accent }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: prefersReduced ? 0 : i * 0.1, ease }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            animate={{ y: hovered === i ? -3 : 0, transition: { duration: 0.2, ease } }}
            className="flex flex-col px-6 sm:px-8 py-8 lg:py-10 cursor-default"
            style={{
              borderTop: `4px solid ${accent}`,
              borderRight: i % 2 === 0 ? '1px solid rgba(17,17,17,0.08)' : 'none',
              background: hovered === i ? '#ffffff' : 'transparent',
              boxShadow: hovered === i ? '0 4px 24px rgba(0,0,0,0.06)' : 'none',
              transition: 'background 0.25s, box-shadow 0.25s',
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-4"
              style={{
                background: `${accent}15`,
                border: `1px solid ${accent}30`,
              }}
            >
              <Icon size={13} style={{ color: accent }} />
            </div>
            <span
              className="font-display leading-none mb-2 block"
              style={{ fontSize: 'clamp(1.15rem, 2.2vw, 1.55rem)', color: '#111111', lineHeight: 0.9 }}
            >
              {title}
            </span>
            <span
              className="font-condensed font-bold text-[10px] tracking-[0.22em] uppercase mb-3 block"
              style={{ color: `${accent}cc` }}
            >
              {title === 'A GRADE PLAYERS' ? 'Championship Competitors' :
               title === 'COACHES' ? 'National Stage' :
               title === 'CLUB OFFICIALS' ? 'Community Football' :
               'Gold Coast'}
            </span>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(17,17,17,0.42)' }}>
              {desc}
            </p>
          </motion.div>
        ))}

        {/* Supporters — full width bottom row */}
        {(() => {
          const { icon: Icon, title, desc, accent } = roles[4]
          return (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: prefersReduced ? 0 : 0.4, ease }}
              onMouseEnter={() => setHovered(4)}
              onMouseLeave={() => setHovered(null)}
              animate={{ y: hovered === 4 ? -3 : 0, transition: { duration: 0.2, ease } }}
              className="col-span-2 lg:col-span-4 flex flex-col sm:flex-row sm:items-center gap-6 px-6 sm:px-8 py-8 lg:py-10 cursor-default"
              style={{
                borderTop: `4px solid ${accent}`,
                background: hovered === 4 ? '#ffffff' : 'transparent',
                boxShadow: hovered === 4 ? '0 4px 24px rgba(0,0,0,0.06)' : 'none',
                transition: 'background 0.25s, box-shadow 0.25s',
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: `${accent}15`,
                  border: `1px solid ${accent}30`,
                }}
              >
                <Icon size={13} style={{ color: accent }} />
              </div>
              <div className="flex-1">
                <span
                  className="font-display leading-none mb-1 block"
                  style={{ fontSize: 'clamp(1.15rem, 2.2vw, 1.55rem)', color: '#111111', lineHeight: 0.9 }}
                >
                  {title}
                </span>
                <span
                  className="font-condensed font-bold text-[10px] tracking-[0.22em] uppercase block mt-1 mb-2"
                  style={{ color: `${accent}cc` }}
                >
                  Club Travel
                </span>
              </div>
              <p className="text-xs leading-relaxed sm:max-w-[44ch]" style={{ color: 'rgba(17,17,17,0.42)' }}>
                {desc}
              </p>
            </motion.div>
          )
        })()}
      </div>

      {/* Ticker-style footer */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3, ease }}
        className="max-w-6xl mx-auto px-4 sm:px-8 py-8"
        style={{ borderTop: '1px solid rgba(17,17,17,0.07)' }}
      >
        <p className="font-condensed font-bold text-[11px] tracking-[0.28em] uppercase text-center" style={{ color: 'rgba(17,17,17,0.3)' }}>
          Players&nbsp;&nbsp;•&nbsp;&nbsp;Coaches&nbsp;&nbsp;•&nbsp;&nbsp;Officials&nbsp;&nbsp;•&nbsp;&nbsp;Families&nbsp;&nbsp;•&nbsp;&nbsp;Supporters
        </p>
      </motion.div>
    </section>
  )
}
