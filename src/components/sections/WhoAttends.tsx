import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const attendees = [
  { title: 'Players',       sub: 'A Grade premiers competing for the national title', color: '#ff2c91' },
  { title: 'Coaches',       sub: 'Leading teams from across Australia',               color: '#f4c14d' },
  { title: 'Club Officials',sub: 'Committee members and administrators',              color: '#4dd9f4' },
  { title: 'Families',      sub: 'Supporting the journey all season long',            color: '#ff2c91' },
  { title: 'Supporters',    sub: 'Celebrating the season together',                  color: '#f4c14d' },
]

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function WhoAttends() {
  const [hovered, setHovered] = useState<number | null>(null)
  const prefersReduced = useReducedMotion()

  return (
    <section id="who-attends" style={{ background: '#f7f5f2' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 lg:py-0">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-0 items-start">

          {/* Left: sticky photo */}
          <div className="lg:sticky lg:top-0 lg:h-screen flex flex-col justify-center lg:pr-16 py-16 lg:py-0">
            <motion.div
              initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, ease }}
            >
              <p className="font-condensed font-bold tracking-[0.22em] text-xs uppercase mb-5" style={{ color: 'rgba(17,17,17,0.35)' }}>
                Who Attends
              </p>
              <h2 className="font-display leading-none mb-8" style={{ fontSize: 'clamp(3rem, 7vw, 6rem)', color: '#111111' }}>
                THE<br />WHOLE<br />CLUB
              </h2>
              <div className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: '4/5' }}>
                <img
                  src="/hero-photo.webp"
                  alt="Championship players and supporters"
                  className="w-full h-full object-cover"
                  style={{ objectPosition: '65% 20%' }}
                />
                <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(to top, rgba(17,17,17,0.5) 0%, transparent 50%)' }} />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="font-serif italic text-white/80 text-sm leading-relaxed">
                    "Country netball is built by more than players alone."
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right: hover list */}
          <div className="lg:pl-16 lg:py-24" style={{ borderLeft: '1px solid rgba(17,17,17,0.08)' }}>
            {attendees.map(({ title, sub, color }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: prefersReduced ? 0 : 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.55, delay: prefersReduced ? 0 : i * 0.08, ease }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                className="group py-8 cursor-default"
                style={{ borderBottom: '1px solid rgba(17,17,17,0.08)' }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-1 rounded-full shrink-0 mt-2 transition-all duration-300"
                    style={{
                      height: hovered === i ? '3.5rem' : '1.5rem',
                      background: hovered === i ? color : 'rgba(17,17,17,0.15)',
                    }}
                  />
                  <div>
                    <span
                      className="font-display block leading-none mb-2 transition-colors duration-250"
                      style={{
                        fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
                        color: hovered === i ? color : '#111111',
                      }}
                    >
                      {title.toUpperCase()}
                    </span>
                    <p
                      className="text-sm leading-relaxed transition-all duration-250"
                      style={{
                        color: hovered === i ? 'rgba(17,17,17,0.6)' : 'rgba(17,17,17,0.3)',
                        maxWidth: '28ch',
                      }}
                    >
                      {sub}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}
