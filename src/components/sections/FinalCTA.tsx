import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import MagneticButton from '../ui/MagneticButton'

const words = ['PLAY.', 'TRAVEL.', 'CELEBRATE.', 'BELONG.']

const wordVariants = {
  hidden: { clipPath: 'inset(0 0 100% 0)', y: 60, opacity: 0 },
  show: (i: number) => ({
    clipPath: 'inset(0 0 0% 0)',
    y: 0,
    opacity: 1,
    transition: { duration: 0.9, delay: i * 0.14, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
}

export default function FinalCTA() {
  const scrollToRegister = () =>
    document.querySelector('#register')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section className="bg-animated-pink relative overflow-hidden noise min-h-[92vh] flex items-center">

      {/* Large decorative circles */}
      <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full border border-white/5 pointer-events-none" />
      <div className="absolute bottom-[-30%] left-[-10%] w-[50vw] h-[50vw] rounded-full border border-white/5 pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-[25vw] h-[25vw] rounded-full border border-white/5 pointer-events-none" />

      {/* Netball SVG decoration */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none"
        viewBox="0 0 800 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="400" cy="400" r="380" stroke="white" strokeWidth="2" />
        <circle cx="400" cy="400" r="240" stroke="white" strokeWidth="2" />
        <line x1="400" y1="20" x2="400" y2="780" stroke="white" strokeWidth="2" />
        <path d="M 60 400 Q 400 100 740 400" stroke="white" strokeWidth="2" fill="none" />
        <path d="M 60 400 Q 400 700 740 400" stroke="white" strokeWidth="2" fill="none" />
      </svg>

      {/* Gold star accents */}
      <div className="absolute top-16 right-16 text-gold-DEFAULT opacity-60 pointer-events-none">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
        </svg>
      </div>
      <div className="absolute bottom-24 left-20 text-gold-DEFAULT opacity-40 pointer-events-none">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full">
        <div className="section-pad text-center">

          {/* Stacked words */}
          <div className="mb-12">
            {words.map((word, i) => (
              <div key={word} className="overflow-hidden">
                <motion.div
                  custom={i}
                  variants={wordVariants}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-60px' }}
                  className="font-display text-[clamp(4rem,13vw,11rem)] text-white leading-[0.9] tracking-wide"
                >
                  {word}
                </motion.div>
              </div>
            ))}
          </div>

          {/* Body */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="text-white/80 text-base md:text-xl font-medium max-w-xl mx-auto mb-10 leading-relaxed"
          >
            A Grade premiership clubs are invited to compete for the CNCA title on the Gold Coast — 5–8 November 2026.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.55, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="flex flex-col items-center gap-5"
          >
            <motion.div
              animate={{ boxShadow: ['0 0 0 0 rgba(255,255,255,0.3)', '0 0 0 20px rgba(255,255,255,0)', '0 0 0 0 rgba(255,255,255,0)'] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
              className="rounded-full"
            >
              <MagneticButton
                onClick={scrollToRegister}
                className="inline-flex items-center gap-3 bg-white text-navy-DEFAULT font-bold text-sm px-10 py-4 rounded-full hover:bg-white/90 transition-colors duration-300"
              >
                Request Club Invitation
                <ArrowRight size={16} />
              </MagneticButton>
            </motion.div>

            <p className="text-white/50 text-xs font-semibold tracking-widest uppercase">
              Invitation only · A Grade premiership clubs · Limited places
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
