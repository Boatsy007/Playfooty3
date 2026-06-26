import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Users, Building2, Sunset, MapPin, Check } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const options = [
  {
    num: '01',
    icon: Building2,
    title: 'Team Accommodation',
    desc: 'Options for your full playing squad, close to the championship venue.',
  },
  {
    num: '02',
    icon: Users,
    title: 'Club Group Bookings',
    desc: 'Larger group accommodation to keep the whole club together.',
  },
  {
    num: '03',
    icon: Sunset,
    title: 'Family Accommodation',
    desc: 'Family-friendly options near the venue and Gold Coast beaches.',
  },
  {
    num: '04',
    icon: MapPin,
    title: 'Supporter Options',
    desc: 'Flexible options for individual supporters travelling with the club.',
  },
]

const rowVariants = {
  hidden: { opacity: 0, y: 40 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
}

export default function Accommodation() {
  const sectionRef = useRef<HTMLElement>(null)
  const numRefs = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    const ctx = gsap.context(() => {
      numRefs.current.forEach((el, i) => {
        if (!el) return
        gsap.from(el, {
          textContent: '00',
          duration: 0.8,
          delay: i * 0.12,
          snap: { textContent: 1 },
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            once: true,
          },
        })
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="accommodation" className="bg-navy overflow-hidden">
      <div className="section-pad">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="mb-16 max-w-2xl"
        >
          <div className="w-12 h-[3px] bg-pink mb-6" />
          <div className="text-xs font-bold tracking-[0.18em] uppercase text-pink mb-4">Accommodation</div>
          <h2 className="font-display text-display-md text-white leading-none mb-6">
            MAKE THE<br />TRIP EASY
          </h2>
          <p className="text-white/50 text-lg leading-relaxed">
            Group accommodation options for every part of the travelling club — from players to supporters.
          </p>
        </motion.div>

        {/* Option rows */}
        <div className="divide-y divide-white/10 mb-16">
          {options.map(({ num, icon: Icon, title, desc }, i) => (
            <motion.div
              key={num}
              custom={i}
              variants={rowVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-40px' }}
              className="group flex items-center gap-6 md:gap-12 py-8 cursor-default hover:pl-4 transition-all duration-500"
            >
              {/* Number */}
              <div className="w-16 shrink-0">
                <span
                  ref={el => { numRefs.current[i] = el }}
                  className="font-display text-[clamp(2rem,5vw,3.5rem)] text-white/15 group-hover:text-pink leading-none transition-colors duration-400"
                >
                  {num}
                </span>
              </div>

              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-pink/40 group-hover:bg-pink/10 transition-all duration-400">
                <Icon size={18} className="text-white/40 group-hover:text-pink transition-colors duration-400" />
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="font-display text-[clamp(1.4rem,3vw,2rem)] text-white leading-none mb-2">
                  {title}
                </h3>
                <p className="text-white/45 text-base leading-snug font-medium">
                  {desc}
                </p>
              </div>

              {/* Check */}
              <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-9 h-9 rounded-full bg-pink/15 border border-pink/30 flex items-center justify-center">
                  <Check size={14} className="text-pink" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom callout strip */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="glass rounded-2xl p-8 md:p-10"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
            <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center shrink-0">
              <Building2 size={18} className="text-gold" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-white mb-2 text-base">Flexible Payment Options</h4>
              <p className="text-white/55 text-sm leading-relaxed">
                Flexible payment options available for group bookings. Register interest and we'll connect you with the right accommodation partners.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
