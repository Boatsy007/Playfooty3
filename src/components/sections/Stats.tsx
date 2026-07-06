import { motion, useReducedMotion } from 'framer-motion'

const stats = [
  { num: '100+',   numSize: 'clamp(3rem, 7vw, 6.5rem)', label: 'Leagues & Associations', sub: 'Country and regional football across Australia',  accent: '#d71920' },
  { num: '8',      numSize: 'clamp(4rem, 9vw, 8rem)',   label: 'States & Territories',   sub: 'One national picture',                            accent: '#f4c14d' },
  { num: 'Weekly', numSize: 'clamp(2.4rem, 5vw, 5rem)', label: 'Ranking Updates',        sub: 'Recalculated from live ladder data',              accent: '#d71920' },
  { num: '1',      numSize: 'clamp(4rem, 9vw, 8rem)',   label: 'National No. 1',         sub: 'Settled on the court, tracked here',              accent: '#4dd9f4' },
]

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function Stats() {
  const prefersReduced = useReducedMotion()

  return (
    <section style={{ background: '#f5f4f0' }}>
      {/* Heading */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-14 lg:pt-20 pb-10">
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease }}
        >
          <h2 className="font-display leading-none mb-4" style={{ fontSize: 'clamp(3rem, 7vw, 6rem)', color: '#111111' }}>
            ONE NATIONAL<br /><span style={{ color: '#d71920' }}>PICTURE</span>
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'rgba(17,17,17,0.45)', maxWidth: '52ch' }}>
            PlayFooty tracks Senior community football from leagues across Australia and ranks every club on one national ladder — updated every week of the season.
          </p>
        </motion.div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4" style={{ borderTop: '1px solid rgba(17,17,17,0.07)' }}>
        {stats.map(({ num, numSize, label, sub, accent }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: prefersReduced ? 0 : i * 0.1, ease }}
            className="flex flex-col justify-end px-6 sm:px-8 py-8 lg:py-12 relative"
            style={{
              borderTop: `4px solid ${accent}`,
              borderRight: i % 2 === 0 ? '1px solid rgba(17,17,17,0.08)' : 'none',
              borderBottom: i < 2 ? '1px solid rgba(17,17,17,0.06)' : 'none',
            }}
          >
            <span
              className="font-display leading-none mb-2 block"
              style={{ fontSize: numSize, color: '#111111', lineHeight: 0.88 }}
            >
              {num}
            </span>
            <span className="font-display block leading-none mb-1.5" style={{ fontSize: 'clamp(0.95rem, 2vw, 1.4rem)', color: '#111111' }}>
              {label.toUpperCase()}
            </span>
            <span className="font-condensed font-bold text-[10px] tracking-[0.22em] uppercase" style={{ color: 'rgba(17,17,17,0.35)' }}>
              {sub}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
