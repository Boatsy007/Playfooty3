import { motion } from 'framer-motion'

const stats = [
  { num: 'A GRADE', label: 'Premiers Only', bg: '#ff2c91', text: '#ffffff', labelColor: 'rgba(255,255,255,0.7)' },
  { num: '4 DAYS',  label: 'Gold Coast',    bg: '#111111', text: '#ffffff', labelColor: 'rgba(255,255,255,0.45)' },
  { num: '1',       label: 'National Title', bg: '#f4c14d', text: '#111111', labelColor: 'rgba(17,17,17,0.6)' },
  { num: '2026',    label: 'Inaugural Year', bg: '#111111', text: '#ffffff', labelColor: 'rgba(255,255,255,0.45)' },
]

export default function Stats() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4">
      {stats.map(({ num, label, bg, text, labelColor }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
          className="flex flex-col justify-end px-7 py-10 lg:py-14 min-h-[160px] lg:min-h-[200px]"
          style={{ background: bg }}
        >
          <span className="font-display leading-none mb-2" style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)', color: text }}>
            {num}
          </span>
          <span className="font-condensed font-700 text-sm tracking-[0.18em] uppercase" style={{ color: labelColor, fontWeight: 700 }}>
            {label}
          </span>
        </motion.div>
      ))}
    </div>
  )
}
