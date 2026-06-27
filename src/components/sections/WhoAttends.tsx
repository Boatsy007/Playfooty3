import { motion, useReducedMotion } from 'framer-motion'

const roles = ['PLAYERS', 'COACHES', 'OFFICIALS', 'FAMILIES', 'SUPPORTERS']

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function WhoAttends() {
  const prefersReduced = useReducedMotion()

  return (
    <section id="who-attends" style={{ background: '#f7f5f2' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 lg:py-0">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-0 items-start">

          {/* Left: sticky photo */}
          <div className="lg:sticky lg:top-0 lg:h-screen flex flex-col justify-center lg:pr-16 py-16 lg:py-0">
            <motion.div
              initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, ease }}
            >
              <div className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: '4/5' }}>
                <img
                  src="/hero-photo.webp"
                  alt="Championship players and supporters"
                  className="w-full h-full object-cover"
                  style={{ objectPosition: '65% 15%' }}
                />
                <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(to top, rgba(17,17,17,0.55) 0%, transparent 55%)' }} />
                <div className="absolute bottom-0 left-0 right-0 p-7">
                  <p className="font-serif italic leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1rem' }}>
                    "Country netball is built by more than players alone."
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right: large stacked type */}
          <div className="lg:pl-16 lg:py-24 flex flex-col justify-center" style={{ borderLeft: '1px solid rgba(17,17,17,0.08)' }}>
            <motion.div
              initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, ease }}
            >
              <h2 className="font-display leading-none mb-6" style={{ fontSize: 'clamp(3rem, 7vw, 6rem)', color: '#111111' }}>
                THE<br />WHOLE<br />CLUB
              </h2>
              <p className="leading-relaxed mb-12" style={{ fontSize: '0.95rem', color: 'rgba(17,17,17,0.45)', maxWidth: '32ch' }}>
                CNCA brings together everyone who contributes to country netball.
              </p>
            </motion.div>

            <div>
              {roles.map((role, i) => (
                <motion.div
                  key={role}
                  initial={{ opacity: 0, x: prefersReduced ? 0 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-20px' }}
                  transition={{ duration: 0.5, delay: prefersReduced ? 0 : i * 0.07, ease }}
                  className="py-4"
                  style={{ borderBottom: '1px solid rgba(17,17,17,0.07)' }}
                >
                  <span
                    className="font-display leading-none block"
                    style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', color: '#111111' }}
                  >
                    {role}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
