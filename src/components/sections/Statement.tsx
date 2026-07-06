import { motion, useReducedMotion } from 'framer-motion'

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function Statement() {
  const prefersReduced = useReducedMotion()

  return (
    <section style={{ background: '#111111', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 lg:py-20">
        <div className="grid lg:grid-cols-[3fr,2fr] gap-8 lg:gap-16 items-end">

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, ease }}
          >
            <p className="font-display text-white leading-[0.9]" style={{ fontSize: 'clamp(2.8rem, 7vw, 7rem)' }}>
              MORE THAN A<br />
              <span style={{ color: '#d71920' }}>CHAMPIONSHIP.</span>
            </p>
            <p className="font-display leading-[0.9] mt-3" style={{ fontSize: 'clamp(2.8rem, 7vw, 7rem)', color: 'rgba(255,255,255,0.22)' }}>
              WHERE LOCAL<br />FOOTY COMES<br />TOGETHER.
            </p>
          </motion.div>

          {/* Body copy */}
          <motion.p
            initial={{ opacity: 0, y: prefersReduced ? 0 : 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, delay: 0.15, ease }}
            className="leading-relaxed lg:pb-2"
            style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.4)' }}
          >
            For four days, Australia's leading community football clubs come together on the future host city to compete, celebrate and connect. Players, coaches, futures, families and supporters all become part of the experience.
          </motion.p>

        </div>
      </div>
    </section>
  )
}
