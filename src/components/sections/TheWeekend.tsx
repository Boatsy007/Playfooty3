import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Trophy, Star, Music, Award, Utensils, MapPin } from 'lucide-react'

const events = [
  { icon: Trophy,   title: 'National Championship', tag: 'Compete',   color: '#ff2c91' },
  { icon: Star,     title: 'Opening Function',       tag: 'Social',    color: '#f4c14d' },
  { icon: Award,    title: 'Awards Presentation',    tag: 'Celebrate', color: '#ff2c91' },
  { icon: Music,    title: 'Live Entertainment',     tag: 'Sounds',    color: '#4dd9f4' },
  { icon: Utensils, title: 'Food & Festival Zone',   tag: 'Eat',       color: '#f4c14d' },
  { icon: MapPin,   title: 'Gold Coast Experiences', tag: 'Explore',   color: '#4dd9f4' },
]

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function TheWeekend() {
  const [hovered, setHovered] = useState<number | null>(null)
  const prefersReduced = useReducedMotion()

  return (
    <section id="the-weekend" style={{ background: '#0d0d0d' }}>
      {/* Photo band */}
      <div className="relative w-full overflow-hidden" style={{ height: 'clamp(220px, 38vw, 420px)' }}>
        <img
          src="/hero-photo.webp"
          alt="Championship action"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: '65% 25%' }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(13,13,13,0.15) 0%, rgba(13,13,13,0.0) 40%, rgba(13,13,13,0.9) 100%)' }} />
      </div>

      {/* Editorial layout */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-[5fr,7fr] gap-12 lg:gap-20">

          {/* Left: header + pull quote */}
          <div className="lg:sticky lg:top-28 self-start">
            <motion.div
              initial={{ opacity: 0, x: prefersReduced ? 0 : -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, ease }}
            >
              <h2 className="font-display text-white leading-none mb-6" style={{ fontSize: 'clamp(3.5rem, 8vw, 7rem)' }}>
                THE<br />WEEKEND
              </h2>
              <p className="leading-relaxed mb-10" style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.38)', maxWidth: '26ch' }}>
                Four days of competition, celebration and connection on the Gold Coast.
              </p>
              <blockquote className="font-serif italic border-l-2 pl-5" style={{ borderColor: '#ff2c91', color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem', lineHeight: 1.7 }}>
                "A weekend your whole club will never forget."
              </blockquote>
            </motion.div>
          </div>

          {/* Right: event list */}
          <div>
            {events.map(({ icon: Icon, title, tag, color }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: prefersReduced ? 0 : 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.5, delay: prefersReduced ? 0 : i * 0.07, ease }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                className="flex items-center justify-between py-6 cursor-default"
                style={{ borderBottom: `1px solid ${hovered === i ? `${color}35` : 'rgba(255,255,255,0.07)'}`, transition: 'border-color 0.25s' }}
              >
                <div className="flex items-center gap-5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: hovered === i ? `${color}22` : `${color}10`,
                      border: `1px solid ${color}28`,
                      transition: 'background 0.25s',
                    }}
                  >
                    <Icon size={14} style={{ color }} />
                  </div>
                  <span
                    className="font-display leading-none"
                    style={{
                      fontSize: 'clamp(1.4rem, 3vw, 2rem)',
                      color: hovered === i ? '#ffffff' : 'rgba(255,255,255,0.7)',
                      transition: 'color 0.25s',
                    }}
                  >
                    {title.toUpperCase()}
                  </span>
                </div>
                <span
                  className="font-condensed font-bold text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 rounded-full shrink-0 ml-4"
                  style={{ color, background: `${color}12`, border: `1px solid ${color}22` }}
                >
                  {tag}
                </span>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}
