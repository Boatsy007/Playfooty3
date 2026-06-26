import { motion } from 'framer-motion'
import { Lock, MapPin } from 'lucide-react'

const stats = [
  { value: 'A Grade', label: 'Championship' },
  { value: 'Premiers', label: 'Invitation Only' },
  { value: '4 Days', label: '5–8 Nov 2026' },
  { value: 'Gold Coast', label: 'Queensland' },
]

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
})

export default function Hero() {
  const scrollTo = (id: string) =>
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section className="pt-[72px] bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 min-h-[calc(100vh-72px)]">

          {/* Left: text column */}
          <div className="flex flex-col justify-center px-6 sm:px-10 lg:px-16 py-12 lg:py-16">

            <motion.div {...fade(0.1)} className="flex flex-wrap gap-2 mb-6">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] uppercase text-pink bg-pink-muted px-3 py-1.5 rounded-full">
                <Lock size={9} />
                Invitation Only
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] uppercase text-navy/60 bg-navy-muted px-3 py-1.5 rounded-full">
                <MapPin size={9} />
                Gold Coast, QLD
              </span>
            </motion.div>

            <motion.p
              {...fade(0.2)}
              className="text-xs font-bold tracking-[0.2em] uppercase text-pink mb-4"
            >
              Australia's ultimate country netball experience
            </motion.p>

            <div className="mb-6">
              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                className="font-display leading-none text-navy"
                style={{ fontSize: 'clamp(2.2rem, 6.5vw, 6rem)' }}
              >
                COUNTRY<br />
                <span className="text-pink">NETBALL</span><br />
                CHAMPIONSHIPS<br />
                AUSTRALIA
              </motion.h1>
            </div>

            <motion.div
              {...fade(0.4)}
              className="mb-5"
            >
              <div className="border-l-4 border-pink pl-4">
                <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-navy/50 leading-loose">
                  Thursday 5 November 2026 to Sunday 8 November 2026
                </p>
              </div>
            </motion.div>

            <motion.p
              {...fade(0.5)}
              className="font-display tracking-wide mb-3"
              style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.9rem)', color: '#081a3d' }}
            >
              PLAY.{' '}
              <span className="text-pink">TRAVEL.</span>{' '}
              CELEBRATE.
            </motion.p>

            <motion.p
              {...fade(0.6)}
              className="text-navy/60 text-base leading-relaxed max-w-md mb-8"
            >
              An invitation-only A Grade championship for premiership-winning country
              netball clubs — built into a Gold Coast end-of-season club experience.
            </motion.p>

            <motion.div {...fade(0.7)} className="flex flex-wrap gap-3">
              <button
                onClick={() => scrollTo('#register')}
                className="bg-pink hover:bg-pink-dark text-white font-bold text-sm px-8 py-4 rounded-full transition-all duration-200 shadow-pink hover:shadow-pink-lg"
              >
                Request Invitation
              </button>
              <button
                onClick={() => scrollTo('#how-it-works')}
                className="text-navy font-bold text-sm px-8 py-4 rounded-full border-2 border-navy/20 hover:border-pink hover:text-pink transition-all duration-200"
              >
                How It Works
              </button>
            </motion.div>
          </div>

          {/* Right: image column — desktop only */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="relative hidden lg:block"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-pink/8 to-transparent z-10 pointer-events-none" />
            <img
              src="https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=900&q=85&auto=format&fit=crop&crop=center"
              alt="Netball championship"
              className="w-full h-full object-cover object-center"
              loading="eager"
            />
            {/* Floating card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.85, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
              className="absolute top-10 right-10 bg-white rounded-2xl px-5 py-4 shadow-glass z-20"
            >
              <p className="text-[9px] font-bold tracking-widest uppercase text-pink mb-2">One National Title</p>
              <p className="font-display text-navy text-xl leading-tight">Country clubs.<br/>One trophy.<br/><span className="text-pink">Ultimate pride.</span></p>
            </motion.div>
          </motion.div>
        </div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.85 }}
          className="border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4"
        >
          {stats.map(({ value, label }, i) => (
            <div
              key={label}
              className={`py-6 px-6 text-center ${i < stats.length - 1 ? 'border-r border-gray-100' : ''}`}
            >
              <div className="font-display text-[clamp(1.5rem,2.5vw,2.2rem)] text-navy leading-none mb-1">
                {value}
              </div>
              <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-navy/40">
                {label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Mobile image */}
        <div className="lg:hidden relative h-60 sm:h-72 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&q=80&auto=format&fit=crop"
            alt="Netball championship"
            className="w-full h-full object-cover object-top"
          />
        </div>
      </div>
    </section>
  )
}
