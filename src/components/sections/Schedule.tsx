import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plane, Users, Trophy, Star } from 'lucide-react'
import SectionLabel from '../ui/SectionLabel'

const days = [
  {
    day: 'Thursday',
    date: '5 Nov',
    icon: Plane,
    theme: 'Arrival + Welcome',
    events: [
      { time: 'Morning', title: 'Venue Opens', desc: 'Courts, registration and the CNCA welcome hub open for arriving clubs.' },
      { time: 'Afternoon', title: 'Club Check-In', desc: 'Official club registration. Meet your liaison and collect your championship materials.' },
      { time: 'Evening', title: 'Welcome Function', desc: 'All clubs, coaches, families and supporters welcomed together at the official CNCA opening function.' },
    ],
  },
  {
    day: 'Friday',
    date: '6 Nov',
    icon: Users,
    theme: 'Pool Matches',
    events: [
      { time: 'Morning', title: 'Pool Play Begins', desc: 'A Grade pool matches get underway. Every result matters as clubs fight for finals positions.' },
      { time: 'Midday', title: 'Lunch Break', desc: 'Food and entertainment on-site for players, supporters and families.' },
      { time: 'Afternoon', title: 'Pool Play Continues', desc: 'Afternoon rounds complete the pool stage. Standings confirmed heading into finals day.' },
      { time: 'Evening', title: 'Club Social', desc: 'Informal club social for players, coaches and travelling supporters.' },
    ],
  },
  {
    day: 'Saturday',
    date: '7 Nov',
    icon: Trophy,
    theme: 'Finals + Celebration',
    events: [
      { time: 'Morning', title: 'Semi-Finals', desc: 'The top clubs from pool play meet in the semi-finals. Intensity rises.' },
      { time: 'Afternoon', title: 'Club Experience', desc: 'Official team photography sessions, sponsor activations and club celebration events.' },
      { time: 'All Day', title: 'Gold Coast', desc: 'Free time to explore the Gold Coast — beaches, attractions and dining for the whole travelling group.' },
    ],
  },
  {
    day: 'Sunday',
    date: '8 Nov',
    icon: Star,
    theme: 'Grand Final + Presentation',
    events: [
      { time: 'Morning', title: 'Grand Final Day', desc: 'The CNCA Grand Final. The two best A Grade country clubs in Australia take the court for the national title.' },
      { time: 'Midday', title: 'CNCA Grand Final', desc: 'One match. One title. The CNCA champion is crowned in front of clubs, families and supporters from across Australia.' },
      { time: 'Evening', title: 'Presentation & Celebration', desc: 'Official CNCA awards presentation honouring the champion club and the players who defined the weekend.' },
    ],
  },
]

export default function Schedule() {
  const [activeDay, setActiveDay] = useState(0)

  return (
    <section id="schedule" className="bg-white">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <SectionLabel>4 Days</SectionLabel>
          <h2 className="text-4xl md:text-5xl font-extrabold text-navy-700 tracking-tight leading-tight mb-4">
            Event Schedule
          </h2>
          <p className="text-lg text-navy-400 max-w-xl mx-auto">
            Four days on the Gold Coast — competition, celebration and community for the whole club.
          </p>
        </motion.div>

        {/* Day tabs */}
        <div className="flex flex-wrap gap-3 justify-center mb-10">
          {days.map((day, i) => {
            const Icon = day.icon
            const isActive = activeDay === i
            return (
              <motion.button
                key={day.day}
                onClick={() => setActiveDay(i)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 border ${
                  isActive
                    ? 'bg-pink-500 text-white border-pink-500 shadow-lg shadow-pink-500/20'
                    : 'bg-white text-navy-500 border-navy-100 hover:border-pink-300 hover:text-pink-500'
                }`}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{day.day}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-navy-50 text-navy-400'}`}>
                  {day.date}
                </span>
              </motion.button>
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeDay}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
          >
            <div className="bg-gray-50 rounded-2xl overflow-hidden border border-navy-100">
              <div className="bg-pink-gradient px-8 py-6 flex items-center justify-between">
                <div>
                  <div className="text-pink-200 text-xs font-bold tracking-widest uppercase mb-1">{days[activeDay].date} · 2026</div>
                  <h3 className="text-2xl font-extrabold text-white">{days[activeDay].day}</h3>
                  <p className="text-pink-200 text-sm font-medium mt-0.5">{days[activeDay].theme}</p>
                </div>
                <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center">
                  {(() => { const Icon = days[activeDay].icon; return <Icon size={26} className="text-white" /> })()}
                </div>
              </div>

              <div className="divide-y divide-navy-100">
                {days[activeDay].events.map((event, i) => (
                  <motion.div
                    key={event.title}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className="flex gap-5 px-8 py-5 group hover:bg-white transition-colors"
                  >
                    <div className="flex-shrink-0 w-24 pt-0.5">
                      <span className="text-xs font-bold text-pink-500 tracking-wide">{event.time}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-bold text-navy-700 mb-1">{event.title}</h4>
                      <p className="text-sm text-navy-400 leading-relaxed">{event.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="flex justify-center mt-6">
              <p className="text-sm text-navy-400 font-medium text-center">
                Full schedule shared with confirmed clubs in advance of the event.
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
