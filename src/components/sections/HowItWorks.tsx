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
    title: 'Win Your Local Premiership',
    body: 'A Grade country premiership clubs are eligible for invitation. Win your local competition and you earn the right to be here.',
    note: null,
  },
  {
    num: '02',
    icon: Mail,
    title: 'Receive An Invitation',
    body: 'Premier clubs receive an official CNCA invitation to express interest. Invitations are limited and allocated to committed clubs.',
    note: 'Runner-up clubs may be offered a wildcard invitation if the premier cannot attend.',
  },
  {
    num: '03',
    icon: CheckCircle,
    title: 'Secure Your Place',
    body: "Confirm your club's participation and register accommodation interest. Your dedicated contact will guide you through everything.",
    note: null,
  },
  {
    num: '04',
    icon: Swords,
    title: 'Compete For The Title',
    body: 'Your A Grade team takes the court against the best country premiership clubs in Australia. Play for the CNCA title.',
    note: null,
  },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
}

const stepVariants = {
  hidden: { opacity: 0, y: 48 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
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
            start: 'top 60%',
            end: 'bottom 60%',
            scrub: 1,
          },
        }
      )
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="how-it-works" className="bg-surface overflow-hidden">
      <div className="section-pad">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="mb-20 max-w-xl"
        >
          <div className="section-divider mb-6" />
          <div className="text-xs font-bold tracking-[0.18em] uppercase text-pink-DEFAULT mb-4">The Process</div>
          <h2 className="font-display text-display-md text-navy-DEFAULT leading-none">
            HOW IT<br />WORKS
          </h2>
        </motion.div>

        {/* Steps with connecting line */}
        <div className="relative">
          {/* Vertical animated line */}
          <div className="absolute left-[27px] md:left-[39px] top-4 bottom-4 w-[2px] bg-navy-DEFAULT/10 hidden md:block overflow-hidden">
            <div
              ref={lineRef}
              className="absolute top-0 left-0 w-full bg-pink-DEFAULT origin-top"
              style={{ height: '100%' }}
            />
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="space-y-0"
          >
            {steps.map(({ num, icon: Icon, title, body, note }) => (
              <motion.div
                key={num}
                variants={stepVariants}
                className="relative flex gap-8 md:gap-16 items-start pb-16 last:pb-0 group"
              >
                {/* Circle marker */}
                <div className="flex flex-col items-center shrink-0 pt-1">
                  <div className="relative z-10 w-14 h-14 md:w-20 md:h-20 rounded-2xl bg-white border border-navy-DEFAULT/10 flex items-center justify-center shadow-glass transition-all duration-500 group-hover:border-pink-DEFAULT group-hover:shadow-pink">
                    <Icon size={22} className="text-pink-DEFAULT" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 pt-2 md:pt-3 relative">
                  {/* Big ghost number */}
                  <div className="font-display text-[clamp(5rem,12vw,9rem)] leading-none text-navy-DEFAULT/6 select-none absolute -top-8 right-0 pointer-events-none">
                    {num}
                  </div>
                  <div className="font-display text-sm tracking-[0.2em] text-pink-DEFAULT mb-2 uppercase">
                    Step {num}
                  </div>
                  <h3 className="font-display text-[clamp(1.8rem,4vw,3rem)] text-navy-DEFAULT leading-none mb-4">
                    {title}
                  </h3>
                  <p className="text-navy-DEFAULT/60 text-base md:text-lg leading-relaxed max-w-lg mb-5">
                    {body}
                  </p>
                  {note && (
                    <div className="inline-flex items-start gap-3 bg-white border border-gold-DEFAULT/40 rounded-xl px-4 py-3 max-w-lg">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold-DEFAULT mt-1.5 shrink-0" />
                      <p className="text-sm text-navy-DEFAULT/70 leading-snug font-medium">{note}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Bottom pill */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="mt-16 flex justify-center"
        >
          <div className="inline-flex items-center gap-3 bg-navy-DEFAULT text-white text-xs font-bold tracking-[0.15em] uppercase px-8 py-4 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-DEFAULT inline-block" />
            Invitation only · A Grade premiership clubs · Limited places
            <span className="w-1.5 h-1.5 rounded-full bg-pink-DEFAULT inline-block" />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
