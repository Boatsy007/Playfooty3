import { motion } from 'framer-motion'
import { Swords, Users, Heart } from 'lucide-react'

const cards = [
  {
    icon: Swords,
    title: 'A Grade Players',
    desc: 'Your A Grade team competes for the national title against the best country clubs in Australia.',
    badge: 'Competes',
  },
  {
    icon: Users,
    title: 'Coaches & Committee',
    desc: 'Travel with the team, prepare your players and be part of the club\'s biggest moment.',
    badge: null,
  },
  {
    icon: Heart,
    title: 'Families & Supporters',
    desc: 'Cheer on the team, enjoy the Gold Coast and celebrate alongside every club in the country.',
    badge: null,
  },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
}

export default function BringTheClub() {
  return (
    <section id="bring-the-club" className="bg-navy py-20 lg:py-28 overflow-hidden">
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
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-pink">Who It's For</span>
            <div className="h-px w-8 bg-pink" />
          </div>
          <h2 className="font-display leading-none text-white mb-4" style={{ fontSize: 'clamp(2.8rem, 6vw, 5rem)' }}>
            BRING THE<br />
            <span className="text-pink">WHOLE CLUB</span>
          </h2>
          <p className="text-white/55 text-lg max-w-xl mx-auto leading-relaxed">
            The A Grade team plays. The whole club can travel, support and celebrate.
          </p>
        </motion.div>

        {/* Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          {cards.map(({ icon: Icon, title, desc, badge }) => (
            <motion.div
              key={title}
              variants={cardVariants}
              className="group relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink/40 rounded-2xl p-8 transition-all duration-400 cursor-default"
            >
              {/* Badge */}
              {badge && (
                <div className="absolute top-5 right-5 bg-pink text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">
                  {badge}
                </div>
              )}

              <div className="w-14 h-14 rounded-2xl bg-pink/15 group-hover:bg-pink flex items-center justify-center mb-6 transition-colors duration-300">
                <Icon size={24} className="text-pink group-hover:text-white transition-colors duration-300" />
              </div>

              <h3 className="font-display text-[clamp(1.6rem,3vw,2.2rem)] text-white leading-none mb-3">{title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
