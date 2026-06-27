import { motion, useReducedMotion } from 'framer-motion'

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function Statement() {
  const prefersReduced = useReducedMotion()

  return (
    <section style={{ background: '#111111', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-24 lg:py-36">
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease }}
        >
          <p
            className="font-display text-white leading-[0.9]"
            style={{ fontSize: 'clamp(3rem, 8.5vw, 8.5rem)' }}
          >
            MORE THAN A<br />
            <span style={{ color: '#ff2c91' }}>CHAMPIONSHIP.</span>
          </p>
          <p
            className="font-display leading-[0.9] mt-4"
            style={{ fontSize: 'clamp(3rem, 8.5vw, 8.5rem)', color: 'rgba(255,255,255,0.18)' }}
          >
            A WEEKEND THE<br />WHOLE CLUB WILL<br />REMEMBER.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
