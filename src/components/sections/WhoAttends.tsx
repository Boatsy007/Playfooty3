import { motion, useReducedMotion } from 'framer-motion'

const roles = ['PLAYERS', 'COACHES', 'OFFICIALS', 'FAMILIES', 'SUPPORTERS']

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function WhoAttends() {
  const prefersReduced = useReducedMotion()

  return (
    <section
      id="who-attends"
      className="relative overflow-hidden"
      style={{ minHeight: 'clamp(560px, 90vh, 1000px)' }}
    >
      {/* Full-bleed photo */}
      <img
        src="/hero-photo.webp"
        alt="The whole club"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: '70% center' }}
      />

      {/* Overlays */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(13,13,13,0.55) 0%, rgba(13,13,13,0.1) 30%, rgba(13,13,13,0.85) 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(13,13,13,0.7) 0%, rgba(13,13,13,0.2) 60%, transparent 100%)' }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-between h-full min-h-[inherit] px-6 sm:px-10 lg:px-16 py-14">

        {/* Top label */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
        >
          <p className="font-condensed font-bold tracking-[0.28em] text-xs uppercase" style={{ color: '#f4c14d' }}>
            Who Attends
          </p>
        </motion.div>

        {/* Center headline */}
        <motion.div
          initial={{ opacity: 0, scale: prefersReduced ? 1 : 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease }}
          className="text-center"
        >
          <h2
            className="font-display text-white leading-none"
            style={{ fontSize: 'clamp(4rem, 14vw, 13rem)', textShadow: '0 4px 40px rgba(0,0,0,0.5)' }}
          >
            THE WHOLE<br /><span style={{ color: '#ff2c91' }}>CLUB</span>
          </h2>
        </motion.div>

        {/* Bottom roles band */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2, ease }}
          className="flex flex-wrap items-center gap-x-0 gap-y-2"
        >
          {roles.map((role, i) => (
            <div key={role} className="flex items-center">
              <span
                className="font-display text-white leading-none"
                style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2.8rem)', textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}
              >
                {role}
              </span>
              {i < roles.length - 1 && (
                <span
                  className="mx-3 lg:mx-5 font-condensed font-bold"
                  style={{ color: '#ff2c91', fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}
                >
                  ·
                </span>
              )}
            </div>
          ))}
        </motion.div>

      </div>
    </section>
  )
}
