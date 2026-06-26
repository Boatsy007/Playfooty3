import { motion } from 'framer-motion'
import { Trophy, ChevronRight } from 'lucide-react'

export default function Prize() {
  const go = (id: string) => document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section className="relative overflow-hidden" style={{ background: '#0d0d0d' }}>

      {/* Giant background word */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none">
        <span className="font-display leading-none"
          style={{ fontSize: 'clamp(12rem, 35vw, 32rem)', color: 'rgba(255,255,255,0.025)', whiteSpace: 'nowrap' }}>
          CHAMPION
        </span>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-24 lg:py-36">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* Left: big text moment */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(244,193,77,0.15)', border: '1px solid rgba(244,193,77,0.3)' }}>
                <Trophy size={22} style={{ color: '#f4c14d' }} />
              </div>
              <span className="text-[11px] font-bold tracking-[0.22em] uppercase" style={{ color: '#f4c14d' }}>
                Championship Prize
              </span>
            </div>

            <h2 className="font-display text-white leading-none mb-0"
              style={{ fontSize: 'clamp(3.5rem, 9vw, 9rem)', lineHeight: 0.88 }}>
              WIN<br />
              IT<br />
              <span style={{ color: '#f4c14d' }}>ALL.</span>
            </h2>
          </motion.div>

          {/* Right: prize detail */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
            className="flex flex-col gap-8"
          >
            <div className="border-l-2 pl-8" style={{ borderColor: '#f4c14d' }}>
              <p className="text-white font-semibold text-xl leading-relaxed mb-3">
                A major prize package will be awarded to the 2026 CNCA Champion Club.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Full details announced prior to the event.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {['National Title', 'Champion Trophy', 'Club Recognition', 'Prize Package'].map((item) => (
                <div key={item}
                  className="rounded-2xl px-5 py-4"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="w-1.5 h-1.5 rounded-full mb-3" style={{ background: '#f4c14d' }} />
                  <p className="text-white text-sm font-bold">{item}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => go('#invitation')}
              className="group self-start flex items-center gap-2.5 font-bold text-sm px-8 py-4 rounded-full transition-all duration-200"
              style={{ background: '#ff2c91', color: '#ffffff' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#cc1f6e')}
              onMouseLeave={e => (e.currentTarget.style.background = '#ff2c91')}
            >
              Request Invitation
              <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-200" />
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
