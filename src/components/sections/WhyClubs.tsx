import { motion } from 'framer-motion'
import { Trophy, Users, MapPin, Star, Heart } from 'lucide-react'

const benefits = [
  {
    num: '01',
    title: 'A National Title To Play For',
    desc: "For A Grade teams who've won locally, PlayFooty is the next step. Compete against the best country clubs in Australia for a national title.",
    icon: Trophy,
  },
  {
    num: '02',
    title: 'A Reason To Bring The Whole Club',
    desc: 'Winning the premiership is the perfect excuse for a club trip. Give everyone a reason to travel, celebrate and bond on the Gold Coast.',
    icon: Users,
  },
  {
    num: '03',
    title: 'A Gold Coast End-Of-Season Trip',
    desc: 'Four days on the Gold Coast. Beaches, entertainment and experiences for every member of the travelling group.',
    icon: MapPin,
  },
  {
    num: '04',
    title: 'A Professional Event Experience',
    desc: 'Photography, livestream, welcome function, awards presentation. This is a national event — run at that standard.',
    icon: Star,
  },
  {
    num: '05',
    title: 'A Story Your Club Will Tell Forever',
    desc: 'A national championship win creates a story that lives in your club for years. It defines a season. It defines a club.',
    icon: Heart,
  },
]

const rowVariants = {
  hidden: { opacity: 0, y: 32 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
}

export default function WhyClubs() {
  return (
    <section id="why" className="bg-white overflow-hidden">
      <div className="section-pad">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="mb-16 max-w-xl"
        >
          <div className="section-divider mb-6" />
          <div className="text-xs font-bold tracking-[0.18em] uppercase text-pink mb-4">Five Reasons</div>
          <h2 className="font-display text-display-md text-navy leading-none">
            WHY CLUBS<br />WANT TO BE<br />THERE
          </h2>
        </motion.div>

        {/* Benefits list */}
        <div className="divide-y divide-navy/8">
          {benefits.map(({ num, title, desc, icon: Icon }, i) => (
            <motion.div
              key={num}
              custom={i}
              variants={rowVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-40px' }}
              className="group relative flex items-center gap-6 md:gap-12 py-8 md:py-10 cursor-default hover:bg-surface transition-colors duration-400 -mx-4 px-4 md:-mx-8 md:px-8 rounded-2xl"
            >
              {/* Number */}
              <div className="w-16 md:w-20 shrink-0">
                <span className="font-display text-[clamp(2.5rem,6vw,4rem)] text-navy/10 group-hover:text-pink leading-none transition-colors duration-400">
                  {num}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-navy text-[clamp(1rem,2.5vw,1.35rem)] mb-2 leading-snug group-hover:text-navy transition-colors">
                  {title}
                </h3>
                <p className="text-navy/50 text-sm md:text-base leading-relaxed max-w-xl">
                  {desc}
                </p>
              </div>

              {/* Icon */}
              <div className="shrink-0 w-12 h-12 rounded-2xl bg-navy/5 flex items-center justify-center group-hover:bg-pink/10 group-hover:border-pink/20 border border-transparent transition-all duration-400">
                <Icon size={18} className="text-navy/30 group-hover:text-pink transition-colors duration-400" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
