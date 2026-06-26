import { motion } from 'framer-motion'

const stats = [
  { num: 'A GRADE', label: 'Premiers Only' },
  { num: '4 DAYS', label: 'Gold Coast' },
  { num: '1', label: 'National Title' },
  { num: '2026', label: 'Inaugural Event' },
]

export default function Stats() {
  return (
    <section style={{ background: '#111111' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          {stats.map(({ num, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
              className="px-6 py-10 lg:py-12 flex flex-col gap-2"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <span className="font-display text-white leading-none"
                style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}>
                {num}
              </span>
              <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: '#ff2c91' }}>
                {label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
