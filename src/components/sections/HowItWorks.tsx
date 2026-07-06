import { useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'

const attendees = [
  { num: '01', title: 'PLAYERS', desc: 'A Grade premiers competing for the national title.', color: '#ff2c91' },
  { num: '02', title: 'COACHES', desc: 'Leading clubs and coaching staff from across Australia.', color: '#f4c14d' },
  { num: '03', title: 'CLUB OFFICIALS', desc: 'Committee members, administrators and volunteers.', color: '#4dd9f4' },
  { num: '04', title: 'FAMILIES', desc: 'Support the journey and enjoy the Gold Coast.', color: '#ff2c91' },
  { num: '05', title: 'SUPPORTERS', desc: 'Celebrate the season together.', color: '#f4c14d' },
]

export default function HowItWorks() {
  const go = useCallback((id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })
  }, [])
  const prefersReduced = useReducedMotion()

  return (
    <section id="format" style={{ background: '#f5f4f0' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-20 lg:py-28">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
          className="mb-16"
        >
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <h2 className="font-display leading-none" style={{ fontSize: 'clamp(2.8rem, 7vw, 6.5rem)', color: '#111111' }}>
              MORE THAN THE<br />PLAYING GROUP
            </h2>
            <p className="text-sm leading-relaxed max-w-xs lg:pb-2" style={{ color: 'rgba(17,17,17,0.5)' }}>
              PlayFooty brings together everyone who contributes to Community Football.
            </p>
          </div>
        </motion.div>

        {/* Attendee rows */}
        <div className="border-t" style={{ borderColor: 'rgba(17,17,17,0.12)' }}>
          {attendees.map(({ num, title, desc, color }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: prefersReduced ? 0.01 : 0.5, delay: prefersReduced ? 0 : i * 0.07, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
              className="flex items-center gap-6 sm:gap-10 py-6 border-b"
              style={{ borderColor: 'rgba(17,17,17,0.1)' }}
            >
              {/* Big colored number */}
              <span className="font-display leading-none shrink-0 w-20 text-right"
                style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', color }}>
                {num}
              </span>

              {/* Divider */}
              <div className="w-px h-12 shrink-0" style={{ background: 'rgba(17,17,17,0.12)' }} />

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="font-condensed font-bold leading-none mb-1.5" style={{ fontSize: 'clamp(1.5rem, 3.2vw, 2.4rem)', color: '#111111', letterSpacing: '0.02em' }}>
                  {title}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(17,17,17,0.5)', fontFamily: 'Barlow, sans-serif' }}>{desc}</p>
              </div>

              {/* Accent dot */}
              <div className="w-2.5 h-2.5 rounded-full shrink-0 hidden sm:block" style={{ background: color }} />
            </motion.div>
          ))}
        </div>

        {/* Bottom strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
          className="mt-8 rounded-3xl px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
          style={{ background: '#111111' }}
        >
          <div>
            <p className="font-display text-white leading-none mb-2"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2.4rem)' }}>
              THE CHAMPIONSHIP WEEKEND
            </p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Competition by day. Celebration by night. Gold Coast, October 2027.
            </p>
          </div>
          <button
            onClick={() => go('#invitation')}
            className="group shrink-0 flex items-center gap-2.5 font-bold text-sm px-7 py-3.5 rounded-full transition-all duration-200"
            style={{ background: '#ff2c91', color: '#ffffff' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#cc1f6e')}
            onMouseLeave={e => (e.currentTarget.style.background = '#ff2c91')}
          >
            Register Interest
            <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-200" />
          </button>
        </motion.div>
      </div>
    </section>
  )
}
