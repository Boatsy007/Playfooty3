import { motion } from 'framer-motion'
import { Users, UserCheck, Shield, Heart, Star, Handshake } from 'lucide-react'
import SectionLabel from '../ui/SectionLabel'

const audiences = [
  {
    icon: Star,
    role: 'Players',
    grades: 'A · B · C · D Grade',
    desc: 'Compete on a national stage against the best country clubs in Australia. This is the moment your season has been building toward.',
    color: 'from-pink-500 to-pink-600',
  },
  {
    icon: UserCheck,
    role: 'Coaches',
    grades: 'All Divisions',
    desc: 'Lead your team in the biggest country netball event in Australia. Connect with coaches from across the nation.',
    color: 'from-navy-600 to-navy-700',
  },
  {
    icon: Shield,
    role: 'Committee',
    grades: 'Presidents · Managers',
    desc: 'Experience how Australia\'s premier country event is run and take ideas back to transform your own club.',
    color: 'from-pink-500 to-pink-600',
  },
  {
    icon: Heart,
    role: 'Families',
    grades: 'Supporters · Kids',
    desc: 'The perfect excuse for a Gold Coast holiday. Cheer on your club by day, explore paradise by night.',
    color: 'from-navy-600 to-navy-700',
  },
  {
    icon: Users,
    role: 'Supporters',
    grades: 'Community · Fans',
    desc: 'Join hundreds of passionate supporters from across Australia celebrating country netball together.',
    color: 'from-pink-500 to-pink-600',
  },
  {
    icon: Handshake,
    role: 'Sponsors',
    grades: 'Brand Partners',
    desc: 'Reach 100+ country clubs and thousands of passionate netball families. Exceptional exposure opportunities.',
    color: 'from-navy-600 to-navy-700',
  },
]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}
const item = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55 } },
}

export default function BringTheClub() {
  return (
    <section className="bg-gray-50">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <SectionLabel>For Everyone</SectionLabel>
          <h2 className="text-4xl md:text-5xl font-extrabold text-navy-700 tracking-tight leading-tight mb-4">
            Bring The Whole Club
          </h2>
          <p className="text-lg text-navy-400 max-w-xl mx-auto leading-relaxed">
            ACNC isn't just for players. It's a whole-club experience designed for every person who makes your club great.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {audiences.map(({ icon: Icon, role, grades, desc, color }) => (
            <motion.div
              key={role}
              variants={item}
              className="bg-white rounded-2xl overflow-hidden card-hover border border-navy-50"
            >
              <div className={`bg-gradient-to-br ${color} px-7 pt-7 pb-8`}>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                  <Icon size={22} className="text-white" />
                </div>
                <h3 className="text-xl font-extrabold text-white mb-1">{role}</h3>
                <p className="text-xs font-semibold text-white/70 tracking-wider uppercase">{grades}</p>
              </div>
              <div className="px-7 py-6">
                <p className="text-sm text-navy-500 leading-relaxed">{desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom callout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-3 bg-white border border-pink-100 rounded-full px-6 py-3 shadow-sm">
            <div className="w-2 h-2 bg-pink-500 rounded-full" />
            <span className="text-sm font-semibold text-navy-600">
              One event. Every reason to be there together.
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
