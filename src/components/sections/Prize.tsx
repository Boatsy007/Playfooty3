import { motion } from 'framer-motion'
import { Star } from 'lucide-react'

export default function Prize() {
  const scrollToRegister = () =>
    document.querySelector('#register')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section id="prize" className="bg-white py-20 lg:py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left — text */}
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          >
            <div className="inline-flex items-center gap-2 mb-5">
              <div className="h-px w-8 bg-pink" />
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-pink">Championship Prize</span>
            </div>
            <h2 className="font-display leading-none text-navy mb-6" style={{ fontSize: 'clamp(2.8rem, 6vw, 5rem)' }}>
              MAJOR PRIZE<br />
              FOR THE<br />
              <span className="text-pink">WINNING CLUB</span>
            </h2>
            <p className="text-navy/60 text-lg leading-relaxed mb-8 max-w-lg">
              The champion club will receive a major prize package designed to reward the team,
              celebrate the club and create lasting value for its netball community.
            </p>
            <div className="inline-flex items-center gap-3 border border-gold/50 rounded-xl px-5 py-3 bg-gold/5 mb-8">
              <Star size={14} className="text-gold" />
              <p className="text-sm font-bold text-navy/70">
                Prize details announced closer to the event
              </p>
            </div>
            <div>
              <button
                onClick={scrollToRegister}
                className="bg-pink hover:bg-pink-dark text-white font-bold text-sm px-8 py-4 rounded-full transition-all duration-200 shadow-pink hover:shadow-pink-lg"
              >
                Register Interest
              </button>
            </div>
          </motion.div>

          {/* Right — prestige visual */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="relative"
          >
            <div className="bg-navy rounded-3xl p-10 relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-pink/5 -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-gold/5 translate-y-1/2 -translate-x-1/2" />

              <div className="relative z-10 text-center">
                {/* Trophy visual */}
                <div className="w-20 h-20 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center mx-auto mb-8">
                  <Star size={36} className="text-gold" />
                </div>

                <p className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase mb-3">CNCA 2026</p>
                <h3 className="font-display text-white leading-none mb-3" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}>
                  THE CNCA<br />
                  <span className="text-gold">TITLE</span>
                </h3>
                <p className="text-white/45 text-sm leading-relaxed mb-8">
                  The highest honour in A Grade country netball. A championship win that defines
                  a club for years to come.
                </p>

                <div className="space-y-3 text-left">
                  {['Club Reward Package', 'National Recognition', 'Player Acknowledgement', 'Club Legacy'].map(item => (
                    <div key={item} className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                      <span className="text-white/65 text-sm font-medium">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-white/10">
                  <p className="text-gold text-[10px] font-bold tracking-[0.2em] uppercase">
                    Full details · Announced 2026
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
