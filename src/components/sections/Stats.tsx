import { motion, useReducedMotion } from 'framer-motion'

const items = [
  { value: 'A GRADE PREMIERS ONLY', sub: 'Eligibility' },
  { value: '4 DAYS',               sub: 'Gold Coast' },
  { value: '1 NATIONAL TITLE',     sub: 'The Prize' },
  { value: '2026',                  sub: 'Inaugural Year' },
]

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function Stats() {
  const prefersReduced = useReducedMotion()

  return (
    <div style={{ background: '#111111', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8">
        <div className="flex flex-col sm:flex-row items-stretch divide-y sm:divide-y-0 sm:divide-x divide-white/[0.07]">
          {items.map(({ value, sub }, i) => (
            <motion.div
              key={sub}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: prefersReduced ? 0 : i * 0.08, ease }}
              className="flex-1 flex flex-col justify-center py-6 sm:py-8 px-0 sm:px-8 first:pl-0 last:pr-0"
              style={{ borderColor: 'rgba(255,255,255,0.07)' }}
            >
              <span className="font-display leading-none mb-1" style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)', color: '#ffffff' }}>
                {value}
              </span>
              <span className="font-condensed font-bold text-[10px] tracking-[0.2em] uppercase" style={{ color: 'rgba(255,255,255,0.28)' }}>
                {sub}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
