import { motion, useReducedMotion } from 'framer-motion'

const stats = [
  { num: 'A GRADE', label: 'Premiers Only',  accent: '#ff2c91' },
  { num: '4 DAYS',  label: 'Gold Coast',     accent: '#111111' },
  { num: '1',       label: 'National Title', accent: '#ff2c91' },
  { num: '2026',    label: 'Inaugural Year', accent: '#111111' },
]

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function Stats() {
  const prefersReduced = useReducedMotion()

  return (
    <div style={{ background: '#f7f5f2', borderBottom: '1px solid rgba(17,17,17,0.08)' }}>
      <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4">
        {stats.map(({ num, label, accent }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: prefersReduced ? 0 : i * 0.08, ease }}
            className="flex flex-col justify-center px-8 py-12 lg:py-16 relative"
            style={{
              borderRight: i < 3 ? '1px solid rgba(17,17,17,0.1)' : 'none',
              borderBottom: i < 2 ? '1px solid rgba(17,17,17,0.08)' : 'none',
            }}
          >
            <div className="w-6 h-[3px] rounded-full mb-5" style={{ background: accent }} />
            <span className="font-display leading-none mb-3" style={{ fontSize: 'clamp(2.2rem, 4.5vw, 4rem)', color: '#111111' }}>
              {num}
            </span>
            <span className="font-condensed font-bold text-xs tracking-[0.22em] uppercase" style={{ color: 'rgba(17,17,17,0.4)' }}>
              {label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
