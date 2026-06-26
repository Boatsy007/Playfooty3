import { motion } from 'framer-motion'
import { Calendar, MapPin, Lock } from 'lucide-react'

const words = [
  { text: 'AUSTRALIAN', pink: false },
  { text: 'CLUB', pink: false },
  { text: 'NETBALL', pink: true },
  { text: 'CHAMPIONSHIPS', pink: true },
]

export default function Hero() {
  const go = (id: string) => document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section className="relative bg-white overflow-hidden">
      {/* Diagonal stripe texture */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 38px, rgba(255,44,145,0.025) 38px, rgba(255,44,145,0.025) 39px)', opacity: 1 }} />
      {/* Pink glow top-left */}
      <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,44,145,0.09) 0%, transparent 70%)' }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-8">
        <div className="grid lg:grid-cols-[55%_45%] min-h-[88vh] items-center gap-0">

          {/* Left */}
          <div className="py-12 lg:py-16 pr-0 lg:pr-10">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-[11px] font-bold tracking-[0.22em] uppercase text-[#ff2c91] mb-5"
            >
              Australia's Ultimate Country Netball Experience
            </motion.p>

            {/* Stacked word-reveal headline */}
            <div className="mb-7">
              {words.map(({ text, pink }, i) => (
                <div key={text} className="overflow-hidden">
                  <motion.span
                    initial={{ y: '105%', opacity: 0 }}
                    animate={{ y: '0%', opacity: 1 }}
                    transition={{ duration: 0.65, delay: 0.15 + i * 0.1, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
                    className="block font-display leading-[0.92]"
                    style={{
                      fontSize: 'clamp(2rem, 4vw, 4.8rem)',
                      color: pink ? '#ff2c91' : '#1a1a1a',
                    }}
                  >
                    {text}
                  </motion.span>
                </div>
              ))}
            </div>

            {/* Pink rule */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, delay: 0.65, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
              className="h-[3px] w-16 bg-[#ff2c91] origin-left mb-6 rounded-full"
            />

            {/* Date */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="flex items-center gap-2 mb-4"
            >
              <Calendar size={15} className="text-[#ff2c91] shrink-0" />
              <span className="text-sm font-bold text-[#1a1a1a]">Thursday 5 November 2026 to Sunday 8 November 2026</span>
            </motion.div>

            {/* Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.78 }}
              className="flex flex-wrap gap-2 mb-6"
            >
              {[
                { icon: Lock, label: 'Invitation Only', pink: true },
                { icon: MapPin, label: 'Gold Coast, QLD', pink: false },
                { icon: null, label: 'A Grade Premiers', pink: false },
              ].map(({ icon: Icon, label, pink }) => (
                <span key={label}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all duration-200"
                  style={pink
                    ? { border: '1px solid rgba(255,44,145,0.35)', background: 'rgba(255,44,145,0.07)', color: '#ff2c91' }
                    : { border: '1px solid rgba(26,26,26,0.12)', background: 'rgba(26,26,26,0.04)', color: 'rgba(26,26,26,0.65)' }
                  }>
                  {Icon && <Icon size={9} />}
                  {label}
                </span>
              ))}
            </motion.div>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.82 }}
              className="font-display text-[#1a1a1a] mb-2 leading-none"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2.4rem)' }}
            >
              PLAY.&nbsp;<span style={{ color: '#ff2c91' }}>TRAVEL.</span>&nbsp;CELEBRATE.
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.88 }}
              className="text-[#1a1a1a]/55 text-base leading-relaxed mb-9 max-w-md"
            >
              Australia's biggest country netball end-of-season experience.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.96 }}
              className="flex flex-wrap gap-3"
            >
              <motion.button
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => go('#invitation')}
                className="btn-pink text-sm px-10 py-4 rounded-full font-bold"
              >
                Request an Invitation
              </motion.button>
              <motion.button
                whileHover={{ borderColor: '#ff2c91', color: '#ff2c91', y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => go('#experience')}
                className="text-sm px-9 py-4 rounded-full border-2 font-semibold text-[#1a1a1a] transition-all duration-200"
                style={{ borderColor: 'rgba(26,26,26,0.2)' }}
              >
                Learn More
              </motion.button>
            </motion.div>
          </div>

          {/* Right — photo */}
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 1, delay: 0.25, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
            className="hidden lg:block relative h-full min-h-[600px]"
          >
            <div className="absolute inset-0 rounded-3xl overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=900&q=90&auto=format&fit=crop&crop=center"
                alt="Netball action"
                className="w-full h-full object-cover object-center"
              />
              {/* Pink tint overlay */}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(255,44,145,0.06) 0%, transparent 60%)' }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 65%, rgba(255,255,255,0.15))' }} />
            </div>

            {/* Floating badge */}
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.1, ease: [0.34, 1.56, 0.64, 1] }}
              className="absolute bottom-8 right-8 bg-white rounded-2xl shadow-xl px-5 py-4 z-10"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#ff2c91] flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-[#ff2c91] mb-0.5">One National Title</p>
                  <p className="text-sm font-bold text-[#1a1a1a] leading-tight">Country clubs.<br />One trophy.<br />Ultimate pride.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Mobile photo */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.5 }}
        className="lg:hidden mx-4 sm:mx-8 mb-8 rounded-2xl overflow-hidden h-56"
      >
        <img
          src="https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&q=80&auto=format&fit=crop&crop=top"
          alt="Netball action"
          className="w-full h-full object-cover object-top"
        />
      </motion.div>
    </section>
  )
}
