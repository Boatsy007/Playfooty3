import { motion } from 'framer-motion'
import { Users, Luggage, Star, Check } from 'lucide-react'

const bringTheClub = [
  'A Grade Players', 'B Grade Players', 'C Grade Players', 'D Grade Players',
  'Coaches', 'Committee Members', 'Partners', 'Families', 'Supporters',
]

const travelItems = [
  'Accommodation Packages', 'Team Packages', 'Club Packages',
  'Group Bookings', 'Supporter Packages', 'Flexible Payment Options',
]

const weekend = [
  'Compete against the best country clubs in Australia.',
  'Celebrate your season with unforgettable experiences.',
  'Create memories that last a lifetime.',
]

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.65, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] },
  }),
}

const checkVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}

const checkItem = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.35 } },
}

export default function HowItWorks() {
  return (
    <section id="format" className="bg-white py-16 lg:py-20 border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-8">

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-4 mb-3">
            <div className="h-px w-16 bg-[#ff2c91]" />
            <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-[#ff2c91]">The Experience</span>
            <div className="h-px w-16 bg-[#ff2c91]" />
          </div>
          <h2 className="font-display text-[#1a1a1a]" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}>
            BUILT FOR THE WHOLE CLUB
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Card 1 — Hot Pink */}
          <motion.div
            custom={0}
            variants={cardVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            whileHover={{ y: -6, boxShadow: '0 20px 60px rgba(255,44,145,0.35)', transition: { duration: 0.25 } }}
            className="rounded-2xl p-8 cursor-default"
            style={{ background: '#ff2c91' }}
          >
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-5">
              <Users size={22} color="white" />
            </div>
            <h3 className="font-display text-white leading-none mb-1" style={{ fontSize: '1.75rem' }}>
              BRING THE
            </h3>
            <h3 className="font-display text-white/60 leading-none mb-0" style={{ fontSize: '1.75rem' }}>
              WHOLE CLUB
            </h3>
            <div className="h-[2px] w-10 bg-white/40 mt-3 mb-5 rounded-full" />
            <motion.div
              variants={checkVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-y-2 gap-x-4"
            >
              {bringTheClub.map(it => (
                <motion.div key={it} variants={checkItem} className="flex items-center gap-1.5">
                  <Check size={12} style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }} />
                  <span className="text-xs font-semibold text-white/75">{it}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Card 2 — Dark */}
          <motion.div
            custom={1}
            variants={cardVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            whileHover={{ y: -6, transition: { duration: 0.25 } }}
            className="rounded-2xl p-8 cursor-default"
            style={{ background: '#1a1a1a' }}
          >
            <div className="w-14 h-14 rounded-full bg-[#ff2c91] flex items-center justify-center mb-5">
              <Luggage size={22} color="white" />
            </div>
            <h3 className="font-display text-white leading-none mb-1" style={{ fontSize: '1.75rem' }}>
              TRAVEL
            </h3>
            <h3 className="font-display leading-none mb-1" style={{ fontSize: '1.75rem', color: '#ff2c91' }}>
              PACKAGES
            </h3>
            <h3 className="font-display text-white leading-none" style={{ fontSize: '1.75rem' }}>
              AVAILABLE
            </h3>
            <div className="h-[2px] w-10 bg-[#ff2c91] mt-3 mb-5 rounded-full" />
            <motion.div
              variants={checkVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="space-y-2.5"
            >
              {travelItems.map(it => (
                <motion.div key={it} variants={checkItem} className="flex items-center gap-2">
                  <Check size={12} style={{ color: '#ff2c91', flexShrink: 0 }} />
                  <span className="text-xs font-semibold text-white/70">{it}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Card 3 — Gold */}
          <motion.div
            custom={2}
            variants={cardVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            whileHover={{ y: -6, boxShadow: '0 20px 60px rgba(244,193,77,0.3)', transition: { duration: 0.25 } }}
            className="rounded-2xl p-8 cursor-default"
            style={{ background: '#f4c14d' }}
          >
            <div className="w-14 h-14 rounded-full bg-[#1a1a1a]/20 flex items-center justify-center mb-5">
              <Star size={22} color="#1a1a1a" />
            </div>
            <h3 className="font-display text-[#1a1a1a] leading-[0.95] mb-2" style={{ fontSize: '1.75rem' }}>
              ONE WEEKEND.<br />EVERYTHING<br />YOUR CLUB<br />DESERVES.
            </h3>
            <div className="h-[2px] w-10 bg-[#1a1a1a]/30 mt-3 mb-5 rounded-full" />
            <div className="space-y-4">
              {weekend.map((text, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-[#1a1a1a]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1a1a1a]" />
                  </div>
                  <p className="text-[#1a1a1a]/80 text-sm font-medium leading-snug">{text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
