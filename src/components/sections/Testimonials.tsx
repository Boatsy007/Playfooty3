import { motion } from 'framer-motion'
import { Trophy, Users, MapPin, Camera, Star } from 'lucide-react'
import SectionLabel from '../ui/SectionLabel'

const benefits = [
  {
    icon: Trophy,
    title: 'A national title to play for.',
    desc: 'For Senior players who have won their local premiership, PlayFooty is the next step — a national championship that measures your club against the best country clubs in Australia.',
    color: 'bg-pink-500',
  },
  {
    icon: Users,
    title: 'A reason to bring the whole club together.',
    desc: 'Winning a premiership is the perfect excuse for an end-of-season trip. PlayFooty gives your whole club — players, families, committee and supporters — a shared goal to travel toward.',
    color: 'bg-navy-700',
  },
  {
    icon: MapPin,
    title: 'A future host city end-of-season trip.',
    desc: 'Four days on the future host city is a reward in itself. Beaches, dining and attractions for every member of the travelling group — long after the final whistle.',
    color: 'bg-pink-500',
  },
  {
    icon: Camera,
    title: 'A professional event experience.',
    desc: 'Professional photography, a welcome function, a formal presentation ceremony and live coverage of key matches. This is a national event — run and presented at that standard.',
    color: 'bg-navy-700',
  },
  {
    icon: Star,
    title: 'A story your local league will remember.',
    desc: 'Representing your district at a national championship creates a story that lives in your club for years. It\'s a moment that defines a season — and a club.',
    color: 'bg-pink-500',
  },
]

const stateList = [
  'NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT',
  'NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT',
]

export default function Testimonials() {
  return (
    <section id="why-cnca" className="bg-white overflow-hidden">
      {/* State ticker */}
      <div className="bg-navy-700 py-3 overflow-hidden">
        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          className="flex gap-8 whitespace-nowrap"
        >
          {[...stateList, ...stateList].map((s, i) => (
            <span key={i} className="text-xs font-bold text-white/60 tracking-widest uppercase flex items-center gap-3">
              <span className="text-pink-500">◆</span>
              {s} Country Clubs
            </span>
          ))}
        </motion.div>
      </div>

      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <SectionLabel>Why It Matters</SectionLabel>
          <h2 className="text-4xl md:text-5xl font-extrabold text-navy-700 tracking-tight leading-tight mb-4">
            Why Clubs Will Want To Be There
          </h2>
          <p className="text-lg text-navy-400 max-w-xl mx-auto">
            For community football clubs who want to take the next step — and for every club member who deserves to celebrate the season in style.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map(({ icon: Icon, title, desc, color }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55, delay: i * 0.08 }}
              className={`bg-gray-50 rounded-2xl p-7 border border-navy-50 card-hover ${i === 4 ? 'md:col-span-2 lg:col-span-1' : ''}`}
            >
              <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center mb-5`}>
                <Icon size={20} className="text-white" />
              </div>
              <h3 className="text-base font-extrabold text-navy-700 mb-3 leading-snug">{title}</h3>
              <p className="text-sm text-navy-400 leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
