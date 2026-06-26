import { motion } from 'framer-motion'

export default function Prize() {
  const go = (id: string) => document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section className="bg-[#ff2c91] py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="font-display text-white leading-none"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
            >
              PLAY. CELEBRATE. BELONG.
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-white/80 italic font-semibold text-lg mt-1"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              This is your moment.
            </motion.p>
          </div>
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            onClick={() => go('#invitation')}
            className="shrink-0 flex items-center gap-3 bg-white text-[#ff2c91] font-bold text-sm px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            REQUEST AN INVITATION
          </motion.button>
        </div>
      </div>
    </section>
  )
}
