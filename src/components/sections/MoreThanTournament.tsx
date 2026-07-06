import { motion } from 'framer-motion'
import { Trophy, PartyPopper, Music, Camera, Video, Award, Hotel, Users, Palmtree } from 'lucide-react'
import SectionLabel from '../ui/SectionLabel'

const features = [
  {
    icon: Trophy,
    title: 'A Grade Championship',
    desc: 'A Grade premiership clubs compete for the PlayFooty title — the national standard for Community Football excellence.',
  },
  {
    icon: PartyPopper,
    title: 'Welcome Function',
    desc: 'All clubs, coaches, families and supporters welcomed together at the official PlayFooty welcome event.',
  },
  {
    icon: Music,
    title: 'Food & Entertainment',
    desc: 'Great food, live entertainment and a festival atmosphere throughout the championship weekend.',
  },
  {
    icon: Award,
    title: 'Awards Presentation',
    desc: 'A formal presentation ceremony honouring the PlayFooty champion club and standout players of the championship.',
  },
  {
    icon: Camera,
    title: 'Professional Photography',
    desc: 'Every competing team photographed professionally. Memories worth keeping from your championship weekend.',
  },
  {
    icon: Video,
    title: 'Livestream Highlights',
    desc: 'Key matches and finals covered with highlight footage so the people back home never miss a moment.',
  },
  {
    icon: Hotel,
    title: 'Accommodation Packages',
    desc: 'Group accommodation options available for teams, supporters and families travelling to the Gold Coast.',
  },
  {
    icon: Users,
    title: 'Supporter Experience',
    desc: 'Designed for the whole club to attend. Families, partners and supporters are a central part of the PlayFooty weekend.',
  },
  {
    icon: Palmtree,
    title: 'Gold Coast Weekend',
    desc: 'Extend your trip and explore the beaches, attractions and dining of Australia\'s favourite holiday destination.',
  },
]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55 } },
}

export default function MoreThanTournament() {
  return (
    <section id="experience" className="bg-white">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <SectionLabel>The Experience</SectionLabel>
          <h2 className="text-4xl md:text-5xl font-extrabold text-navy-700 tracking-tight leading-tight mb-4">
            More Than A Tournament
          </h2>
          <p className="text-lg text-navy-400 max-w-xl mx-auto leading-relaxed">
            PlayFooty is built around the A Grade championship, but the weekend is designed for every person who makes your club what it is.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map(({ icon: Icon, title, desc }) => (
            <motion.div
              key={title}
              variants={item}
              className="group relative bg-white border border-navy-100 rounded-2xl p-7 card-hover"
            >
              <div className="absolute top-0 left-6 right-6 h-0.5 bg-pink-gradient rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="w-11 h-11 bg-pink-50 rounded-xl flex items-center justify-center mb-5 group-hover:bg-pink-500 transition-colors duration-300">
                <Icon size={20} className="text-pink-500 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-base font-bold text-navy-700 mb-2">{title}</h3>
              <p className="text-sm text-navy-400 leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
