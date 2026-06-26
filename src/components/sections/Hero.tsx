import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Lock, MapPin } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import MagneticButton from '../ui/MagneticButton'

gsap.registerPlugin(ScrollTrigger)

const words = ['COUNTRY', 'NETBALL', 'CHAMPIONSHIPS', 'AUSTRALIA']

const lineVariants = {
  hidden: { y: '110%', opacity: 0 },
  visible: (i: number) => ({
    y: '0%',
    opacity: 1,
    transition: { duration: 1, delay: 0.5 + i * 0.12, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
}

export default function Hero() {
  const imgRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!imgRef.current) return
      gsap.to(imgRef.current, {
        yPercent: 18,
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

  const scrollTo = (id: string) =>
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section ref={heroRef} className="relative min-h-screen noise overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #040e22 0%, #081a3d 50%, #0a1535 100%)' }}>

      {/* Pink atmospheric glow — top left */}
      <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,44,145,0.18) 0%, transparent 70%)' }} />

      {/* Pink glow — right mid */}
      <div className="absolute top-1/3 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,44,145,0.12) 0%, transparent 70%)' }} />

      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />

      <div className="relative z-10 max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12 min-h-screen flex flex-col">
        {/* Nav spacer */}
        <div className="h-[76px] shrink-0" />

        {/* Main grid */}
        <div className="flex-1 grid lg:grid-cols-[58%_42%] items-center gap-0">

          {/* Left: headline */}
          <div className="py-12 lg:py-20 lg:pr-12">
            {/* Badges */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap gap-2 mb-8"
            >
              <span className="badge-pink"><Lock size={9} />Invitation Only</span>
              <span className="badge-glass"><MapPin size={9} />Gold Coast, QLD</span>
              <span className="badge-glass">A Grade Premiers</span>
            </motion.div>

            {/* Eyebrow */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-white/40 text-[11px] font-bold tracking-[0.22em] uppercase mb-6"
            >
              Australia's Ultimate Country Netball Experience
            </motion.p>

            {/* Headline */}
            <div className="mb-8">
              {words.map((word, i) => (
                <div key={word} className="overflow-hidden">
                  <motion.span
                    custom={i}
                    variants={lineVariants}
                    initial="hidden"
                    animate="visible"
                    className="block font-display leading-[0.9] tracking-tight"
                    style={{
                      fontSize: 'clamp(3.5rem, 8.5vw, 9.5rem)',
                      color: word === 'NETBALL' ? '#ff2c91' : '#ffffff',
                    }}
                  >
                    {word}
                  </motion.span>
                </div>
              ))}
            </div>

            {/* Animated pink divider */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className="h-[3px] w-full bg-[#ff2c91] origin-left mb-7"
            />

            {/* Date row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="flex items-center gap-4 mb-5"
            >
              <span className="text-white/35 text-[11px] font-bold tracking-[0.18em] uppercase">
                5 – 8 November 2026
              </span>
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-white/35 text-[11px] font-bold tracking-[0.18em] uppercase">
                Gold Coast, Queensland
              </span>
            </motion.div>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.25 }}
              className="font-display tracking-wider text-white mb-2"
              style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.6rem)' }}
            >
              PLAY.&nbsp;
              <span style={{ color: '#ff2c91' }}>TRAVEL.</span>&nbsp;
              CELEBRATE.
            </motion.p>

            {/* Sub copy */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.32 }}
              className="text-white/45 text-base leading-relaxed max-w-lg mb-10"
            >
              An invitation-only A Grade championship for premiership-winning country
              netball clubs — built into a Gold Coast end-of-season club experience.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 }}
              className="flex flex-wrap gap-4"
            >
              <MagneticButton
                onClick={() => scrollTo('#register')}
                className="bg-[#ff2c91] hover:bg-[#cc1f6e] text-white font-bold text-sm px-10 py-4 rounded-full shadow-pink hover:shadow-pink-lg transition-all duration-300"
              >
                Request Invitation
              </MagneticButton>
              <button
                onClick={() => scrollTo('#how-it-works')}
                className="text-white font-semibold text-sm px-9 py-4 rounded-full border border-white/20 hover:border-[#ff2c91] hover:text-[#ff2c91] transition-all duration-300"
              >
                How It Works
              </button>
            </motion.div>
          </div>

          {/* Right: image — desktop */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.1, delay: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="relative hidden lg:block self-stretch overflow-hidden"
          >
            {/* Gradient background (shows if image doesn't load) */}
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(135deg, #1a0b3e 0%, #0f1f4d 40%, #1a0030 100%)' }} />

            {/* Parallax image */}
            <div ref={imgRef} className="absolute inset-0 scale-110">
              <img
                src="https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=900&q=90&auto=format&fit=crop&crop=center"
                alt="Netball championship action"
                className="w-full h-full object-cover object-center"
                loading="eager"
              />
            </div>

            {/* Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#040e22] via-[#040e22]/20 to-transparent z-10" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#040e22] via-transparent to-transparent z-10" />
            <div className="absolute inset-0 z-10" style={{ background: 'rgba(255,44,145,0.06)' }} />

            {/* Floating badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.5, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
              className="absolute top-10 right-10 z-20 glass rounded-2xl px-5 py-4"
            >
              <p className="text-[9px] font-bold tracking-[0.22em] uppercase mb-2" style={{ color: '#ff2c91' }}>
                One National Title
              </p>
              <p className="font-display text-white leading-snug" style={{ fontSize: '1.35rem' }}>
                Country clubs.<br />One trophy.<br /><span style={{ color: '#ff2c91' }}>Ultimate pride.</span>
              </p>
            </motion.div>

            {/* Vertical text */}
            <div className="absolute bottom-16 right-6 z-20 rotate-90 origin-right flex items-center gap-2">
              <div className="w-6 h-px bg-white/30" />
              <span className="text-white/25 text-[9px] font-bold tracking-[0.3em] uppercase whitespace-nowrap">
                Gold Coast 2026
              </span>
            </div>
          </motion.div>
        </div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="grid grid-cols-2 sm:grid-cols-4 border-t border-white/10"
        >
          {[
            { value: 'A Grade', label: 'Championship' },
            { value: 'Premiers', label: 'Invitation Only' },
            { value: '4 Days', label: '5–8 Nov 2026' },
            { value: 'Gold Coast', label: 'Queensland' },
          ].map(({ value, label }, i) => (
            <div key={label}
              className={`py-7 text-center ${i < 3 ? 'border-r border-white/10' : ''}`}
            >
              <div className="font-display text-white leading-none mb-1"
                style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)' }}>{value}</div>
              <div className="text-white/30 text-[10px] font-bold tracking-[0.18em] uppercase">{label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Mobile image */}
      <div className="lg:hidden relative h-52 sm:h-64 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&q=80&auto=format&fit=crop&crop=top"
          alt="Netball championship"
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(4,14,34,0.3), rgba(4,14,34,0.8))' }} />
      </div>
    </section>
  )
}
