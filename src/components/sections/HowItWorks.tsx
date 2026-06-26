import { motion } from 'framer-motion'
import { Users, Luggage, Star } from 'lucide-react'
import { Check } from 'lucide-react'

const bringTheClub = [
  'A Grade Players', 'B Grade Players', 'C Grade Players', 'D Grade Players',
  'Coaches', 'Committee Members', 'Partners', 'Families', 'Supporters',
]

const travelItems = [
  'Accommodation Packages', 'Team Packages', 'Club Packages',
  'Group Bookings', 'Supporter Packages', 'Flexible Payment Options',
]

const weekend = [
  { text: 'Compete against the best country clubs in Australia.' },
  { text: 'Celebrate your season with unforgettable experiences.' },
  { text: 'Create memories that last a lifetime.' },
]

export default function HowItWorks() {
  return (
    <section id="format" className="bg-white py-14 lg:py-20 border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Bring the Whole Club */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
            className="bg-[#fff0f8] rounded-2xl p-8"
          >
            <div className="icon-circle mb-5">
              <Users size={22} style={{ color: '#ff2c91' }} />
            </div>
            <h3 className="font-display text-[#1a1a1a] leading-none mb-2" style={{ fontSize: '1.8rem' }}>
              BRING THE<br /><span style={{ color: '#ff2c91' }}>WHOLE CLUB</span>
            </h3>
            <div className="h-[2px] w-10 bg-[#ff2c91] mt-3 mb-5" />
            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
              {bringTheClub.map(item => (
                <div key={item} className="flex items-center gap-2">
                  <Check size={13} style={{ color: '#ff2c91', flexShrink: 0 }} />
                  <span className="text-xs font-semibold text-[#1a1a1a]/75">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Travel Packages */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-[#1a1a1a] rounded-2xl p-8"
          >
            <div className="w-14 h-14 rounded-full bg-[#ff2c91] flex items-center justify-center mb-5">
              <Luggage size={22} style={{ color: '#ffffff' }} />
            </div>
            <h3 className="font-display text-white leading-none mb-2" style={{ fontSize: '1.8rem' }}>
              TRAVEL<br /><span style={{ color: '#ff2c91' }}>PACKAGES</span><br />AVAILABLE
            </h3>
            <div className="h-[2px] w-10 bg-[#ff2c91] mt-3 mb-5" />
            <div className="space-y-2.5">
              {travelItems.map(item => (
                <div key={item} className="flex items-center gap-2">
                  <Check size={13} style={{ color: '#ff2c91', flexShrink: 0 }} />
                  <span className="text-xs font-semibold text-white/75">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* One Weekend */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-[#ff2c91] rounded-2xl p-8"
          >
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-5">
              <Star size={22} style={{ color: '#ffffff' }} />
            </div>
            <h3 className="font-display text-white leading-none mb-2" style={{ fontSize: '1.8rem' }}>
              ONE WEEKEND.<br />EVERYTHING<br />YOUR CLUB<br />DESERVES.
            </h3>
            <div className="h-[2px] w-10 bg-white/40 mt-3 mb-5" />
            <div className="space-y-4">
              {weekend.map(({ text }, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                  </div>
                  <p className="text-white/90 text-sm font-medium leading-snug">{text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
