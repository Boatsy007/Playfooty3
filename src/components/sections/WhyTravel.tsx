import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Users, Target, Briefcase, Heart, Star } from 'lucide-react'

const roles = [
  { icon: Users,     title: 'A GRADE\nPLAYERS',   desc: "Australia's leading country premiership teams competing for one national title." },
  { icon: Target,    title: 'COACHES',             desc: 'Coaching groups leading their clubs onto a national stage.' },
  { icon: Briefcase, title: 'CLUB\nOFFICIALS',    desc: 'The committee members, volunteers and administrators who keep country netball moving.' },
  { icon: Heart,     title: 'FAMILIES',            desc: 'A Gold Coast championship weekend built around the people who support the players all season.' },
  { icon: Star,      title: 'SUPPORTERS',          desc: 'Club supporters travelling together, celebrating together and creating the event atmosphere.' },
]

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function WhyTravel() {
  const [hovered, setHovered] = useState<number | null>(null)
  const prefersReduced = useReducedMotion()

  return (
    <section style={{ background: '#f5f4f0' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-14 lg:py-22">

        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease }}
          className="mb-10"
        >
          <h2 className="font-display leading-none mb-4" style={{ fontSize: 'clamp(2.8rem, 7vw, 6.5rem)', color: '#111111' }}>
            MORE THAN A<br /><span style={{ color: '#ff2c91' }}>CHAMPIONSHIP.</span>
          </h2>
          <p className="leading-relaxed" style={{ fontSize: '0.95rem', color: 'rgba(17,17,17,0.45)', maxWidth: '56ch' }}>
            A national A Grade championship built for the clubs, families and communities behind the game.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {roles.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.55, delay: prefersReduced ? 0 : i * 0.08, ease }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              animate={{ y: hovered === i ? -5 : 0, transition: { duration: 0.22, ease } }}
              className="relative flex flex-col p-5 sm:p-6 rounded-2xl cursor-default"
              style={{
                background: '#ffffff',
                borderTop: `3px solid ${hovered === i ? '#ff2c91' : 'rgba(255,44,145,0.3)'}`,
                boxShadow: hovered === i
                  ? '0 16px 48px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)'
                  : '0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
                transition: 'border-color 0.25s, box-shadow 0.25s',
              }}
            >
              {/* Icon */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                style={{
                  background: hovered === i ? 'rgba(255,44,145,0.12)' : 'rgba(255,44,145,0.07)',
                  border: '1px solid rgba(255,44,145,0.18)',
                  transition: 'background 0.25s',
                }}
              >
                <Icon size={15} style={{ color: '#ff2c91' }} />
              </div>

              {/* Title */}
              <h3
                className="font-display leading-none mb-3"
                style={{ fontSize: 'clamp(1.2rem, 2.2vw, 1.6rem)', color: '#111111', whiteSpace: 'pre-line' }}
              >
                {title}
              </h3>

              {/* Gold divider */}
              <div className="mb-3" style={{ height: '1px', background: 'rgba(244,193,77,0.5)', width: '2rem' }} />

              {/* Description */}
              <p
                className="text-xs leading-relaxed"
                style={{ color: hovered === i ? 'rgba(17,17,17,0.65)' : 'rgba(17,17,17,0.45)', transition: 'color 0.25s' }}
              >
                {desc}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Closing line */}
        <motion.p
          initial={{ opacity: 0, y: prefersReduced ? 0 : 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20px' }}
          transition={{ duration: 0.6, delay: prefersReduced ? 0 : 0.45, ease }}
          className="font-serif italic text-center mt-10"
          style={{ fontSize: 'clamp(1rem, 1.8vw, 1.2rem)', color: 'rgba(17,17,17,0.4)' }}
        >
          One championship weekend. Every part of the club involved.
        </motion.p>

      </div>
    </section>
  )
}
