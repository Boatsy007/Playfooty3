import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Award, Star, Users, ChevronRight } from 'lucide-react'

const prizes = [
  { icon: Trophy, title: 'National Title',       desc: 'The highest honour in A Grade country netball.', color: '#f4c14d' },
  { icon: Award,  title: 'Champion Trophy',      desc: 'Presented at the national awards ceremony.', color: '#f4c14d' },
  { icon: Star,   title: 'Major Prize Package',  desc: 'Full details announced prior to the event.', color: '#f4c14d' },
  { icon: Users,  title: 'National Recognition', desc: 'Club acknowledged as Australia\'s best.', color: '#f4c14d' },
]

export default function OneNationalChampion() {
  const go = useCallback((id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  return (
    <section style={{ background: '#111111' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-20 lg:py-28">

        {/* Giant background word */}
        <div className="absolute left-0 right-0 flex justify-center pointer-events-none select-none overflow-hidden" aria-hidden>
          <span className="font-display" style={{ fontSize: 'clamp(8rem, 22vw, 22rem)', color: 'rgba(255,255,255,0.02)', whiteSpace: 'nowrap', lineHeight: 1 }}>
            CHAMPION
          </span>
        </div>

        <div className="relative">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
            className="mb-16 max-w-3xl"
          >
            <h2 className="font-display text-white leading-none mb-6" style={{ fontSize: 'clamp(3rem, 8.5vw, 9rem)' }}>
              ONE<br />NATIONAL<br /><span style={{ color: '#ff2c91' }}>CHAMPION</span>
            </h2>
            <p className="font-condensed font-semibold" style={{ fontSize: 'clamp(1rem, 1.8vw, 1.2rem)', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
              A Grade premiership clubs from across Australia.<br />
              One championship. One national title. One club crowned champion.
            </p>
          </motion.div>

          {/* Prize cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-12">
            {prizes.map(({ icon: Icon, title, desc, color }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
                whileHover={{ y: -4, transition: { duration: 0.22 } }}
                className="rounded-2xl p-6 flex flex-col cursor-default"
                style={{ background: 'rgba(244,193,77,0.05)', border: '1px solid rgba(244,193,77,0.15)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: 'rgba(244,193,77,0.12)', border: '1px solid rgba(244,193,77,0.25)' }}>
                  <Icon size={17} style={{ color }} />
                </div>
                <p className="font-condensed font-bold leading-tight mb-1.5" style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: '#f4c14d', letterSpacing: '0.02em' }}>
                  {title.toUpperCase()}
                </p>
                <p className="text-xs leading-relaxed mt-auto pt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {desc}
                </p>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
          >
            <button
              onClick={() => go('#invitation')}
              className="group inline-flex items-center gap-2.5 font-bold rounded-full transition-all duration-200"
              style={{ background: '#ff2c91', color: '#ffffff', fontSize: '0.875rem', padding: '1rem 2.5rem', letterSpacing: '0.06em' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#cc1f6e')}
              onMouseLeave={e => (e.currentTarget.style.background = '#ff2c91')}
            >
              REQUEST INVITATION
              <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-200" />
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
