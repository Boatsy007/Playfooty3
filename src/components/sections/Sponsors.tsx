import { motion, useReducedMotion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'

const tiers = [
  {
    tier: 'Future Major Partner',
    label: 'MAJOR PARTNER',
    desc: 'Future naming-rights opportunity for the PlayFooty Championship concept. No sponsor is currently presented as live.',
    accent: '#f4c14d',
    placeholder: { width: 260, height: 80, label: 'Your Brand Here' },
    size: 'lg',
  },
  {
    tier: 'Future Partners',
    label: 'FUTURE PARTNERS',
    desc: 'Future partnership tier — category, digital and event concepts shown for sponsor discussions only.',
    accent: '#d71920',
    placeholders: [
      { width: 160, height: 56, label: 'Future Accommodation' },
      { width: 160, height: 56, label: 'Future Apparel' },
      { width: 160, height: 56, label: 'Future Ball' },
    ],
    size: 'md',
  },
  {
    tier: 'Championship Partners',
    label: 'CHAMPIONSHIP PARTNERS',
    desc: 'Future supporting partner opportunities across media, travel and community storytelling.',
    accent: '#4dd9f4',
    placeholders: [
      { width: 120, height: 48, label: 'Future Airline' },
      { width: 120, height: 48, label: 'Future Media' },
      { width: 120, height: 48, label: 'Future Recovery' },
      { width: 120, height: 48, label: 'Future Nutrition' },
    ],
    size: 'sm',
  },
]

const opportunities = [
  { title: 'Championship Naming Rights', desc: 'Own the event name. The ultimate sponsorship asset in grassroots Australian sport.' },
  { title: 'Digital & Social Media', desc: 'Premium placement across the PlayFooty website and all championship social channels.' },
  { title: 'On-Court Branding', desc: 'Court-side signage, banner placement and uniform branding throughout the championship.' },
  { title: 'Event Activation Space', desc: 'Dedicated activation zones within the championship precinct for the full four days.' },
  { title: 'Category Exclusivity', desc: 'Category exclusivity can be scoped once real partner packages exist.' },
  { title: 'Community & Legacy', desc: "Associate your brand with Australia's growing community football community." },
]

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function Sponsors() {
  const prefersReduced = useReducedMotion()

  return (
    <section id="partners" style={{ background: '#111111' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-20 lg:py-28">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.75, ease }}
          className="grid lg:grid-cols-[5fr,4fr] gap-8 lg:gap-16 items-end mb-16 lg:mb-20"
        >
          <div>
            <p className="font-condensed font-bold tracking-[0.22em] text-xs uppercase mb-5" style={{ color: '#f4c14d' }}>
              Partnership Opportunities
            </p>
            <h2 className="font-display text-white leading-none" style={{ fontSize: 'clamp(3rem, 8vw, 7.5rem)' }}>
              BECOME A<br /><span style={{ color: '#d71920' }}>PlayFooty PARTNER.</span>
            </h2>
          </div>
          <div>
            <p style={{ fontSize: 'clamp(1rem, 1.6vw, 1.1rem)', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
              PlayFooty is Australia's national community football championship — a premium, future-facing event reaching clubs, families and communities from every state and territory.
            </p>
            <p className="mt-3" style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.7 }}>
              Partner with PlayFooty and align your brand with community, aspiration and the spirit of grassroots Australian sport.
            </p>
          </div>
        </motion.div>

        {/* Tier layouts */}
        <div className="space-y-6 mb-16">
          {tiers.map(({ tier, label, desc, accent, placeholder, placeholders, size }, ti) => (
            <motion.div
              key={tier}
              initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.6, delay: prefersReduced ? 0 : ti * 0.1, ease }}
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${accent}20`,
                borderTop: `3px solid ${accent}`,
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10 px-7 py-7 lg:px-9 lg:py-8">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-condensed font-bold text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: `${accent}cc` }}>
                    {label}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)', maxWidth: '48ch' }}>
                    {desc}
                  </p>
                </div>

                {/* Logo placeholder(s) */}
                <div className={`flex flex-wrap items-center gap-4 shrink-0 ${size === 'sm' ? 'gap-3' : ''}`}>
                  {placeholder && (
                    <div
                      className="flex items-center justify-center rounded-xl"
                      style={{
                        width: placeholder.width,
                        height: placeholder.height,
                        background: 'rgba(255,255,255,0.04)',
                        border: `1px dashed ${accent}40`,
                      }}
                    >
                      <span className="font-condensed font-bold text-[9px] tracking-[0.22em] uppercase" style={{ color: `${accent}60` }}>
                        {placeholder.label}
                      </span>
                    </div>
                  )}
                  {placeholders?.map(ph => (
                    <div
                      key={ph.label}
                      className="flex items-center justify-center rounded-xl"
                      style={{
                        width: ph.width,
                        height: ph.height,
                        background: 'rgba(255,255,255,0.04)',
                        border: `1px dashed ${accent}40`,
                      }}
                    >
                      <span className="font-condensed font-bold text-[8px] tracking-[0.2em] uppercase text-center px-2" style={{ color: `${accent}60` }}>
                        {ph.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Opportunity grid */}
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-30px' }}
          transition={{ duration: 0.7, ease }}
          className="mb-12"
        >
          <p className="font-condensed font-bold tracking-[0.22em] text-[10px] uppercase mb-8" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Partnership Assets
          </p>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            {opportunities.map(({ title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: prefersReduced ? 0 : 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: prefersReduced ? 0 : i * 0.06, ease }}
                className="px-0 py-6 pr-8"
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  borderRight: i % 3 !== 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  paddingLeft: i % 3 !== 0 ? '2rem' : '0',
                }}
              >
                <div className="w-1 h-4 mb-3 rounded-full" style={{ background: '#d71920' }} />
                <h3 className="font-display text-white leading-none mb-2" style={{ fontSize: 'clamp(0.95rem, 1.5vw, 1.2rem)' }}>
                  {title.toUpperCase()}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {desc}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, delay: 0.15, ease }}
          className="flex flex-col sm:flex-row sm:items-center gap-5"
        >
          <a
            href="mailto:info@playfooty.com.au"
            className="group inline-flex items-center gap-2.5 font-bold rounded-full transition-all duration-200"
            style={{
              background: '#d71920',
              color: '#ffffff',
              fontSize: '0.8125rem',
              padding: '1rem 2rem',
              letterSpacing: '0.06em',
              boxShadow: '0 8px 32px rgba(215,25,32,0.3)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#a50f17'
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(215,25,32,0.45)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#d71920'
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(215,25,32,0.3)'
            }}
          >
            ENQUIRE ABOUT PARTNERSHIP
            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-200" />
          </a>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.28)' }}>
            info@playfooty.com.au · Sponsorship packages available now
          </p>
        </motion.div>

      </div>
    </section>
  )
}
