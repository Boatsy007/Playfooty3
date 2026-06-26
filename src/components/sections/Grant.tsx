import { motion } from 'framer-motion'
import { Building2, Package, Baby, TrendingUp, ArrowRight, CheckCircle2 } from 'lucide-react'
import Button from '../ui/Button'

const categories = [
  { icon: Building2, label: 'Facilities', desc: 'Court resurfacing, lighting, clubroom upgrades' },
  { icon: Package, label: 'Equipment', desc: 'Bibs, balls, timing systems, scoreboards' },
  { icon: Baby, label: 'Junior Programs', desc: 'Development camps, coaching education, uniforms' },
  { icon: TrendingUp, label: 'Club Development', desc: 'Marketing, administration, digital tools' },
]

const eligibility = [
  'Club must participate in the championship',
  'Application submitted with registration',
  'Funds disbursed to winning club post-event',
  'All country clubs eligible to apply',
]

export default function Grant() {
  const scrollToRegister = () => {
    document.querySelector('#register')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="grant" className="bg-navy-700 overflow-hidden relative">
      {/* Decorative elements */}
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
              <span className="text-xs font-bold tracking-[0.15em] uppercase text-pink-400">Club Development</span>
              <div className="h-px w-8 bg-pink-500" />
            </div>

            <div className="mb-6">
              <span className="text-7xl md:text-8xl font-extrabold text-white leading-none">$10K</span>
              <div className="mt-2">
                <span className="text-2xl md:text-3xl font-bold text-pink-400">Club Development Grant</span>
              </div>
            </div>

            <p className="text-white/75 text-lg leading-relaxed mb-8">
              One participating club walks away with $10,000 in funding to invest back into their club. From court upgrades to junior programs — you decide what your club needs most.
            </p>

            <div className="space-y-3 mb-10">
              {eligibility.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-pink-400 flex-shrink-0 mt-0.5" />
                  <span className="text-white/70 text-sm">{item}</span>
                </div>
              ))}
            </div>

            <Button onClick={scrollToRegister} size="lg">
              Apply With Registration
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
            {categories.map(({ icon: Icon, label, desc }, i) => (
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
                <p className="text-xs text-white/55 leading-relaxed">{desc}</p>
              </motion.div>
            ))}

            {/* Grant card */}
            <div className="col-span-2 bg-pink-gradient rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-1">2026 Grant</p>
                  <p className="text-2xl font-extrabold text-white">$10,000 AUD</p>
                  <p className="text-white/70 text-sm mt-1">Awarded to one club at the 2026 Championships</p>
                </div>
                <div className="text-5xl font-black text-white/20">G</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
