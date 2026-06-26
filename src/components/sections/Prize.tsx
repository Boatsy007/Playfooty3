import { motion } from 'framer-motion'
import { Gift, Award, Star, Shield } from 'lucide-react'
import MagneticButton from '../ui/MagneticButton'

const items = [
  {
    icon: Gift,
    title: 'Club Reward',
    desc: 'A prize package delivering lasting value for the club and its people.',
  },
  {
    icon: Award,
    title: 'National Recognition',
    desc: 'The CNCA title — the highest honour in A Grade country netball.',
  },
  {
    icon: Star,
    title: 'Player Recognition',
    desc: 'Individual recognition for the players who competed and won.',
  },
  {
    icon: Shield,
    title: 'Club Legacy',
    desc: 'A championship win that defines a club for years to come.',
  },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, scale: 0.88, y: 32 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
}

export default function Prize() {
  const scrollToRegister = () =>
    document.querySelector('#register')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section id="prize" className="overflow-hidden">

      {/* Part 1 — White */}
      <div className="bg-white">
        <div className="section-pad pb-24">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="max-w-2xl"
          >
            <div className="section-divider mb-6" />
            <div className="text-xs font-bold tracking-[0.18em] uppercase text-pink-DEFAULT mb-4">Championship Prize</div>
            <h2 className="font-display text-display-md text-navy-DEFAULT leading-none mb-6">
              MAJOR PRIZE<br />FOR THE<br />WINNING CLUB
            </h2>
            <p className="text-navy-DEFAULT/60 text-lg leading-relaxed">
              The CNCA champion club will receive a major prize package designed to reward the club, celebrate the players and create lasting value for their netball community. Prize details will be announced closer to the event.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Part 2 — Navy prestige */}
      <div className="bg-navy-DEFAULT">
        <div className="section-pad pt-24">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7 }}
            className="mb-12"
          >
            <div className="text-xs font-bold tracking-[0.18em] uppercase text-white/30 mb-3">What's at stake</div>
            <h3 className="font-display text-[clamp(1.8rem,4vw,3rem)] text-white leading-none">
              THE CNCA TITLE
            </h3>
          </motion.div>

          {/* 2x2 Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/10 rounded-2xl overflow-hidden mb-14"
          >
            {items.map(({ icon: Icon, title, desc }) => (
              <motion.div
                key={title}
                variants={itemVariants}
                className="bg-navy-DEFAULT p-8 md:p-10 group hover:bg-navy-light transition-colors duration-500 cursor-default"
              >
                <div className="w-14 h-14 rounded-2xl bg-gold-DEFAULT/10 border border-gold-DEFAULT/20 flex items-center justify-center mb-6 group-hover:bg-gold-DEFAULT/20 transition-colors duration-400">
                  <Icon size={24} className="text-gold-DEFAULT" />
                </div>
                <h4 className="font-display text-[clamp(1.4rem,3vw,2rem)] text-white leading-none mb-3">{title}</h4>
                <p className="text-white/45 text-sm leading-relaxed font-medium">{desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Gold announcement card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="flex flex-col items-center text-center mb-14"
          >
            <div className="border border-gold-DEFAULT/40 rounded-2xl px-10 py-6 bg-gold-DEFAULT/5 inline-flex flex-col items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gold-DEFAULT" />
              <p className="font-display text-[clamp(1rem,2.5vw,1.4rem)] text-gold-DEFAULT tracking-widest uppercase">
                Major Prize Package · Details announced 2026
              </p>
              <div className="w-1.5 h-1.5 rounded-full bg-gold-DEFAULT" />
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex justify-center"
          >
            <MagneticButton
              onClick={scrollToRegister}
              className="bg-pink-grad text-white font-bold text-sm px-10 py-4 rounded-full shadow-pink hover:shadow-pink-lg transition-shadow duration-300"
            >
              Register Interest
            </MagneticButton>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
