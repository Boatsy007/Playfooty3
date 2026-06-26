import { motion } from 'framer-motion'
import { Mail } from 'lucide-react'

export default function Prize() {
  const go = (id: string) => document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section className="relative overflow-hidden bg-[#ff2c91] py-14">
      {/* Subtle shimmer overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%, rgba(255,255,255,0.04) 100%)' }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-8">

          <div>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
              className="font-display text-white leading-none"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
            >
              PLAY. CELEBRATE. BELONG.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
              className="text-white/75 font-semibold text-lg mt-1.5 italic"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              This is your moment.
            </motion.p>
          </div>

          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => go('#invitation')}
            className="shrink-0 flex items-center gap-3 bg-white font-bold text-sm px-8 py-4 rounded-full shadow-lg transition-shadow duration-200"
            style={{ color: '#ff2c91' }}
          >
            <Mail size={16} />
            REQUEST AN INVITATION
          </motion.button>
        </div>
      </div>
    </section>
  )
}
