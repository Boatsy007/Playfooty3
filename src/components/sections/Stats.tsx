import { motion, useReducedMotion } from 'framer-motion'

const stats = [
  { num: '24',   label: 'Invited Clubs',   sub: 'A Grade Premiers Only', accent: '#ff2c91' },
  { num: '4',    label: 'Days',            sub: 'Gold Coast, Queensland', accent: '#f4c14d' },
  { num: '1',    label: 'National Title',  sub: 'One Champion Crowned',  accent: '#ff2c91' },
  { num: '2026', label: 'Inaugural Event', sub: 'CNCA Championships',    accent: '#4dd9f4' },
]

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function Stats() {
  const prefersReduced = useReducedMotion()

  return (
    <div style={{ background: '#f5f4f0' }}>
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {stats.map(({ num, label, sub, accent }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: prefersReduced ? 0 : i * 0.1, ease }}
            className="flex flex-col justify-end px-8 py-10 lg:py-14 relative"
            style={{
              borderTop: `4px solid ${accent}`,
              borderRight: i % 2 === 0 ? '1px solid rgba(17,17,17,0.08)' : 'none',
              borderBottom: i < 2 ? '1px solid rgba(17,17,17,0.06)' : 'none',
            }}
          >
            <span
              className="font-display leading-none mb-3 block"
              style={{ fontSize: 'clamp(4rem, 10vw, 8.5rem)', color: '#111111', lineHeight: 0.85 }}
            >
              {num}
            </span>
            <span className="font-display block leading-none mb-2" style={{ fontSize: 'clamp(1.1rem, 2.2vw, 1.6rem)', color: '#111111' }}>
              {label.toUpperCase()}
            </span>
            <span className="font-condensed font-bold text-[10px] tracking-[0.22em] uppercase" style={{ color: 'rgba(17,17,17,0.35)' }}>
              {sub}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
