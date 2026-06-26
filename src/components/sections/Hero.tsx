import { motion } from 'framer-motion'
import { Calendar, MapPin, Lock } from 'lucide-react'

export default function Hero() {
  const go = (id: string) => document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section className="relative bg-white pt-[68px] overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-8">
        <div className="grid lg:grid-cols-[55%_45%] min-h-[88vh] items-center gap-0">

          {/* Left */}
          <div className="py-12 lg:py-16 pr-0 lg:pr-10">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-[11px] font-bold tracking-[0.22em] uppercase text-[#ff2c91] mb-4"
            >
              Australia's Ultimate Country Netball Experience
            </motion.p>

            <div className="mb-6">
              {['AUSTRALIAN', 'CLUB', 'NETBALL', 'CHAMPIONSHIPS'].map((word, i) => (
                <div key={word} className="overflow-hidden">
                  <motion.span
                    initial={{ y: '110%' }}
                    animate={{ y: '0%' }}
                    transition={{ duration: 0.7, delay: 0.1 + i * 0.09, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                    className="block font-display leading-[0.92]"
                    style={{
                      fontSize: 'clamp(2rem, 4vw, 4.8rem)',
                      color: (word === 'NETBALL' || word === 'CHAMPIONSHIPS') ? '#ff2c91' : '#1a1a1a',
                    }}
                  >
                    {word}
                  </motion.span>
                </div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-4 mb-5"
            >
              <div className="flex items-center gap-2 text-[#1a1a1a]">
                <Calendar size={16} className="text-[#ff2c91]" />
                <span className="text-sm font-bold">Thursday 5 November 2026 to Sunday 8 November 2026</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65 }}
              className="flex flex-wrap gap-3 mb-5"
            >
              <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-[#ff2c91]/30 bg-[#ff2c91]/5 text-[#ff2c91]">
                <Lock size={9} /> Invitation Only
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-[#1a1a1a]/15 bg-[#1a1a1a]/5 text-[#1a1a1a]/70">
                <MapPin size={9} /> Gold Coast, QLD
              </span>
              <span className="text-xs font-bold px-3 py-1.5 rounded-full border border-[#1a1a1a]/15 bg-[#1a1a1a]/5 text-[#1a1a1a]/70">
                A Grade Premiers
              </span>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="font-display text-[#1a1a1a] mb-2"
              style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)' }}
            >
              PLAY.&nbsp;<span style={{ color: '#ff2c91' }}>TRAVEL.</span>&nbsp;CELEBRATE.
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.75 }}
              className="text-[#1a1a1a]/60 text-base leading-relaxed mb-8 max-w-md"
            >
              Australia's biggest country netball end-of-season experience.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85 }}
              className="flex flex-wrap gap-3"
            >
              <button onClick={() => go('#invitation')}
                className="btn-pink text-sm px-10 py-4 rounded-full font-bold">
                Request an Invitation
              </button>
              <button onClick={() => go('#experience')}
                className="text-sm px-9 py-4 rounded-full border-2 border-[#1a1a1a]/20 hover:border-[#ff2c91] hover:text-[#ff2c91] font-semibold text-[#1a1a1a] transition-all duration-200">
                Learn More
              </button>
            </motion.div>
          </div>

          {/* Right — photo */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="hidden lg:block relative h-full min-h-[600px]"
          >
            {/* Photo */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=900&q=90&auto=format&fit=crop&crop=center"
                alt="Netball action"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 60%, rgba(255,255,255,0.2))' }} />
            </div>

            {/* Floating badge */}
            <div className="absolute bottom-8 right-8 bg-white rounded-2xl shadow-xl px-5 py-4 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#ff2c91] flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[9px] font-bold tracking-[0.16em] uppercase text-[#ff2c91] mb-0.5">One National Title</p>
                  <p className="text-sm font-bold text-[#1a1a1a] leading-tight">Country clubs.<br />One trophy.<br />Ultimate pride.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Mobile photo */}
      <div className="lg:hidden mx-4 sm:mx-8 mb-8 rounded-2xl overflow-hidden h-56">
        <img
          src="https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&q=80&auto=format&fit=crop&crop=top"
          alt="Netball action"
          className="w-full h-full object-cover object-top"
        />
      </div>
    </section>
  )
}
