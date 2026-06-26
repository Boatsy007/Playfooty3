import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Trophy, PartyPopper, Utensils, Camera, Video, Award, Hotel, Users, Palmtree } from 'lucide-react'

const items = [
  { icon: Trophy, label: 'A Grade Championship', desc: 'Compete for the national title' },
  { icon: PartyPopper, label: 'Welcome Function', desc: 'Official opening night celebration' },
  { icon: Utensils, label: 'Food & Entertainment', desc: 'Festival atmosphere all weekend' },
  { icon: Camera, label: 'Professional Photography', desc: 'Every team photographed' },
  { icon: Video, label: 'Livestream Highlights', desc: 'Finals broadcast nationally' },
  { icon: Award, label: 'Awards Presentation', desc: 'Champion club ceremony' },
  { icon: Hotel, label: 'Accommodation Options', desc: 'Group packages available' },
  { icon: Palmtree, label: 'Gold Coast Weekend', desc: 'Beaches, sun & attractions' },
  { icon: Users, label: 'Supporter Experience', desc: 'Built for the whole club' },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
}

export default function Experience() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="experience" className="bg-white py-20 lg:py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="h-px w-8 bg-pink" />
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-pink">The Experience</span>
            <div className="h-px w-8 bg-pink" />
          </div>
          <h2 className="font-display leading-none text-navy mb-4" style={{ fontSize: 'clamp(2.8rem, 6vw, 5rem)' }}>
            MORE THAN A<br />
            <span className="text-pink">TOURNAMENT</span>
          </h2>
          <p className="text-navy/55 text-lg max-w-xl mx-auto leading-relaxed">
            CNCA is built around the A Grade championship — and the whole weekend is designed
            for every person who makes your club what it is.
          </p>
        </motion.div>

        {/* Icon grid */}
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'show' : 'hidden'}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {items.map(({ icon: Icon, label, desc }, i) => (
            <motion.div
              key={label}
              variants={itemVariants}
              className={`group relative bg-white border border-gray-100 rounded-2xl p-6 hover:border-pink/40 hover:shadow-pink transition-all duration-300 cursor-default ${
                i === 0 ? 'lg:col-span-2 sm:col-span-2' : ''
              }`}
            >
              {/* Pink left accent on hover */}
              <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-pink scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center" />

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-pink-muted group-hover:bg-pink flex items-center justify-center shrink-0 transition-colors duration-300">
                  <Icon size={20} className="text-pink group-hover:text-white transition-colors duration-300" />
                </div>
                <div>
                  <h3 className="font-bold text-navy text-base mb-1">{label}</h3>
                  <p className="text-navy/50 text-sm leading-snug">{desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
