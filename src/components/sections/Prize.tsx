import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Crown, Star, Trophy, Medal } from 'lucide-react'

const honours = [
  { icon: Trophy, label: 'Club Reward Package', desc: 'A major prize for the champion club and their community.' },
  { icon: Star, label: 'National Recognition', desc: 'Permanently recognised as CNCA inaugural champions.' },
  { icon: Medal, label: 'Player Acknowledgement', desc: 'Individual recognition for every player in the squad.' },
  { icon: Crown, label: 'Club Legacy', desc: 'A title that defines your club for years to come.' },
]

export default function Prize() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  const scrollToRegister = () =>
    document.querySelector('#register')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section id="prize" className="relative overflow-hidden bg-white">

      {/* Full-bleed dark top portion */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, #040e22 0%, #040e22 55%, #ffffff 55%)' }} />

      {/* Gold glow */}
      <div className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(244,193,77,0.07) 0%, transparent 70%)' }} />

      <div className="relative z-10 max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12 pt-24 lg:pt-32 pb-24 lg:pb-32">

        {/* Section label */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="flex items-center gap-4 mb-8"
        >
          <div className="h-[3px] w-10" style={{ background: '#f4c14d' }} />
          <span className="text-[11px] font-bold tracking-[0.22em] uppercase" style={{ color: '#f4c14d' }}>
            Championship Prize
          </span>
        </motion.div>

        {/* Giant headline */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="mb-16"
        >
          <h2 className="font-display leading-none text-white"
            style={{ fontSize: 'clamp(3.5rem, 9vw, 10rem)' }}>
            WIN THE<br />
            <span style={{ color: '#f4c14d' }}>TITLE.</span>
          </h2>
          <h2 className="font-display leading-none mt-[-0.05em]"
            style={{ fontSize: 'clamp(3.5rem, 9vw, 10rem)', WebkitTextStroke: '2px rgba(255,255,255,0.2)', color: 'transparent' }}>
            CLAIM THE
          </h2>
          <h2 className="font-display leading-none" style={{ fontSize: 'clamp(3.5rem, 9vw, 10rem)', color: '#ff2c91' }}>
            LEGACY.
          </h2>
        </motion.div>

        {/* Card + honours grid */}
        <div ref={ref} className="grid lg:grid-cols-[5fr,7fr] gap-8 items-start">

          {/* Left — prestige card */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="relative rounded-3xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #081a3d 0%, #040e22 100%)', border: '1px solid rgba(244,193,77,0.2)' }}
          >
            <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, transparent, #f4c14d, transparent)' }} />

            <div className="p-10 text-center">
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 rounded-full animate-pulse"
                  style={{ background: 'radial-gradient(circle, rgba(244,193,77,0.25) 0%, transparent 70%)' }} />
                <div className="relative w-24 h-24 rounded-full border flex items-center justify-center"
                  style={{ borderColor: 'rgba(244,193,77,0.35)', background: 'rgba(244,193,77,0.08)' }}>
                  <Crown size={40} style={{ color: '#f4c14d' }} />
                </div>
              </div>

              <p className="text-[10px] font-bold tracking-[0.3em] uppercase mb-3" style={{ color: 'rgba(244,193,77,0.6)' }}>
                CNCA 2026
              </p>
              <h3 className="font-display text-white leading-none mb-2" style={{ fontSize: 'clamp(2.2rem, 4vw, 3.5rem)' }}>
                THE CNCA<br /><span style={{ color: '#f4c14d' }}>TITLE</span>
              </h3>
              <p className="text-white/40 text-sm leading-relaxed mb-8 max-w-xs mx-auto">
                The highest honour in A Grade country netball. A championship that defines a club for years to come.
              </p>

              <div className="rounded-2xl py-4 px-6 mb-8"
                style={{ background: 'rgba(244,193,77,0.07)', border: '1px solid rgba(244,193,77,0.18)' }}>
                <p className="text-xs font-bold tracking-[0.2em] uppercase mb-1" style={{ color: '#f4c14d' }}>
                  Prize Value
                </p>
                <p className="font-display text-white leading-none" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}>
                  TO BE ANNOUNCED
                </p>
                <p className="text-white/30 text-[10px] font-bold tracking-wider uppercase mt-1">Closer to the event · 2026</p>
              </div>

              <button
                onClick={scrollToRegister}
                className="w-full font-bold text-sm py-4 rounded-full transition-all duration-200"
                style={{ background: '#f4c14d', color: '#040e22' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#e5b03a')}
                onMouseLeave={e => (e.currentTarget.style.background = '#f4c14d')}
              >
                Register Interest
              </button>
            </div>
          </motion.div>

          {/* Right — honours */}
          <div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className="text-white/55 text-lg leading-relaxed mb-10 max-w-lg"
            >
              The champion club will receive a major prize package designed to reward the team,
              celebrate the club and create lasting value for its entire netball community.
            </motion.p>

            <div className="grid sm:grid-cols-2 gap-4">
              {honours.map(({ icon: Icon, label, desc }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 32 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.7, delay: 0.15 + i * 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                  className="group relative rounded-2xl p-6 transition-all duration-400 cursor-default"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                  whileHover={{ y: -4, transition: { duration: 0.3 } }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
                    style={{ background: 'rgba(244,193,77,0.12)', border: '1px solid rgba(244,193,77,0.2)' }}>
                    <Icon size={18} style={{ color: '#f4c14d' }} />
                  </div>
                  <h4 className="font-bold text-white text-sm mb-2 leading-snug">{label}</h4>
                  <p className="text-white/40 text-xs leading-relaxed">{desc}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mt-8 flex items-center gap-3 rounded-xl px-5 py-4"
              style={{ background: 'rgba(244,193,77,0.06)', border: '1px solid rgba(244,193,77,0.18)' }}
            >
              <Star size={14} style={{ color: '#f4c14d', flexShrink: 0 }} />
              <p className="text-sm font-bold" style={{ color: 'rgba(244,193,77,0.8)' }}>
                Full prize details will be announced closer to the event.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
