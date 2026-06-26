import { motion } from 'framer-motion'
import { Star, UserCheck, Heart, Users } from 'lucide-react'
import SectionLabel from '../ui/SectionLabel'

const audiences = [
  {
    icon: Star,
    role: 'A Grade Players',
    tagline: 'The competitors',
    desc: 'Your A Grade team earns the right to compete at CNCA by winning the local premiership. They take the court representing the entire club.',
    color: 'from-pink-500 to-pink-600',
  },
  {
    icon: UserCheck,
    role: 'Coaches & Committee',
    tagline: 'The leaders',
    desc: 'Coaches, managers and committee members travel as part of the official club delegation — leading the team and representing your association.',
    color: 'from-navy-600 to-navy-700',
  },
  {
    icon: Heart,
    role: 'Families & Supporters',
    tagline: 'The backbone',
    desc: 'Partners, parents and supporters are what make a club. CNCA is designed for them to travel alongside the team and be part of every moment.',
    color: 'from-pink-500 to-pink-600',
  },
  {
    icon: Users,
    role: 'Club Community',
    tagline: 'The celebration',
    desc: 'Club members, sponsors and community supporters are welcome. Turn the end-of-season premiership into a full club trip to the Gold Coast.',
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
          className="text-center mb-6"
        >
          <SectionLabel>Who Travels</SectionLabel>
          <h2 className="text-4xl md:text-5xl font-extrabold text-navy-700 tracking-tight leading-tight mb-4">
            Bring The Whole Club
          </h2>
          <p className="text-lg text-navy-400 max-w-2xl mx-auto leading-relaxed">
            The A Grade team competes for the national title — but CNCA is designed for the entire club to travel, support and celebrate together on the Gold Coast.
          </p>
        </motion.div>

        {/* Distinction callout */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
        >
          <div className="inline-flex items-center gap-2.5 bg-pink-50 border border-pink-200 rounded-full px-5 py-2.5">
            <div className="w-2 h-2 bg-pink-500 rounded-full flex-shrink-0" />
            <span className="text-sm font-semibold text-pink-700">A Grade competes for the CNCA title</span>
          </div>
          <div className="inline-flex items-center gap-2.5 bg-navy-50 border border-navy-200 rounded-full px-5 py-2.5">
            <div className="w-2 h-2 bg-navy-500 rounded-full flex-shrink-0" />
            <span className="text-sm font-semibold text-navy-600">Everyone else travels to support and celebrate</span>
          </div>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-6"
        >
          {audiences.map(({ icon: Icon, role, tagline, desc, color }) => (
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
                <p className="text-xs font-semibold text-white/70 tracking-wider uppercase">{tagline}</p>
              </div>
              <div className="px-7 py-6">
                <p className="text-sm text-navy-500 leading-relaxed">{desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
