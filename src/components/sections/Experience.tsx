import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Trophy, PartyPopper, Music, Camera, Video, Award, Hotel, Users, Palmtree } from 'lucide-react'

const items = [
  { icon: Trophy, label: 'A Grade Championship', color: 'bg-pink-DEFAULT', text: 'Compete for the national title' },
  { icon: PartyPopper, label: 'Welcome Function', color: 'bg-navy-DEFAULT', text: 'Open night celebration' },
  { icon: Award, label: 'Awards Presentation', color: 'bg-pink-DEFAULT', text: 'Champion club ceremony' },
  { icon: Camera, label: 'Professional Photography', color: 'bg-navy-DEFAULT', text: 'Every team photographed' },
  { icon: Video, label: 'Livestream Coverage', color: 'bg-pink-DEFAULT', text: 'Finals broadcast nationally' },
  { icon: Music, label: 'Food & Entertainment', color: 'bg-navy-DEFAULT', text: 'Festival atmosphere all weekend' },
  { icon: Palmtree, label: 'Gold Coast Weekend', color: 'bg-pink-DEFAULT', text: 'Beaches & attractions' },
  { icon: Hotel, label: 'Accommodation Options', color: 'bg-navy-DEFAULT', text: 'Group packages available' },
  { icon: Users, label: 'Supporter Experience', color: 'bg-pink-DEFAULT', text: 'Built for the whole club' },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
}

export default function Experience() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="experience" className="bg-white overflow-hidden">
      <div className="section-pad">
        <div className="grid lg:grid-cols-[1fr,1.6fr] gap-16 items-start">

          {/* Left — editorial headline */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="lg:sticky lg:top-28"
          >
            <div className="section-divider mb-6" />
            <div className="text-xs font-bold tracking-[0.18em] uppercase text-pink-DEFAULT mb-4">The Experience</div>
            <h2 className="font-display text-[clamp(3.5rem,7vw,6rem)] leading-none text-navy-DEFAULT mb-6">
              MORE<br />THAN A<br />TOURNAMENT
            </h2>
            <p className="text-navy-DEFAULT/60 text-lg leading-relaxed max-w-sm mb-8">
              CNCA is built around the A Grade championship — but the weekend is designed for every person who makes your club what it is.
            </p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-pink-DEFAULT/10 flex items-center justify-center">
                <Trophy size={20} className="text-pink-DEFAULT" />
              </div>
              <div>
                <p className="text-sm font-bold text-navy-DEFAULT">A Grade Championship</p>
                <p className="text-xs text-navy-DEFAULT/50">The main competition</p>
              </div>
            </div>
          </motion.div>

          {/* Right — asymmetric mosaic */}
          <motion.div
            ref={ref}
            variants={containerVariants}
            initial="hidden"
            animate={inView ? 'show' : 'hidden'}
            className="grid grid-cols-2 sm:grid-cols-3 gap-3"
          >
            {items.map(({ icon: Icon, label, text }, i) => (
              <motion.div
                key={label}
                variants={itemVariants}
                className={`group relative rounded-2xl p-5 card-lift border border-navy-DEFAULT/8 bg-white card-2
                  ${i === 0 ? 'sm:col-span-2 row-span-1' : ''}
                  ${i === 4 ? 'sm:col-span-2' : ''}
                `}
              >
                <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl bg-pink-DEFAULT opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-9 h-9 rounded-xl bg-navy-DEFAULT/5 group-hover:bg-pink-DEFAULT flex items-center justify-center mb-3 transition-colors duration-300">
                  <Icon size={16} className="text-navy-DEFAULT/70 group-hover:text-white transition-colors duration-300" />
                </div>
                <p className="text-sm font-bold text-navy-DEFAULT mb-1 leading-snug">{label}</p>
                <p className="text-xs text-navy-DEFAULT/50 leading-snug">{text}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
