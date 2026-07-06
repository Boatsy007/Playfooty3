import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Plus } from 'lucide-react'

const faqs = [
  {
    q: 'Who can follow the PlayFooty future showcase?',
    a: 'PlayFooty is a future-facing showcase concept. No qualification, registration or invitation process is currently live; updates would be published once real criteria exist.',
    cat: 'Eligibility',
  },
  {
    q: 'Can non-competing clubs attend PlayFooty as spectators?',
    a: 'Absolutely. PlayFooty is a whole-of-community event and every club in Australia is encouraged to attend — regardless of whether they are competing. Whether you want to watch the national championship, celebrate your season or simply use PlayFooty as your club\'s annual future host city trip, everyone is welcome.',
    cat: 'Eligibility',
  },
  {
    q: 'What states and territories are represented at PlayFooty?',
    a: 'PlayFooty draws clubs from country and regional leagues across all Australian states and territories — New South Wales, Victoria, Queensland, Western Australia, South Australia, Tasmania, Northern Territory and the Australian Capital Territory.',
    cat: 'Event',
  },
  {
    q: 'When and where is PlayFooty future?',
    a: 'The PlayFooty future showcase has no confirmed date or host city. The championship runs across four days with competition, events and celebrations scheduled throughout the weekend.',
    cat: 'Event',
  },
  {
    q: 'What happens during the championship weekend?',
    a: 'The PlayFooty weekend is more than a football competition. The four-day program includes the national championship, an opening function, a club awards night, live entertainment, a festival food zone and full access to future host city experiences and tourism. It is designed as a complete end-of-season celebration.',
    cat: 'Event',
  },
  {
    q: 'Is PlayFooty just for Senior players?',
    a: 'No. PlayFooty is a whole-of-club event. The weekend is designed for Senior players, coaches, club futures, committee members, volunteers, families, supporters and junior players attending as spectators. Everyone in your club community is part of PlayFooty.',
    cat: 'Eligibility',
  },
  {
    q: 'How do I request an update for my club?',
    a: 'Complete the interest update form on this website. You will be asked for your contact details, club name, league, state and season information. Our team will be in touch within 2 business days to confirm your eligibility and next steps.',
    cat: 'Updates',
  },
  {
    q: 'Are group accommodation packages available?',
    a: 'Accommodation partnerships are not live. If a future event proceeds, real accommodation information would be published only after providers are confirmed.',
    cat: 'Travel & Accommodation',
  },
  {
    q: 'What is the format of the national championship?',
    a: 'Full competition format details will be confirmed and communicated to interested clubs. The championship is designed for Senior competition across the four-day event.',
    cat: 'Competition',
  },
  {
    q: 'How many clubs may participate at PlayFooty?',
    a: 'The championship field is future-facing and no places are currently open. Updates will be extended to interested community football clubs from across Australia. Exact numbers will be confirmed as the event develops.',
    cat: 'Competition',
  },
]

const categories = ['All', ...Array.from(new Set(faqs.map(f => f.cat)))]

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null)
  const [activecat, setActiveCat] = useState('All')
  const prefersReduced = useReducedMotion()

  const filtered = activecat === 'All' ? faqs : faqs.filter(f => f.cat === activecat)

  return (
    <section id="faq" style={{ background: '#f5f4f0' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-20 lg:py-28">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.75, ease }}
          className="mb-12"
        >
          <p className="font-condensed font-bold tracking-[0.22em] text-xs uppercase mb-5" style={{ color: '#f4c14d' }}>
            Frequently Asked Questions
          </p>
          <h2 className="font-display leading-none mb-4" style={{ fontSize: 'clamp(3rem, 7vw, 6.5rem)', color: '#111111' }}>
            EVERYTHING<br />YOU NEED TO <span style={{ color: '#d71920' }}>KNOW.</span>
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'rgba(17,17,17,0.45)', maxWidth: '52ch' }}>
            Got a question about PlayFooty? Find the answers here — or reach out to our team directly.
          </p>
        </motion.div>

        {/* Category filter */}
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1, ease }}
          className="flex flex-wrap gap-2 mb-10"
        >
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => { setActiveCat(cat); setOpen(null) }}
              className="font-condensed font-bold text-[11px] tracking-[0.2em] uppercase px-4 py-2 rounded-full transition-all duration-200"
              style={{
                background: activecat === cat ? '#111111' : 'transparent',
                color: activecat === cat ? '#ffffff' : 'rgba(17,17,17,0.45)',
                border: `1px solid ${activecat === cat ? '#111111' : 'rgba(17,17,17,0.15)'}`,
              }}
            >
              {cat}
            </button>
          ))}
        </motion.div>

        {/* Accordion */}
        <div style={{ borderTop: '1px solid rgba(17,17,17,0.08)' }}>
          <AnimatePresence initial={false}>
            {filtered.map((faq, i) => {
              const isOpen = open === i
              return (
                <motion.div
                  key={`${activecat}-${i}`}
                  initial={{ opacity: 0, y: prefersReduced ? 0 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: prefersReduced ? 0 : i * 0.04, ease }}
                  style={{ borderBottom: '1px solid rgba(17,17,17,0.08)' }}
                >
                  <button
                    className="w-full flex items-start justify-between gap-6 py-5 text-left"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                  >
                    <div className="flex-1 min-w-0">
                      <span
                        className="font-condensed font-bold text-[9px] tracking-[0.25em] uppercase block mb-1"
                        style={{ color: 'rgba(17,17,17,0.3)' }}
                      >
                        {faq.cat}
                      </span>
                      <span
                        className="font-display block leading-tight"
                        style={{
                          fontSize: 'clamp(1rem, 1.8vw, 1.35rem)',
                          color: isOpen ? '#d71920' : '#111111',
                          transition: 'color 0.2s',
                        }}
                      >
                        {faq.q.toUpperCase()}
                      </span>
                    </div>
                    <motion.div
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.2, ease }}
                      className="shrink-0 mt-1"
                      style={{ color: isOpen ? '#d71920' : 'rgba(17,17,17,0.35)' }}
                    >
                      <Plus size={18} />
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: prefersReduced ? 0 : 0.35, ease }}
                        style={{ overflow: 'hidden' }}
                      >
                        <p
                          className="pb-6 leading-relaxed"
                          style={{
                            fontSize: '0.9rem',
                            color: 'rgba(17,17,17,0.55)',
                            maxWidth: '72ch',
                          }}
                        >
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, delay: 0.2, ease }}
          className="mt-12 flex flex-col sm:flex-row sm:items-center gap-4"
        >
          <p style={{ fontSize: '0.9rem', color: 'rgba(17,17,17,0.45)' }}>
            Can't find what you're looking for?
          </p>
          <a
            href="mailto:info@playfooty.com.au"
            className="font-bold text-sm transition-colors duration-200"
            style={{ color: '#d71920' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#a50f17')}
            onMouseLeave={e => (e.currentTarget.style.color = '#d71920')}
          >
            Contact our team →
          </a>
        </motion.div>

      </div>
    </section>
  )
}
