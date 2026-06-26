import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Mail, CheckCircle, Swords } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const steps = [
  {
    num: '01',
    icon: Trophy,
    title: 'WIN YOUR PREMIERSHIP',
    body: 'A Grade country premiership clubs are eligible for invitation. Win your local competition and you earn the right to be here.',
    note: null,
  },
  {
    num: '02',
    icon: Mail,
    title: 'RECEIVE AN INVITATION',
    body: 'Premier clubs are contacted first. Invitations are limited and allocated to committed clubs ready to represent their region.',
    note: 'Runner-up clubs may be offered a wildcard invitation if the premier cannot attend.',
  },
  {
    num: '03',
    icon: CheckCircle,
    title: 'SECURE YOUR PLACE',
    body: "Confirm your club's participation and register accommodation interest. Your dedicated contact handles everything from here.",
    note: null,
  },
  {
    num: '04',
    icon: Swords,
    title: 'COMPETE ON THE GOLD COAST',
    body: 'Your A Grade team takes the court against the best country premiership clubs in Australia. Play for the CNCA title.',
    note: null,
  },
]

const rowVariants = {
  hidden: { opacity: 0, x: -40 },
  show: (i: number) => ({
    opacity: 1, x: 0,
    transition: { duration: 0.8, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
}

export default function HowItWorks() {
  const lineRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(lineRef.current, { scaleY: 0 }, {
        scaleY: 1, ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 65%',
          end: 'bottom 55%',
          scrub: 1.2,
        },
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="how-it-works" className="noise overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #040e22 0%, #081a3d 60%, #0a1535 100%)' }}>

      {/* Pink glow top right */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,44,145,0.1) 0%, transparent 70%)' }} />

      <div className="relative z-10 max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12 py-24 lg:py-32">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="mb-20"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="h-[3px] w-10 bg-[#ff2c91]" />
            <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-[#ff2c91]">The Process</span>
          </div>
          <h2 className="font-display leading-none text-white"
            style={{ fontSize: 'clamp(3.5rem, 8vw, 9rem)' }}>
            HOW IT<br /><span style={{ color: '#ff2c91' }}>WORKS</span>
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Animated vertical line */}
          <div className="absolute left-[27px] md:left-[35px] top-4 bottom-4 w-[2px] bg-white/8 hidden md:block overflow-hidden">
            <div ref={lineRef} className="absolute top-0 left-0 w-full origin-top"
              style={{ height: '100%', background: '#ff2c91' }} />
          </div>

          <div className="space-y-5">
            {steps.map(({ num, icon: Icon, title, body, note }, i) => (
              <motion.div
                key={num}
                custom={i}
                variants={rowVariants}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-60px' }}
                className="group relative flex gap-6 md:gap-12 items-start"
              >
                {/* Circle */}
                <div className="shrink-0 relative z-10">
                  <div className="w-14 h-14 md:w-[70px] md:h-[70px] rounded-2xl flex flex-col items-center justify-center transition-all duration-400 group-hover:scale-105"
                    style={{ background: 'rgba(255,44,145,0.08)', border: '1px solid rgba(255,44,145,0.2)' }}>
                    <Icon size={18} style={{ color: '#ff2c91' }} className="mb-0.5" />
                    <span className="text-[9px] font-bold tracking-widest" style={{ color: 'rgba(255,44,145,0.6)' }}>{num}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 rounded-2xl px-7 py-6 transition-all duration-400 group-hover:bg-white/3"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  {/* Ghost big number */}
                  <div className="absolute top-0 right-6 font-display text-[8rem] leading-none text-white/[0.03] select-none pointer-events-none">{num}</div>

                  <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: '#ff2c91' }}>
                    Step {num}
                  </div>
                  <h3 className="font-display text-white leading-none mb-3"
                    style={{ fontSize: 'clamp(1.6rem, 3vw, 2.5rem)' }}>
                    {title}
                  </h3>
                  <p className="text-white/50 text-base leading-relaxed mb-4 max-w-2xl">{body}</p>
                  {note && (
                    <div className="inline-flex items-start gap-3 rounded-xl px-4 py-3"
                      style={{ background: 'rgba(244,193,77,0.08)', border: '1px solid rgba(244,193,77,0.25)' }}>
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#f4c14d' }} />
                      <p className="text-sm font-medium leading-snug" style={{ color: 'rgba(244,193,77,0.85)' }}>{note}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom pill */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="flex justify-center mt-20"
        >
          <div className="inline-flex items-center gap-3 text-white text-[11px] font-bold tracking-[0.16em] uppercase px-9 py-4 rounded-full"
            style={{ background: 'rgba(255,44,145,0.12)', border: '1px solid rgba(255,44,145,0.25)' }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#ff2c91' }} />
            Invitation only · A Grade premiership clubs · Limited places
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#ff2c91' }} />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
