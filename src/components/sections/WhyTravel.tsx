import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Users, Target, Briefcase, Heart, Star } from 'lucide-react'

const roles = [
  { icon: Users,     title: 'PLAYERS',    desc: "Compete against Australia's leading country clubs." },
  { icon: Target,    title: 'COACHES',    desc: 'Lead your club on the national stage.' },
  { icon: Briefcase, title: 'OFFICIALS',  desc: 'Celebrate the season with the volunteers and committee members who made it possible.' },
  { icon: Heart,     title: 'FAMILIES',   desc: 'Turn the championship into a Gold Coast getaway.' },
  { icon: Star,      title: 'SUPPORTERS', desc: 'Travel with your club and be part of the atmosphere.' },
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
          {roles.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.5, delay: prefersReduced ? 0 : i * 0.08, ease }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              animate={{ y: hovered === i ? -4 : 0, transition: { duration: 0.22, ease } }}
              className="relative flex flex-col p-5 rounded-2xl cursor-default overflow-hidden"
              style={{
                background: '#0a0a0a',
                borderTop: `2px solid ${hovered === i ? '#ff2c91' : 'rgba(255,44,145,0.25)'}`,
                boxShadow: hovered === i
                  ? '0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,44,145,0.12)'
                  : '0 2px 12px rgba(0,0,0,0.2)',
                transition: 'border-color 0.25s, box-shadow 0.25s',
              }}
            >
              {/* Icon */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 transition-all duration-250"
                style={{
                  background: hovered === i ? 'rgba(255,44,145,0.18)' : 'rgba(255,44,145,0.08)',
                  border: '1px solid rgba(255,44,145,0.22)',
                }}
              >
                <Icon size={15} style={{ color: '#ff2c91' }} />
              </div>

              {/* Title */}
              <h3
                className="font-display text-white leading-none mb-2"
                style={{ fontSize: 'clamp(1.35rem, 2.4vw, 1.8rem)' }}
              >
                {title}
              </h3>

              {/* Description */}
              <p
                className="text-xs leading-relaxed transition-colors duration-250"
                style={{ color: hovered === i ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)' }}
              >
                {desc}
              </p>

              {/* Radial glow on hover */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300"
                style={{
                  background: 'radial-gradient(ellipse at 50% 0%, rgba(255,44,145,0.1) 0%, transparent 70%)',
                  opacity: hovered === i ? 1 : 0,
                }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
