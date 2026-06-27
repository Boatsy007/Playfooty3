import { motion, useReducedMotion } from 'framer-motion'

const reasons = [
  {
    num: '01',
    title: 'COMPETE',
    desc: "Australia's best A Grade country clubs, competing head-to-head for the national title.",
    accent: '#ff2c91',
  },
  {
    num: '02',
    title: 'CONNECT',
    desc: 'Celebrate every player, coach, official and supporter who made the season possible.',
    accent: '#f4c14d',
  },
  {
    num: '03',
    title: 'EXPLORE',
    desc: "A full championship weekend on the Gold Coast — one of Australia's premier destinations.",
    accent: '#4dd9f4',
  },
]

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function WhyTravel() {
  const prefersReduced = useReducedMotion()

  return (
    <section style={{ background: '#f5f4f0' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-20 lg:py-28">

        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease }}
          className="mb-14"
        >
          <h2 className="font-display leading-none" style={{ fontSize: 'clamp(3rem, 8vw, 7rem)', color: '#111111' }}>
            WHY CLUBS<br /><span style={{ color: '#ff2c91' }}>WILL TRAVEL</span>
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-4">
          {reasons.map(({ num, title, desc, accent }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: prefersReduced ? 0 : 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, delay: prefersReduced ? 0 : i * 0.1, ease }}
              className="relative flex flex-col p-8 lg:p-10 rounded-2xl overflow-hidden"
              style={{ background: '#111111', borderTop: `4px solid ${accent}` }}
            >
              <span
                className="font-condensed font-bold text-xs tracking-[0.2em] mb-6 block"
                style={{ color: `${accent}80` }}
              >
                {num}
              </span>

              <h3
                className="font-display text-white leading-none mb-5"
                style={{ fontSize: 'clamp(3rem, 6vw, 5rem)' }}
              >
                {title}
              </h3>

              <p
                className="text-sm leading-relaxed mt-auto"
                style={{ color: 'rgba(255,255,255,0.45)' }}
              >
                {desc}
              </p>

              {/* Bottom accent */}
              <div
                className="absolute bottom-0 left-0 right-0 h-[2px] opacity-20"
                style={{ background: `linear-gradient(to right, ${accent}, transparent)` }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
