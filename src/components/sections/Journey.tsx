import { motion, useReducedMotion } from 'framer-motion'

const steps = [
  {
    num: '01',
    heading: 'THE SEASON BEGINS',
    body: 'Across country and regional leagues in every state and territory, clubs lace up for another Senior season. Every match, every point, every win building toward the ultimate goal.',
    accent: '#d71920',
  },
  {
    num: '02',
    heading: 'LEAGUE ROUNDS',
    body: 'Week by week, teams fight for ladder positions. Form, momentum, belief. The race to the top defines the season.',
    accent: '#f4c14d',
  },
  {
    num: '03',
    heading: 'GRAND FINAL DAY',
    body: "The biggest day on the local calendar. One match. Everything on the line. The siren sounds and history is made.",
    accent: '#4dd9f4',
  },
  {
    num: '04',
    heading: 'PREMIERS CROWNED',
    body: "The trophy is raised. The photos are taken. A strong community football season — and an update to Australia's national championship is within reach.",
    accent: '#d71920',
  },
  {
    num: '05',
    heading: 'THE INVITATION ARRIVES',
    body: 'PlayFooty reaches out. The entire club knows. Something bigger than the local competition is calling — a national stage.',
    accent: '#f4c14d',
  },
  {
    num: '06',
    heading: 'THE CLUB TRIP BEGINS',
    body: 'Players. Coaches. Families. Supporters. Everyone books tickets. The future host city is calling and the whole club is going.',
    accent: '#d71920',
  },
  {
    num: '07',
    heading: 'HOST CITY TBC',
    body: 'Four days. The sun, the surf, the atmosphere, the camaraderie — and the national championship that brings it all together.',
    accent: '#4dd9f4',
  },
  {
    num: '08',
    heading: 'ONE NATIONAL CHAMPION',
    body: 'One club lifts the PlayFooty trophy. The moment is forever. The legacy begins. See you next year.',
    accent: '#f4c14d',
  },
]

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function Journey() {
  const prefersReduced = useReducedMotion()

  return (
    <section id="the-journey" style={{ background: '#0d0d0d' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-20 lg:py-32">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8, ease }}
          className="mb-20 lg:mb-28"
        >
          <p className="font-condensed font-bold tracking-[0.22em] text-xs uppercase mb-5" style={{ color: '#f4c14d' }}>
            The Road to PlayFooty
          </p>
          <h2 className="font-display text-white leading-none" style={{ fontSize: 'clamp(3.2rem, 9vw, 9rem)' }}>
            EVERY SEASON<br />LEADS <span style={{ color: '#d71920' }}>HERE.</span>
          </h2>
        </motion.div>

        {/* Timeline */}
        <div className="relative">

          {/* Vertical spine — desktop centre, mobile left */}
          <div
            className="absolute top-0 bottom-0 w-px"
            style={{
              left: '1.35rem',
              background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.08) 8%, rgba(255,255,255,0.08) 92%, transparent)',
            }}
          />
          <div
            className="absolute top-0 bottom-0 w-px hidden lg:block"
            style={{
              left: '50%',
              background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.08) 8%, rgba(255,255,255,0.08) 92%, transparent)',
            }}
          />

          <div className="space-y-0">
            {steps.map(({ num, heading, body, accent }, i) => {
              const isRight = i % 2 !== 0
              return (
                <motion.div
                  key={num}
                  initial={{ opacity: 0, x: prefersReduced ? 0 : (isRight ? 20 : -20) }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.65, ease }}
                  className="flex items-center gap-0 lg:gap-0 relative"
                >
                  {/* Mobile layout: node left, content right */}
                  <div className="flex items-start gap-6 lg:hidden w-full pl-1 py-8">
                    {/* Node */}
                    <div
                      className="w-[2.7rem] h-[2.7rem] rounded-full flex items-center justify-center shrink-0 relative z-10 mt-0.5"
                      style={{
                        background: '#0d0d0d',
                        border: `1.5px solid ${accent}`,
                        boxShadow: `0 0 16px ${accent}28`,
                      }}
                    >
                      <span className="font-condensed font-bold text-[10px]" style={{ color: accent }}>
                        {num}
                      </span>
                    </div>
                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-white leading-none mb-2" style={{ fontSize: 'clamp(1.2rem, 5vw, 1.8rem)' }}>
                        {heading}
                      </h3>
                      <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {body}
                      </p>
                    </div>
                  </div>

                  {/* Desktop layout: alternating sides */}
                  <div className="hidden lg:flex items-center w-full">
                    {/* Left content or spacer */}
                    <div className={`flex-1 py-10 ${isRight ? 'pr-16' : 'pl-0 pr-16 text-right'}`}>
                      {!isRight && (
                        <>
                          <p className="font-condensed font-bold text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: `${accent}80` }}>
                            Step {num}
                          </p>
                          <h3 className="font-display text-white leading-none mb-3" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2.2rem)' }}>
                            {heading}
                          </h3>
                          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)', maxWidth: '36ch', marginLeft: 'auto' }}>
                            {body}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Centre node */}
                    <div className="shrink-0 relative z-10">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{
                          background: '#0d0d0d',
                          border: `2px solid ${accent}`,
                          boxShadow: `0 0 24px ${accent}30`,
                        }}
                      >
                        <span className="font-condensed font-bold text-xs" style={{ color: accent }}>
                          {num}
                        </span>
                      </div>
                    </div>

                    {/* Right content or spacer */}
                    <div className={`flex-1 py-10 ${!isRight ? 'pl-16' : 'pl-16'}`}>
                      {isRight && (
                        <>
                          <p className="font-condensed font-bold text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: `${accent}80` }}>
                            Step {num}
                          </p>
                          <h3 className="font-display text-white leading-none mb-3" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2.2rem)' }}>
                            {heading}
                          </h3>
                          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)', maxWidth: '36ch' }}>
                            {body}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Bottom kicker */}
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2, ease }}
          className="mt-16 lg:mt-20 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#d71920' }} />
            <span className="font-condensed font-bold text-[10px] tracking-[0.28em] uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
              future host city · Queensland · Date TBC
            </span>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#f4c14d' }} />
          </div>
        </motion.div>

      </div>
    </section>
  )
}
