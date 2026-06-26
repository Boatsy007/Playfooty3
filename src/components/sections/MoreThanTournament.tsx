import { motion } from 'framer-motion'
import { Trophy, PartyPopper, Truck, Music, Camera, Video, Award, Bus, Palmtree } from 'lucide-react'
import SectionLabel from '../ui/SectionLabel'

const features = [
  {
    icon: Trophy,
    title: 'National Championship',
    desc: 'Compete for the ultimate title against the best country clubs from every state across Australia.',
  },
  {
    icon: PartyPopper,
    title: 'Welcome Party',
    desc: 'Kick off the weekend with a spectacular welcome event celebrating the spirit of country netball.',
  },
  {
    icon: Truck,
    title: 'Food Trucks',
    desc: 'A curated festival of incredible food vendors serving the courts all championship weekend.',
  },
  {
    icon: Music,
    title: 'Live Entertainment',
    desc: 'Live music, DJs and entertainment that turns the championship into an unforgettable festival.',
  },
  {
    icon: Camera,
    title: 'Professional Photography',
    desc: 'Every team photographed professionally. Take home images that capture the memory forever.',
  },
  {
    icon: Video,
    title: 'Livestream Coverage',
    desc: 'Finals broadcast live so families, supporters and sponsors back home never miss a moment.',
  },
  {
    icon: Award,
    title: 'Awards Night',
    desc: 'A glamorous end-of-event gala celebrating champions, clubs and the best of country netball.',
  },
  {
    icon: Bus,
    title: 'Club Travel Packages',
    desc: 'All-inclusive packages that make bringing your entire club simple, affordable and stress-free.',
  },
  {
    icon: Palmtree,
    title: 'Gold Coast Experiences',
    desc: 'Theme parks, beaches, dining and nightlife. Turn your championship trip into a full holiday.',
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
            ACNC is Australia's biggest country netball end-of-season experience — competition, celebration and community, all in one place.
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
