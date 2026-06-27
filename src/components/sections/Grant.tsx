import { motion } from 'framer-motion'
import { Trophy, Users, Star, Shield, ArrowRight } from 'lucide-react'
import Button from '../ui/Button'

const prizeElements = [
  { icon: Trophy, label: 'Club Reward', desc: 'A prize package designed to deliver lasting value for the winning club and its community.' },
  { icon: Users, label: 'Player Recognition', desc: 'Recognition for the players who competed and won at the national championship level.' },
  { icon: Star, label: 'Champion Status', desc: 'The CNCA title — the highest honour in A Grade country netball — plus the memories that go with it.' },
  { icon: Shield, label: 'Community Value', desc: 'A prize built to benefit the club at home — creating a legacy from the championship win.' },
]

export default function Grant() {
  const scrollToRegister = () => {
    document.querySelector('#register')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="prize" className="bg-navy-700 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-96 h-96 bg-pink-500/8 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-500/6 rounded-full translate-y-1/2 -translate-x-1/3" />
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-pink-gradient" />

      <div className="section-container relative z-10">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.65 }}
          >
            <div className="inline-flex items-center gap-2 mb-6">
              <div className="h-px w-8 bg-pink-500" />
              <span className="text-xs font-bold tracking-[0.15em] uppercase text-pink-400">Championship Prize</span>
              <div className="h-px w-8 bg-pink-500" />
            </div>

            <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight mb-6">
              Major Prize For The Winning Club
            </h2>

            <p className="text-white/75 text-lg leading-relaxed mb-5">
              The CNCA champion club will receive a major prize package designed to reward the club, celebrate the players and create lasting value for their netball community.
            </p>

            <p className="text-white/50 text-base leading-relaxed mb-10">
              Prize details will be announced closer to the event.
            </p>

            <Button onClick={scrollToRegister} size="lg">
              Register Interest
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </motion.div>

          {/* Right */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.65 }}
            className="grid grid-cols-2 gap-4"
          >
            {prizeElements.map(({ icon: Icon, label, desc }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white/8 border border-white/12 rounded-2xl p-6 hover:bg-white/12 transition-colors duration-200"
              >
                <div className="w-11 h-11 bg-pink-500/20 rounded-xl flex items-center justify-center mb-4">
                  <Icon size={20} className="text-pink-400" />
                </div>
                <h4 className="text-base font-bold text-white mb-2">{label}</h4>
                <p className="text-xs text-white/50 leading-relaxed">{desc}</p>
              </motion.div>
            ))}

            {/* Prize announcement card */}
            <div className="col-span-2 bg-pink-gradient rounded-2xl p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">CNCA 2027</p>
                  <p className="text-xl font-extrabold text-white mb-1">Major Prize Package</p>
                  <p className="text-white/65 text-sm">Details to be announced. Register interest to stay informed.</p>
                </div>
                <Trophy size={40} className="text-white/20 flex-shrink-0" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
