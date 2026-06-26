import { motion } from 'framer-motion'
import { Calendar, MapPin, Lock } from 'lucide-react'
import Button from '../ui/Button'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay },
})

const stats = [
  { label: 'A Grade', sub: 'Championship' },
  { label: 'Premiers', sub: 'Invitation Only' },
  { label: '4 Days', sub: '5–8 Nov 2026' },
  { label: 'Gold Coast', sub: 'Queensland' },
]

export default function Hero() {
  const scrollToFormat = () => {
    document.querySelector('#format')?.scrollIntoView({ behavior: 'smooth' })
  }
  const scrollToRegister = () => {
    document.querySelector('#register')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative w-full min-h-screen flex flex-col">
      {/* Background Image */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=1920&q=85&auto=format&fit=crop"
          alt="Netball action"
          className="w-full h-full object-cover object-center"
        />
        <div className="hero-overlay absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900/60 via-transparent to-transparent" />
      </div>

      {/* Pink accent top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-pink-gradient z-10" />

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center">
        <div className="max-w-container mx-auto px-6 pt-24 pb-12 w-full">
          <div className="max-w-2xl">

            {/* Invitation badge */}
            <motion.div {...fadeUp(0.1)} className="flex flex-wrap items-center gap-3 mb-8">
              <span className="inline-flex items-center gap-1.5 bg-pink-500 text-white text-xs font-bold tracking-[0.12em] uppercase px-4 py-2 rounded-full">
                <Lock size={10} />
                Invitation Only
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-xs font-semibold px-4 py-2 rounded-full border border-white/20">
                <MapPin size={11} />
                Gold Coast, Queensland
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1 {...fadeUp(0.2)} className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white leading-[1.02] tracking-tight mb-6">
              Country Netball<br />
              <span className="text-pink-400">Championships</span><br />
              Australia
            </motion.h1>

            {/* Subheadline */}
            <motion.p {...fadeUp(0.35)} className="text-lg md:text-xl text-white/85 font-medium mb-3 leading-relaxed max-w-xl">
              Australia's invitation-only country netball championship for A Grade premiership clubs.
            </motion.p>

            {/* Date */}
            <motion.div {...fadeUp(0.42)} className="flex items-center gap-2 text-white/70 text-sm font-medium mb-10">
              <Calendar size={15} className="text-pink-400" />
              <span>5–8 November 2026 · Gold Coast, Queensland</span>
            </motion.div>

            {/* CTAs */}
            <motion.div {...fadeUp(0.5)} className="flex flex-wrap gap-3">
              <Button size="lg" onClick={scrollToRegister}>
                Request Invitation
              </Button>
              <button
                onClick={scrollToFormat}
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-bold text-white border-2 border-white/40 rounded-full hover:border-white hover:bg-white/10 transition-all duration-200"
              >
                How It Works
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="relative z-10 w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7 }}
          className="mx-4 md:mx-6 mb-0 max-w-container lg:mx-auto"
        >
          <div className="bg-white/10 nav-blur border border-white/20 rounded-2xl px-6 py-5 md:py-6 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4">
            {stats.map(({ label, sub }) => (
              <div key={label} className="text-center">
                <div className="text-2xl md:text-3xl font-extrabold text-white leading-none">{label}</div>
                <div className="text-xs font-semibold tracking-widest uppercase mt-1.5 text-white/60">{sub}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Pink bottom edge */}
      <div className="relative z-10 h-1.5 bg-pink-gradient mt-5" />
    </section>
  )
}
