import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Trophy, PartyPopper, Utensils, Camera, Video, Award, Hotel, Palmtree, Users } from 'lucide-react'

const items = [
  { icon: Trophy,      label: 'A Grade Championship',   desc: 'Compete for the national title against the best country clubs in Australia.' },
  { icon: PartyPopper, label: 'Welcome Function',        desc: 'Official opening night celebration for all clubs, coaches and supporters.' },
  { icon: Utensils,    label: 'Food & Entertainment',    desc: 'Festival atmosphere across the full weekend. On-site food, music and more.' },
  { icon: Camera,      label: 'Professional Photography',desc: 'Every team photographed. Every club captured at their best.' },
  { icon: Video,       label: 'Livestream Highlights',   desc: 'Key matches broadcast nationally. Your club on the big stage.' },
  { icon: Award,       label: 'Awards Presentation',     desc: 'Champion club ceremony. Presented in front of the full CNCA community.' },
  { icon: Hotel,       label: 'Accommodation Options',   desc: 'Group packages available for teams, families and supporters.' },
  { icon: Palmtree,    label: 'Gold Coast Weekend',      desc: 'Beaches, sun and world-class attractions. The perfect club trip.' },
  { icon: Users,       label: 'Supporter Experience',    desc: 'Built for the whole club. Every person who makes your club what it is.' },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
}

export default function Experience() {
  const gridRef = useRef<HTMLDivElement>(null)
  const inView = useInView(gridRef, { once: true, margin: '-80px' })

  return (
    <section id="experience" className="bg-white overflow-hidden">
      {/* Full-bleed section header */}
      <div className="bg-white pt-24 pb-16 px-4 sm:px-8 lg:px-12">
        <div className="max-w-[1360px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="h-[3px] w-10 bg-[#ff2c91]" />
              <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-[#ff2c91]">The Experience</span>
            </div>

            <div className="grid lg:grid-cols-[1fr,auto] items-end gap-8">
              <h2 className="font-display leading-none text-[#081a3d]"
                style={{ fontSize: 'clamp(3.5rem, 8vw, 8rem)' }}>
                MORE THAN A<br />
                <span style={{ color: '#ff2c91' }}>TOURNAMENT</span>
              </h2>
              <p className="text-[#081a3d]/55 text-lg leading-relaxed max-w-sm lg:pb-3">
                CNCA is built around the A Grade championship. The weekend is designed for
                every person who makes your club what it is.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Feature grid */}
      <div className="px-4 sm:px-8 lg:px-12 pb-24">
        <div className="max-w-[1360px] mx-auto">
          <motion.div
            ref={gridRef}
            variants={containerVariants}
            initial="hidden"
            animate={inView ? 'show' : 'hidden'}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {items.map(({ icon: Icon, label, desc }, i) => (
              <motion.div
                key={label}
                variants={itemVariants}
                className={`group relative rounded-2xl overflow-hidden cursor-default border border-[#081a3d]/6 transition-all duration-400 ${
                  i === 0 ? 'sm:col-span-2 lg:col-span-2' : ''
                }`}
                style={{ background: '#040e22' }}
                whileHover={{ y: -4, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }}
              >
                {/* Pink glow on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
                  style={{ background: 'radial-gradient(circle at 30% 50%, rgba(255,44,145,0.12) 0%, transparent 70%)' }} />

                {/* Left accent bar */}
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#ff2c91] scale-y-0 group-hover:scale-y-100 transition-transform duration-400 origin-center" />

                <div className="relative z-10 p-7 flex items-start gap-5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110"
                    style={{ background: 'rgba(255,44,145,0.12)', border: '1px solid rgba(255,44,145,0.2)' }}>
                    <Icon size={20} style={{ color: '#ff2c91' }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base mb-2 leading-snug">{label}</h3>
                    <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
