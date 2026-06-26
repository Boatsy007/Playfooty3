import { motion } from 'framer-motion'
import { Calendar, MapPin, ChevronDown } from 'lucide-react'
import Button from '../ui/Button'
import StatCounter from '../ui/StatCounter'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay },
})

const stats = [
  { value: 100, suffix: '+', label: 'Clubs' },
  { value: 4, suffix: '', label: 'Days' },
  { value: 4, suffix: '', label: 'All Grades' },
  { value: 10, prefix: '$', suffix: 'K', label: 'Club Grant' },
]

export default function Hero() {
  const scrollToExperience = () => {
    document.querySelector('#experience')?.scrollIntoView({ behavior: 'smooth' })
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

      {/* Pink accent line top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-pink-gradient z-10" />

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center">
        <div className="max-w-container mx-auto px-6 pt-24 pb-12 w-full">
          <div className="max-w-2xl">
            {/* Event badge */}
            <motion.div {...fadeUp(0.1)} className="flex flex-wrap items-center gap-3 mb-8">
              <span className="inline-flex items-center gap-1.5 bg-pink-500 text-white text-xs font-bold tracking-[0.12em] uppercase px-4 py-2 rounded-full">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                2026 Championships
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-xs font-semibold px-4 py-2 rounded-full border border-white/20">
                <MapPin size={11} />
                Gold Coast, Queensland
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1 {...fadeUp(0.2)} className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white leading-[1.0] tracking-tight mb-6">
              Australian Club<br />
              <span className="text-pink-400">Netball</span><br />
              Championships
            </motion.h1>

            {/* Subheadline */}
            <motion.p {...fadeUp(0.35)} className="text-lg md:text-xl text-white/85 font-medium mb-3 leading-relaxed">
              Australia's ultimate country netball experience.
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
                onClick={scrollToExperience}
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-bold text-white border-2 border-white/40 rounded-full hover:border-white hover:bg-white/10 transition-all duration-200"
              >
                Explore Experience
                <ChevronDown size={16} />
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="relative z-10 w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7 }}
          className="mx-4 md:mx-6 mb-0 max-w-container lg:mx-auto"
        >
          <div className="bg-white/10 nav-blur border border-white/20 rounded-2xl px-6 py-5 md:py-6 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4">
            {stats.map((stat) => (
              <StatCounter
                key={stat.label}
                value={stat.value}
                suffix={stat.suffix}
                prefix={stat.prefix}
                label={stat.label}
                light
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Pink bottom edge */}
      <div className="relative z-10 h-1.5 bg-pink-gradient mt-5" />
    </section>
  )
}
