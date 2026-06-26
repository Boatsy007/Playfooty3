import { motion } from 'framer-motion'
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

export default function Experience() {
  return (
    <section id="experience" className="bg-[#fff0f8] py-14 lg:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-px flex-1 max-w-[80px]" style={{ background: '#ff2c91' }} />
            <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-[#ff2c91]">More Than A Tournament</span>
            <div className="h-px flex-1 max-w-[80px]" style={{ background: '#ff2c91' }} />
          </div>
          <h2 className="font-display text-[#1a1a1a]" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)' }}>
            EVERYTHING YOUR CLUB DESERVES
          </h2>
        </motion.div>

        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-9 gap-4">
          {items.map(({ icon: Icon, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="flex flex-col items-center text-center gap-3 p-4"
            >
              <div className="icon-circle">
                <Icon size={22} style={{ color: '#ff2c91' }} />
              </div>
              <span className="text-xs font-bold text-[#1a1a1a]/80 leading-tight uppercase tracking-wide">{label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
