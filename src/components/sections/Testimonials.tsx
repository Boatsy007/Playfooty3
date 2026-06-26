import { motion } from 'framer-motion'
import { Quote, MapPin } from 'lucide-react'
import SectionLabel from '../ui/SectionLabel'

const testimonials = [
  {
    quote: "We brought 45 players and supporters to ACNC last year and every single person said it was the best netball experience of their lives. We're already locked in for 2026.",
    name: 'Robyn Hatcher',
    title: 'Club President',
    club: 'Mudgee Netball Club',
    state: 'NSW',
    grade: 'A & B Grade',
  },
  {
    quote: "As a coach, it's incredible to see your players compete at a national level. But it's the off-court experience — the parties, the Gold Coast, the community — that makes it truly special.",
    name: 'Sarah Thornton',
    title: 'Head Coach',
    club: 'Warrnambool Netball Club',
    state: 'VIC',
    grade: 'A Grade',
  },
  {
    quote: "Our committee was hesitant about the cost, but the travel packages made it so manageable. Twelve months later our players are still talking about it. Best investment we've made.",
    name: 'Michelle Davies',
    title: 'Club Secretary',
    club: 'Toowoomba Storm NC',
    state: 'QLD',
    grade: 'B & C Grade',
  },
  {
    quote: "The professionalism of this event is on another level. Professional photography, livestreamed finals, an awards gala — it felt like a national sporting event, because it is one.",
    name: 'Karen Whitfield',
    title: 'Club Manager',
    club: 'Bunbury Netball Association',
    state: 'WA',
    grade: 'A Grade',
  },
  {
    quote: "We won the $10K grant in 2024 and used it to resurface two courts. The application process was simple and it genuinely changed our club. Can't recommend ACNC highly enough.",
    name: 'Tracey Osman',
    title: 'President',
    club: 'Mt Gambier Netball Club',
    state: 'SA',
    grade: 'All Grades',
  },
  {
    quote: "Our D Grade team had never played outside our region. ACNC gave them something to aspire to, train for, and ultimately achieve. We'll be back every single year.",
    name: 'Julie Patterson',
    title: 'Coach',
    club: 'Longreach Netball Club',
    state: 'QLD',
    grade: 'C & D Grade',
  },
]

const clubNames = [
  'Mudgee NC', 'Warrnambool NC', 'Toowoomba Storm', 'Bunbury Association',
  'Mt Gambier NC', 'Longreach NC', 'Ballarat NC', 'Launceston NC',
  'Albury-Wodonga', 'Tamworth NC', 'Bendigo NC', 'Wagga Wagga NC',
  'Cairns NC', 'Townsville NC', 'Dubbo NC', 'Orange NC',
]

export default function Testimonials() {
  return (
    <section id="why-acnc" className="bg-white overflow-hidden">
      {/* Ticker */}
      <div className="bg-navy-700 py-3 overflow-hidden">
        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="flex gap-8 whitespace-nowrap"
        >
          {[...clubNames, ...clubNames].map((name, i) => (
            <span key={i} className="text-xs font-bold text-white/60 tracking-widest uppercase flex items-center gap-3">
              <span className="text-pink-500">◆</span>
              {name}
            </span>
          ))}
        </motion.div>
      </div>

      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <SectionLabel>Club Stories</SectionLabel>
          <h2 className="text-4xl md:text-5xl font-extrabold text-navy-700 tracking-tight leading-tight mb-4">
            Why Clubs Love ACNC
          </h2>
          <p className="text-lg text-navy-400 max-w-xl mx-auto">
            Hear from club presidents, coaches and committee members who've experienced it firsthand.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55, delay: i * 0.08 }}
              className="bg-gray-50 rounded-2xl p-7 border border-navy-50 card-hover relative"
            >
              <Quote size={32} className="text-pink-200 mb-4" fill="currentColor" />
              <p className="text-sm text-navy-500 leading-relaxed mb-6 italic">"{t.quote}"</p>
              <div className="border-t border-navy-100 pt-5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-navy-700">{t.name}</p>
                  <p className="text-xs text-navy-400">{t.title}</p>
                  <p className="text-xs font-semibold text-navy-600 mt-0.5">{t.club}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-pink-500 bg-pink-50 px-2.5 py-1 rounded-full">
                    <MapPin size={9} />
                    {t.state}
                  </span>
                  <p className="text-xs text-navy-400 mt-1">{t.grade}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
