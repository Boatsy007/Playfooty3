import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

const words = ['Play.', 'Travel.', 'Celebrate.', 'Belong.']

export default function FinalCTA() {
  const scrollToRegister = () => {
    document.querySelector('#register')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative bg-pink-gradient overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4" />

      {/* Netball seam line decorative */}
      <div className="absolute inset-0 opacity-5">
        <svg className="w-full h-full" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice">
          <circle cx="600" cy="200" r="350" stroke="white" strokeWidth="2" fill="none" />
          <circle cx="600" cy="200" r="200" stroke="white" strokeWidth="1.5" fill="none" />
          <line x1="250" y1="200" x2="950" y2="200" stroke="white" strokeWidth="1.5" />
          <path d="M450 10 Q550 200 450 390" stroke="white" strokeWidth="1.5" fill="none" />
          <path d="M750 10 Q650 200 750 390" stroke="white" strokeWidth="1.5" fill="none" />
        </svg>
      </div>

      <div className="section-container relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-4"
        >
          <span className="text-white/70 text-xs font-bold tracking-[0.2em] uppercase">
            Australian Club Netball Championships · 2026
          </span>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-10">
          {words.map((word, i) => (
            <motion.span
              key={word}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.15 }}
              className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white leading-tight tracking-tight"
            >
              {word}
            </motion.span>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="text-white/80 text-lg md:text-xl max-w-lg mx-auto mb-10 leading-relaxed"
        >
          This is your club's moment. 5–8 November 2026, Gold Coast, Queensland.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.85 }}
        >
          <button
            onClick={scrollToRegister}
            className="inline-flex items-center gap-3 bg-white text-pink-600 font-extrabold text-base px-10 py-4 rounded-full hover:bg-pink-50 transition-all duration-200 shadow-2xl hover:shadow-white/20 hover:scale-[1.03] active:scale-[0.98]"
          >
            Request Invitation
            <ArrowRight size={18} />
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 1 }}
          className="text-white/50 text-sm mt-6 font-medium"
        >
          Limited club spots available for 2026
        </motion.p>
      </div>
    </section>
  )
}
