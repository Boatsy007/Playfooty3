import { motion } from 'framer-motion'
import { MapPin, Lock, Star } from 'lucide-react'

const words = [
  { text: 'AUSTRALIAN', color: '#ffffff' },
  { text: 'CLUB', color: '#ffffff' },
  { text: 'NETBALL', color: '#ff2c91' },
  { text: 'CHAMPIONSHIPS', color: '#ffffff' },
]

export default function Hero() {
  const go = (id: string) => document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section className="relative overflow-hidden" style={{ background: '#0d0d0d' }}>

      {/* Atmospheric glows */}
      <div className="absolute -top-40 -left-40 w-[800px] h-[800px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,44,145,0.22) 0%, transparent 65%)' }} />
      <div className="absolute top-1/3 right-0 w-[500px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(244,193,77,0.06) 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(77,217,244,0.05) 0%, transparent 70%)' }} />

      {/* Scattered confetti dots */}
      <div className="absolute top-36 left-[38%] w-2.5 h-2.5 rounded-full bg-[#f4c14d] opacity-50 pointer-events-none" />
      <div className="absolute top-72 left-[44%] w-1.5 h-1.5 rounded-full bg-[#ff2c91] opacity-40 pointer-events-none" />
      <div className="absolute bottom-48 left-[32%] w-3 h-3 rounded-full bg-[#4dd9f4] opacity-30 pointer-events-none" />
      <div className="absolute top-48 left-[52%] w-2 h-2 rounded-full bg-[#f4c14d] opacity-35 pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-8">
        <div className="grid lg:grid-cols-[54%_46%] min-h-[92vh] items-center gap-0">

          {/* Left */}
          <div className="py-14 lg:py-20 pr-0 lg:pr-12 relative z-10">

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-[11px] font-bold tracking-[0.25em] uppercase mb-6"
              style={{ color: '#ff2c91' }}
            >
              Australia's Ultimate Country Netball Experience
            </motion.p>

            {/* Big word-reveal headline */}
            <div className="mb-8">
              {words.map(({ text, color }, i) => (
                <div key={text} className="overflow-hidden">
                  <motion.span
                    initial={{ y: '105%', opacity: 0 }}
                    animate={{ y: '0%', opacity: 1 }}
                    transition={{ duration: 0.7, delay: 0.15 + i * 0.1, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
                    className="block font-display leading-[0.9]"
                    style={{ fontSize: 'clamp(2.2rem, 4.2vw, 5.2rem)', color }}
                  >
                    {text}
                  </motion.span>
                </div>
              ))}
            </div>

            {/* Gold divider */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, delay: 0.65, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
              className="h-[3px] w-16 origin-left mb-7 rounded-full"
              style={{ background: 'linear-gradient(90deg, #ff2c91, #f4c14d)' }}
            />

            {/* Pill badges */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.72 }}
              className="flex flex-wrap gap-2.5 mb-8"
            >
              <span className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full"
                style={{ background: 'rgba(244,193,77,0.12)', border: '1px solid rgba(244,193,77,0.4)', color: '#f4c14d' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                5–8 NOV 2026
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full"
                style={{ background: 'rgba(255,44,145,0.12)', border: '1px solid rgba(255,44,145,0.4)', color: '#ff2c91' }}>
                <Lock size={10} />
                INVITE ONLY
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.55)' }}>
                <MapPin size={10} />
                GOLD COAST, QLD
              </span>
            </motion.div>

            {/* Tagline — big */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.82 }}
              className="font-display leading-none mb-3"
              style={{ fontSize: 'clamp(1.9rem, 3.5vw, 3rem)', color: '#ffffff' }}
            >
              PLAY.&nbsp;<span style={{ color: '#ff2c91' }}>TRAVEL.</span>&nbsp;CELEBRATE.
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.9 }}
              className="text-base leading-relaxed mb-10 max-w-md"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Australia's biggest country netball end-of-season experience.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.98 }}
              className="flex flex-wrap gap-4"
            >
              <motion.button
                whileHover={{ scale: 1.04, y: -2, boxShadow: '0 16px 48px rgba(255,44,145,0.5)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => go('#invitation')}
                className="btn-pink text-base px-12 py-5 rounded-full font-bold"
              >
                Request an Invitation
              </motion.button>
              <motion.button
                whileHover={{ borderColor: '#ff2c91', color: '#ff2c91', y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => go('#experience')}
                className="text-base px-10 py-5 rounded-full border-2 font-semibold transition-all duration-200"
                style={{ borderColor: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.6)' }}
              >
                What's On
              </motion.button>
            </motion.div>
          </div>

          {/* Right — photo */}
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 1.1, delay: 0.2, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
            className="hidden lg:block relative h-full min-h-[600px] py-14"
          >
            <div className="absolute inset-y-14 left-0 right-0 rounded-[28px] overflow-hidden"
              style={{ boxShadow: '0 0 0 1px rgba(255,44,145,0.2), 0 0 80px rgba(255,44,145,0.2), 0 0 160px rgba(255,44,145,0.08)' }}>
              <img
                src="/hero-photo.webp"
                alt="Netball action"
                className="w-full h-full object-cover object-center"
              />
              {/* Strong pink tint overlay */}
              <div className="absolute inset-0"
                style={{ background: 'linear-gradient(135deg, rgba(255,44,145,0.25) 0%, transparent 55%)' }} />
              {/* Bottom fade to bg */}
              <div className="absolute inset-0"
                style={{ background: 'linear-gradient(to bottom, transparent 55%, rgba(13,13,13,0.7))' }} />
              {/* Left fade */}
              <div className="absolute inset-0"
                style={{ background: 'linear-gradient(to left, transparent 70%, rgba(13,13,13,0.4))' }} />
            </div>

            {/* Gold date badge — top */}
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.05, ease: [0.34, 1.56, 0.64, 1] as [number,number,number,number] }}
              className="absolute top-6 right-6 rounded-2xl px-5 py-3.5 z-10"
              style={{ background: '#f4c14d', boxShadow: '0 8px 32px rgba(244,193,77,0.4)' }}
            >
              <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#1a1a1a]/60 mb-0.5">Event Date</p>
              <p className="font-display text-[#1a1a1a] leading-none" style={{ fontSize: '1.5rem' }}>NOV 5–8</p>
              <p className="font-display text-[#1a1a1a]/60 leading-none text-sm">2026</p>
            </motion.div>

            {/* Star badge — bottom */}
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.2, ease: [0.34, 1.56, 0.64, 1] as [number,number,number,number] }}
              className="absolute bottom-6 left-6 rounded-2xl px-5 py-4 z-10"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#ff2c91] flex items-center justify-center shrink-0">
                  <Star size={15} fill="white" color="white" />
                </div>
                <div>
                  <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-[#ff2c91] mb-0.5">National Title</p>
                  <p className="text-sm font-bold text-white leading-tight">One trophy.<br />Ultimate pride.</p>
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
        className="lg:hidden mx-4 sm:mx-8 mb-8 rounded-2xl overflow-hidden h-56 relative"
        style={{ boxShadow: '0 0 40px rgba(255,44,145,0.2)' }}
      >
        <img
          src="/hero-photo.webp"
          alt="Netball action"
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(255,44,145,0.2) 0%, transparent 60%)' }} />
      </motion.div>
    </section>
  )
}
