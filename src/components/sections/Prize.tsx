import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'

export default function Prize() {
  const go = (id: string) => document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section className="relative overflow-hidden bg-[#ff2c91] py-24 lg:py-32">
      {/* Moving shimmer */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        style={{ background: 'linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.12) 50%, transparent 80%)' }}
      />

      {/* Big background text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none">
        <span className="font-display text-white/[0.04] whitespace-nowrap"
          style={{ fontSize: 'clamp(10rem, 30vw, 28rem)', lineHeight: 1 }}>
          ACNC
        </span>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 text-center">

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
          className="font-display text-white leading-none mb-6"
          style={{ fontSize: 'clamp(4rem, 12vw, 11rem)' }}
        >
          PLAY.<br />
          <span style={{ color: 'rgba(255,255,255,0.55)' }}>TRAVEL.</span><br />
          CELEBRATE.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
          className="text-white/65 text-lg lg:text-xl font-semibold mb-12 max-w-lg mx-auto"
        >
          The biggest end-of-season experience in Australian country netball.
        </motion.p>

        <motion.button
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.25, ease: [0.23, 1, 0.32, 1] as [number,number,number,number] }}
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => go('#invitation')}
          className="inline-flex items-center gap-3 bg-white font-bold text-base px-10 py-5 rounded-full shadow-2xl"
          style={{ color: '#ff2c91' }}
        >
          REQUEST AN INVITATION
          <ChevronRight size={18} />
        </motion.button>
      </div>
    </section>
  )
}
