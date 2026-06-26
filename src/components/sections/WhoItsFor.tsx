import { motion } from 'framer-motion'

const roles = [
  {
    num: '01',
    role: 'A Grade Players',
    desc: 'Take the court for the national title',
    competes: true,
  },
  {
    num: '02',
    role: 'Coaches & Committee',
    desc: 'Lead the club on the national stage',
    competes: true,
  },
  {
    num: '03',
    role: 'Families & Partners',
    desc: 'Travel with the team, be part of every moment',
    competes: false,
  },
  {
    num: '04',
    role: 'Supporters',
    desc: 'Your energy is what makes a club',
    competes: false,
  },
  {
    num: '05',
    role: 'Club Members',
    desc: 'The end-of-season trip your club deserves',
    competes: false,
  },
  {
    num: '06',
    role: 'Club Community',
    desc: 'Turn a premiership into a Gold Coast celebration',
    competes: false,
  },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const rowVariants = {
  hidden: { opacity: 0, x: -60 },
  show: { opacity: 1, x: 0, transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
}

export default function WhoItsFor() {
  return (
    <section id="who" className="bg-navy-DEFAULT overflow-hidden">
      <div className="section-pad">
        <div className="grid lg:grid-cols-[1fr,1.8fr] gap-16 lg:gap-24 items-start">

          {/* Left — editorial headline */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="lg:sticky lg:top-28"
          >
            <div className="w-12 h-[3px] bg-pink-DEFAULT mb-8" />
            <div className="text-xs font-bold tracking-[0.18em] uppercase text-pink-DEFAULT mb-6">Who It's For</div>
            <h2 className="font-display text-[clamp(3rem,7vw,5.5rem)] text-white leading-none mb-8">
              BUILT FOR THE<br />
              <span className="text-pink-DEFAULT">WHOLE</span><br />
              CLUB
            </h2>
            <p className="text-white/50 text-base leading-relaxed max-w-xs mb-10">
              The A Grade team competes. Everyone else travels, supports and celebrates on the Gold Coast.
            </p>

            {/* Legend */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-pink-DEFAULT" />
                <span className="text-xs text-white/60 font-semibold uppercase tracking-widest">A Grade competes</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-white/30" />
                <span className="text-xs text-white/60 font-semibold uppercase tracking-widest">Travels & celebrates</span>
              </div>
            </div>
          </motion.div>

          {/* Right — editorial role list */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="divide-y divide-white/10"
          >
            {roles.map(({ num, role, desc, competes }) => (
              <motion.div
                key={num}
                variants={rowVariants}
                className="group relative flex items-center gap-6 py-7 cursor-default overflow-hidden"
              >
                {/* Pink hover accent */}
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-pink-DEFAULT scale-y-0 group-hover:scale-y-100 transition-transform duration-400 origin-bottom rounded-full" />

                {/* Hover background */}
                <div className="absolute inset-0 bg-white/3 opacity-0 group-hover:opacity-100 transition-opacity duration-400 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />

                <div className="relative z-10 w-12 shrink-0">
                  <span className="font-display text-2xl text-white/20 group-hover:text-pink-DEFAULT transition-colors duration-400 leading-none">
                    {num}
                  </span>
                </div>

                <div className="relative z-10 flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-display text-[clamp(1.4rem,3.5vw,2.2rem)] text-white leading-none group-hover:text-white transition-colors duration-300">
                      {role}
                    </span>
                    {competes && (
                      <span className="inline-flex items-center gap-1 bg-pink-DEFAULT/20 border border-pink-DEFAULT/30 text-pink-DEFAULT text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full shrink-0">
                        <span className="w-1 h-1 bg-pink-DEFAULT rounded-full" />
                        Competes
                      </span>
                    )}
                  </div>
                  <p className="text-white/40 text-sm mt-1.5 group-hover:text-white/60 transition-colors duration-300 font-medium">
                    {desc}
                  </p>
                </div>

                <div className="relative z-10 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-8 h-8 rounded-full border border-pink-DEFAULT/40 flex items-center justify-center">
                    <div className="w-3 h-[1px] bg-pink-DEFAULT" />
                    <div className="w-[1px] h-3 bg-pink-DEFAULT absolute" />
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
