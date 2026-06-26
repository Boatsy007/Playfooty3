import { motion } from 'framer-motion'
import { Trophy, Users, Briefcase, Heart, Star, ChevronRight } from 'lucide-react'

const attendees = [
  {
    icon: Trophy,
    num: '01',
    title: 'PLAYERS',
    desc: 'A Grade premiers competing for the national title.',
    color: '#ff2c91',
  },
  {
    icon: Users,
    num: '02',
    title: 'COACHES',
    desc: 'Connect with leading clubs from across Australia.',
    color: '#e8a020',
  },
  {
    icon: Briefcase,
    num: '03',
    title: 'CLUB OFFICIALS',
    desc: 'Committee members, administrators and volunteers.',
    color: '#0ea5c9',
  },
  {
    icon: Heart,
    num: '04',
    title: 'FAMILIES',
    desc: 'Support the journey and enjoy the Gold Coast.',
    color: '#ff2c91',
  },
  {
    icon: Star,
    num: '05',
    title: 'SUPPORTERS',
    desc: 'Celebrate the season together.',
    color: '#e8a020',
  },
]

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.09, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] },
  }),
}

export default function HowItWorks() {
  const go = (id: string) => document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section id="format" className="py-20 lg:py-28" style={{ background: '#1a1a1a' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14"
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-[3px] w-8 bg-[#ff2c91]" />
              <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-[#ff2c91]">Who Attends</span>
            </div>
            <h2 className="font-display text-white leading-none" style={{ fontSize: 'clamp(2.4rem, 6vw, 5.5rem)' }}>
              MORE THAN THE<br />PLAYING GROUP
            </h2>
          </div>
          <p className="text-white/40 text-sm leading-relaxed max-w-xs lg:pb-2">
            CNCA brings together everyone who contributes to country netball.
          </p>
        </motion.div>

        {/* 5-card grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {attendees.map(({ icon: Icon, num, title, desc, color }, i) => (
            <motion.div
              key={title}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-40px' }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group rounded-2xl p-5 lg:p-6 flex flex-col cursor-default"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {/* Number */}
              <span className="text-[10px] font-bold tracking-[0.2em] mb-4 transition-colors duration-300"
                style={{ color: 'rgba(255,255,255,0.22)' }}>
                {num}
              </span>

              {/* Icon */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 transition-all duration-300"
                style={{ background: `${color}20`, border: `1px solid ${color}35` }}>
                <Icon size={17} style={{ color }} />
              </div>

              {/* Text */}
              <p className="font-display text-white leading-none mb-2"
                style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)' }}>
                {title}
              </p>
              <p className="text-white/45 text-xs leading-relaxed mt-auto pt-2">
                {desc}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Championship Weekend strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
          className="rounded-2xl px-8 py-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div>
            <p className="font-display text-white leading-none mb-2"
              style={{ fontSize: 'clamp(1.4rem, 3vw, 2.2rem)' }}>
              THE CHAMPIONSHIP WEEKEND
            </p>
            <p className="text-white/55 text-sm mb-0.5">Competition by day. Celebration by night.</p>
            <p className="text-white/35 text-sm">
              Accommodation, travel and group packages available for the Gold Coast.
            </p>
          </div>
          <button
            onClick={() => go('#invitation')}
            className="group shrink-0 flex items-center gap-2.5 font-bold text-sm px-7 py-3.5 rounded-full transition-all duration-200"
            style={{ background: '#ff2c91', color: '#ffffff' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#cc1f6e')}
            onMouseLeave={e => (e.currentTarget.style.background = '#ff2c91')}
          >
            Register Interest
            <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-200" />
          </button>
        </motion.div>
      </div>
    </section>
  )
}
