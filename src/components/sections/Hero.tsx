import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Lock, MapPin, ChevronDown } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import MagneticButton from '../ui/MagneticButton'

gsap.registerPlugin(ScrollTrigger)

const stats = [
  { value: 'A Grade', label: 'Championship' },
  { value: 'Premiers', label: 'Invitation Only' },
  { value: '4 Days', label: '5–8 Nov 2026' },
  { value: 'Gold Coast', label: 'Queensland' },
]

const word_variants = {
  hidden: { y: 100, opacity: 0 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: { duration: 0.9, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
}

export default function Hero() {
  const imgRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const img = imgRef.current
    if (!img) return

    const ctx = gsap.context(() => {
      gsap.to(img, {
        yPercent: 25,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })
    })

    return () => ctx.revert()
  }, [])

  const scrollTo = (id: string) => document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })

  const headline = ['Country', 'Netball', 'Championships']

  return (
    <section ref={heroRef} className="relative w-full min-h-screen flex flex-col overflow-hidden">

      {/* Parallax BG image */}
      <div ref={imgRef} className="absolute inset-0 scale-110 will-change-transform">
        <img
          src="https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=1920&q=85&auto=format&fit=crop"
          alt=""
          className="w-full h-full object-cover object-center"
          loading="eager"
        />
      </div>

      {/* Overlay layers */}
      <div className="bg-hero-overlay absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#081a3d] via-transparent to-transparent" />

      {/* Pink top accent */}
      <div className="pink-line-top" />

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center">
        <div className="container-main w-full pt-28 pb-8">

          {/* Badges row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 2.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="flex flex-wrap gap-3 mb-10"
          >
            <span className="badge-pink">
              <Lock size={10} />
              Invitation Only
            </span>
            <span className="badge-glass">
              <MapPin size={10} />
              Gold Coast, Queensland
            </span>
            <span className="badge-glass">
              A Grade Premiership Clubs
            </span>
          </motion.div>

          {/* Headline — animated word by word */}
          <div className="mb-4">
            {headline.map((word, i) => (
              <div key={word} className="overflow-hidden block">
                <motion.span
                  custom={i}
                  variants={word_variants}
                  initial="hidden"
                  animate="visible"
                  className={`
                    block font-display leading-none tracking-wide
                    text-[clamp(4.5rem,11vw,10rem)]
                    ${i === 1 ? 'text-pink-grad' : 'text-white'}
                  `}
                  style={{ transitionDelay: `${2.0 + i * 0.1}s` }}
                >
                  {word}
                </motion.span>
              </div>
            ))}
            <div className="overflow-hidden">
              <motion.span
                custom={3}
                variants={word_variants}
                initial="hidden"
                animate="visible"
                className="block font-display leading-none tracking-wide text-white/90 text-[clamp(4.5rem,11vw,10rem)]"
              >
                Australia
              </motion.span>
            </div>
          </div>

          {/* Sub copy */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 2.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="text-white/70 text-lg md:text-xl font-medium max-w-lg mb-10 leading-relaxed"
          >
            Australia's invitation-only country netball championship for A Grade premiership clubs.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 2.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="flex flex-wrap gap-4"
          >
            <MagneticButton
              onClick={() => scrollTo('#register')}
              className="bg-pink-grad text-white font-bold text-sm px-9 py-4 rounded-full shadow-pink hover:shadow-pink-lg transition-shadow duration-300"
            >
              Request Invitation
            </MagneticButton>
            <button
              onClick={() => scrollTo('#experience')}
              className="inline-flex items-center gap-2 text-white font-semibold text-sm px-8 py-4 rounded-full border border-white/30 hover:border-white hover:bg-white/10 transition-all duration-300"
            >
              Explore Experience
              <ChevronDown size={15} />
            </button>
          </motion.div>
        </div>
      </div>

      {/* Glass stats bar */}
      <div className="relative z-10 container-main pb-0 w-full">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 3.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="glass rounded-2xl md:rounded-3xl px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-white/10"
        >
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center md:px-6 pt-4 md:pt-0 first:pt-0">
              <div className="font-display text-3xl md:text-4xl text-white leading-none mb-1">{value}</div>
              <div className="text-xs font-semibold text-white/55 tracking-widest uppercase">{label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.4 }}
        className="relative z-10 flex justify-center py-8"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="flex flex-col items-center gap-2 text-white/40 cursor-default"
        >
          <div className="w-5 h-8 border border-white/30 rounded-full flex justify-center pt-1.5">
            <div className="w-1 h-2 bg-white/60 rounded-full" />
          </div>
          <span className="text-[10px] tracking-widest uppercase font-medium">Scroll</span>
        </motion.div>
      </motion.div>

      {/* Pink bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-pink-grad" />
    </section>
  )
}
