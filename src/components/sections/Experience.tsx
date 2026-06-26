import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Trophy, PartyPopper, Utensils, Music, Camera, Video, Award, Bus, Palmtree } from 'lucide-react'

const items = [
  { icon: Trophy, label: 'National Championship' },
  { icon: PartyPopper, label: 'Welcome Party' },
  { icon: Utensils, label: 'Food Trucks' },
  { icon: Music, label: 'Live Entertainment' },
  { icon: Camera, label: 'Professional Photography' },
  { icon: Video, label: 'Livestream Coverage' },
  { icon: Award, label: 'Awards Night' },
  { icon: Bus, label: 'Club Travel Packages' },
  { icon: Palmtree, label: 'Gold Coast Experiences' },
]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}

const item = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] } },
}

export default function Experience() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section id="experience" className="py-16 lg:py-20 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #fff0f8 0%, #fff6fb 100%)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
          className="text-center mb-14"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="h-px flex-1 max-w-[80px] bg-[#ff2c91] origin-right"
            />
            <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-[#ff2c91]">More Than A Tournament</span>
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="h-px flex-1 max-w-[80px] bg-[#ff2c91] origin-left"
            />
          </div>
          <h2 className="font-display text-[#1a1a1a]" style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.8rem)' }}>
            EVERYTHING YOUR CLUB DESERVES
          </h2>
        </motion.div>

        {/* Icon grid */}
        <motion.div
          ref={ref}
          variants={container}
          initial="hidden"
          animate={inView ? 'show' : 'hidden'}
          className="grid grid-cols-3 lg:grid-cols-9 gap-2 lg:gap-0"
        >
          {items.map(({ icon: Icon, label }) => (
            <motion.div
              key={label}
              variants={item}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group flex flex-col items-center text-center gap-3 py-5 px-2 rounded-2xl cursor-default transition-colors duration-200 hover:bg-white/70"
            >
              <motion.div
                className="icon-circle transition-all duration-200 group-hover:shadow-md"
                style={{ background: '#fff0f8' }}
                whileHover={{ scale: 1.12, backgroundColor: '#ff2c91' }}
                transition={{ duration: 0.2 }}
              >
                <Icon size={22} className="text-[#ff2c91] group-hover:text-white transition-colors duration-200" />
              </motion.div>
              <span className="text-[10px] lg:text-xs font-bold text-[#1a1a1a]/70 leading-tight uppercase tracking-wide group-hover:text-[#ff2c91] transition-colors duration-200">
                {label}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
