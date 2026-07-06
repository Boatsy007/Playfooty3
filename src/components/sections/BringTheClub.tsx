import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Swords, Users, Heart, ChevronRight } from 'lucide-react'

const groups = [
  {
    icon: Swords,
    label: 'Senior Players',
    tag: 'Competes',
    tagColor: '#d71920',
    headline: 'YOUR TEAM.\nONE SHOT.',
    desc: 'Your Senior side goes head-to-head with the best country clubs in Australia. Premiership on the line. National title at stake.',
    stat: '14 Players',
    statLabel: 'per squad',
  },
  {
    icon: Users,
    label: 'Coaches & Committee',
    tag: 'Travels',
    tagColor: '#f4c14d',
    headline: 'LEAD THE\nCLUB.',
    desc: 'Prepare your squad, manage the program and be part of the biggest moment in your club\'s history. Right beside them every step.',
    stat: 'Full',
    statLabel: 'club access',
  },
  {
    icon: Heart,
    label: 'Families & Supporters',
    tag: 'Celebrates',
    tagColor: '#4dd9f4',
    headline: 'THE CROWD\nTHAT MATTERS.',
    desc: 'Cheer from the stands, take in the future host city and celebrate a season\'s worth of effort alongside every club in the country.',
    stat: 'No limit',
    statLabel: 'on supporters',
  },
]

export default function BringTheClub() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  const scrollToRegister = () =>
    document.querySelector('#register')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section id="bring-the-club" className="relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #040e22 0%, #081a3d 50%, #040e22 100%)' }}>

      {/* Atmospheric glows */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(215,25,32,0.08) 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(244,193,77,0.06) 0%, transparent 70%)' }} />

      <div className="relative z-10 max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12 py-24 lg:py-32">

        {/* Editorial header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="mb-20"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="h-[3px] w-10 bg-[#d71920]" />
            <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-[#d71920]">Who It's For</span>
          </div>
          <div className="grid lg:grid-cols-[1fr,auto] items-end gap-8">
            <h2 className="font-display leading-none text-white"
              style={{ fontSize: 'clamp(3.5rem, 8vw, 8rem)' }}>
              BRING THE<br />
              <span style={{ color: '#d71920' }}>WHOLE CLUB</span>
            </h2>
            <p className="text-white/50 text-lg leading-relaxed max-w-sm lg:pb-3">
              The Senior team competes. Every other member of your club travels, cheers and celebrates.
            </p>
          </div>
        </motion.div>

        {/* Cards grid */}
        <div ref={ref} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {groups.map(({ icon: Icon, label, tag, tagColor, headline, desc, stat, statLabel }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 48 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className="group relative rounded-3xl overflow-hidden cursor-default"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              whileHover={{ y: -6, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }}
            >
              {/* Hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: `radial-gradient(circle at 50% 0%, ${tagColor}18 0%, transparent 65%)` }} />

              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-[3px] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
                style={{ backgroundColor: tagColor }} />

              <div className="relative z-10 p-8 lg:p-9 flex flex-col h-full min-h-[380px]">

                {/* Icon + tag */}
                <div className="flex items-start justify-between mb-8">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `${tagColor}18`, border: `1px solid ${tagColor}30` }}>
                    <Icon size={22} style={{ color: tagColor }} />
                  </div>
                  <span className="text-[9px] font-bold tracking-[0.22em] uppercase px-3 py-1.5 rounded-full"
                    style={{ color: tagColor, background: `${tagColor}15`, border: `1px solid ${tagColor}30` }}>
                    {tag}
                  </span>
                </div>

                {/* Headline */}
                <h3 className="font-display leading-none text-white mb-5 whitespace-pre-line"
                  style={{ fontSize: 'clamp(2.2rem, 3.5vw, 3rem)' }}>
                  {headline}
                </h3>

                {/* Desc */}
                <p className="text-white/45 text-sm leading-relaxed flex-1 mb-8">
                  {desc}
                </p>

                {/* Stat + label */}
                <div className="border-t pt-6" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display leading-none" style={{ fontSize: '1.8rem', color: tagColor }}>
                      {stat}
                    </span>
                    <span className="text-white/35 text-xs font-bold tracking-wide uppercase">{statLabel}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA strip */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 rounded-2xl px-8 py-6"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div>
            <p className="font-display text-white leading-none mb-1" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>
              READY TO BRING YOUR CLUB?
            </p>
            <p className="text-white/40 text-sm">Register your interest and we'll be in touch.</p>
          </div>
          <button
            onClick={scrollToRegister}
            className="group shrink-0 flex items-center gap-3 font-bold text-sm px-8 py-4 rounded-full transition-all duration-300"
            style={{ background: '#d71920', color: '#ffffff' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#a50f17')}
            onMouseLeave={e => (e.currentTarget.style.background = '#d71920')}
          >
            Join updates
            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform duration-200" />
          </button>
        </motion.div>
      </div>
    </section>
  )
}
