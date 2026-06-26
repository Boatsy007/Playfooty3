import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Trophy, Star, Music, Award, Camera, Tv, MapPin, Utensils } from 'lucide-react'

const events = [
  { icon: Trophy,   title: 'National Championship',   tag: 'Compete',   color: '#ff2c91' },
  { icon: Star,     title: 'Opening Function',         tag: 'Social',    color: '#f4c14d' },
  { icon: Music,    title: 'Live Entertainment',       tag: 'Sounds',    color: '#4dd9f4' },
  { icon: Award,    title: 'Awards Presentation',      tag: 'Celebrate', color: '#ff2c91' },
  { icon: Camera,   title: 'Professional Photography', tag: 'Captured',  color: '#f4c14d' },
  { icon: Tv,       title: 'Livestream Coverage',      tag: 'Live',      color: '#4dd9f4' },
  { icon: MapPin,   title: 'Gold Coast Experiences',   tag: 'Explore',   color: '#ff2c91' },
  { icon: Utensils, title: 'Festival Food Zone',       tag: 'Eat',       color: '#f4c14d' },
]

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function TheWeekend() {
  const [hovered, setHovered] = useState<number | null>(null)
  const prefersReduced = useReducedMotion()

  return (
    <section id="the-weekend" style={{ background: '#0d0d0d' }}>
      {/* Photo band */}
      <div className="relative w-full overflow-hidden" style={{ height: 'clamp(240px, 40vw, 480px)' }}>
        <img
          src="/hero-photo.webp"
          alt="CNCA championship action"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: '65% 30%' }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(13,13,13,0.2) 0%, rgba(13,13,13,0.0) 40%, rgba(13,13,13,0.85) 100%)' }} />
        <div className="absolute bottom-0 left-0 right-0 px-8 sm:px-12 lg:px-16 pb-10">
          <p className="font-condensed font-bold tracking-[0.28em] text-xs uppercase" style={{ color: '#f4c14d' }}>
            Gold Coast &nbsp;·&nbsp; 5 to 8 November 2026
          </p>
        </div>
      </div>

      {/* Editorial layout */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-[5fr,7fr] gap-12 lg:gap-20">

          {/* Left: header + pull quote */}
          <div className="lg:sticky lg:top-28 self-start">
            <motion.div
              initial={{ opacity: 0, x: prefersReduced ? 0 : -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, ease }}
            >
              <h2 className="font-display text-white leading-none mb-6" style={{ fontSize: 'clamp(3.5rem, 8vw, 7rem)' }}>
                THE<br />WEEKEND
              </h2>
              <p className="text-sm leading-relaxed mb-10" style={{ color: 'rgba(255,255,255,0.4)', maxWidth: '26ch' }}>
                Four days of competition, celebration and connection on the Gold Coast.
              </p>
              <blockquote className="font-serif italic border-l-2 pl-5" style={{ borderColor: '#ff2c91', color: 'rgba(255,255,255,0.55)', fontSize: '1.15rem', lineHeight: 1.65 }}>
                "More than a championship. A weekend your whole club will never forget."
              </blockquote>
            </motion.div>
          </div>

          {/* Right: event list */}
          <div>
            {events.map(({ icon: Icon, title, tag, color }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: prefersReduced ? 0 : 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.5, delay: prefersReduced ? 0 : i * 0.06, ease }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                className="flex items-center justify-between py-5 cursor-default"
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                  transition: 'border-color 0.25s',
                  borderBottomColor: hovered === i ? `${color}40` : 'rgba(255,255,255,0.07)',
                }}
              >
                <div className="flex items-center gap-5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: hovered === i ? `${color}22` : `${color}10`,
                      border: `1px solid ${color}30`,
                      transition: 'background 0.25s',
                    }}
                  >
                    <Icon size={15} style={{ color }} />
                  </div>
                  <span
                    className="font-display leading-none"
                    style={{
                      fontSize: 'clamp(1.3rem, 2.8vw, 1.8rem)',
                      color: hovered === i ? '#ffffff' : 'rgba(255,255,255,0.75)',
                      transition: 'color 0.25s',
                    }}
                  >
                    {title.toUpperCase()}
                  </span>
                </div>
                <span
                  className="font-condensed font-bold text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 rounded-full shrink-0 ml-4"
                  style={{ color, background: `${color}15`, border: `1px solid ${color}25` }}
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
