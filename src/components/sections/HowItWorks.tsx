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
    title: 'Win Your Premiership',
    body: 'A Grade country premiership clubs are eligible for invitation. Win your local competition and you earn the right to be here.',
    note: null,
  },
  {
    num: '02',
    icon: Mail,
    title: 'Receive An Invitation',
    body: 'Premier clubs are invited first. Runner-up wildcard spots may be offered if a premier cannot attend.',
    note: 'Runner-up clubs may be offered a wildcard if the premier cannot attend.',
  },
  {
    num: '03',
    icon: CheckCircle,
    title: 'Secure Your Place',
    body: "Confirm your club's interest and accommodation needs. Your dedicated contact guides you through the rest.",
    note: null,
  },
  {
    num: '04',
    icon: Swords,
    title: 'Compete On The Gold Coast',
    body: 'Play for the national country club title across the CNCA weekend. One match. One title.',
    note: null,
  },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
}

const stepVariants = {
  hidden: { opacity: 0, x: -32 },
  show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
}

export default function HowItWorks() {
  const lineRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        lineRef.current,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 65%',
            end: 'bottom 55%',
            scrub: 1,
          },
        }
      )
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="how-it-works" className="bg-surface py-20 lg:py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="h-px w-8 bg-pink" />
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-pink">The Process</span>
            <div className="h-px w-8 bg-pink" />
          </div>
          <h2 className="font-display leading-none text-navy" style={{ fontSize: 'clamp(2.8rem, 6vw, 5rem)' }}>
            HOW IT <span className="text-pink">WORKS</span>
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="relative max-w-3xl mx-auto">
          {/* Animated connecting line */}
          <div className="absolute left-7 md:left-9 top-10 bottom-10 w-[2px] bg-gray-200 hidden md:block overflow-hidden">
            <div
              ref={lineRef}
              className="absolute top-0 left-0 w-full bg-pink origin-top"
              style={{ height: '100%' }}
            />
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="space-y-6"
          >
            {steps.map(({ num, icon: Icon, title, body, note }) => (
              <motion.div
                key={num}
                variants={stepVariants}
                className="relative flex gap-6 md:gap-10 items-start"
              >
                {/* Circle */}
                <div className="shrink-0 relative z-10">
                  <div className="w-14 h-14 md:w-[72px] md:h-[72px] rounded-2xl bg-white border-2 border-pink/20 flex flex-col items-center justify-center shadow-sm hover:border-pink hover:shadow-pink transition-all duration-300 group">
                    <Icon size={20} className="text-pink mb-0.5" />
                    <span className="text-[9px] font-bold text-pink/60 tracking-widest">{num}</span>
                  </div>
                </div>

                {/* Content card */}
                <div className="flex-1 bg-white rounded-2xl border border-gray-100 px-6 py-5 hover:border-pink/30 hover:shadow-sm transition-all duration-300">
                  <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-pink mb-1">
                    Step {num}
                  </div>
                  <h3 className="font-display text-[clamp(1.4rem,3vw,2rem)] text-navy leading-none mb-2">
                    {title}
                  </h3>
                  <p className="text-navy/60 text-sm leading-relaxed mb-3">{body}</p>
                  {note && (
                    <div className="inline-flex items-start gap-2 bg-gold/8 border border-gold/30 rounded-xl px-4 py-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 shrink-0" />
                      <p className="text-xs text-navy/65 font-medium leading-snug">{note}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Bottom pill */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex justify-center mt-14"
        >
          <div className="inline-flex items-center gap-3 bg-navy text-white text-[11px] font-bold tracking-[0.14em] uppercase px-8 py-4 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-pink inline-block" />
            Invitation only · A Grade premiership clubs · Limited places
            <span className="w-1.5 h-1.5 rounded-full bg-pink inline-block" />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
