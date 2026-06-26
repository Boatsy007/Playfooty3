import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Plane, Trophy, Users, Star } from 'lucide-react'
import SectionLabel from '../ui/SectionLabel'

const days = [
  {
    day: 'Thursday',
    date: '5 Nov',
    icon: Plane,
    theme: 'Arrival Day',
    color: 'pink',
    events: [
      { time: '9:00 AM', title: 'Venue Opens', desc: 'Courts, registration and welcome village open for all clubs.' },
      { time: '12:00 PM', title: 'Club Check-In', desc: 'Official team and club registration. Collect your championship packs.' },
      { time: '3:00 PM', title: 'Opening Ceremony', desc: 'Welcome all clubs to the 2026 Australian Club Netball Championships.' },
      { time: '6:30 PM', title: 'Welcome Party', desc: 'Meet hundreds of netballers from across Australia at the official welcome event.' },
    ],
  },
  {
    day: 'Friday',
    date: '6 Nov',
    icon: Users,
    theme: 'Pool Matches',
    color: 'navy',
    events: [
      { time: '7:30 AM', title: 'Courts Open', desc: 'All grades warm up as the first full day of competition begins.' },
      { time: '8:00 AM', title: 'Pool Matches Begin', desc: 'A, B, C and D Grade pool play across all courts. Every point counts.' },
      { time: '1:00 PM', title: 'Food Truck Festival', desc: 'Break for lunch with an incredible line-up of food trucks at the village.' },
      { time: '2:00 PM', title: 'Pool Matches Continue', desc: 'Afternoon session — stakes rise as clubs fight for finals positions.' },
      { time: '5:30 PM', title: 'Live Entertainment', desc: 'Evening entertainment and social events for all players and supporters.' },
    ],
  },
  {
    day: 'Saturday',
    date: '7 Nov',
    icon: Trophy,
    theme: 'Championship Day',
    color: 'pink',
    events: [
      { time: '8:00 AM', title: 'Semi-Finals', desc: 'The best 4 clubs in each grade battle for their place in the Grand Final.' },
      { time: '11:30 AM', title: 'Club Experience Day', desc: 'Club team photos, professional photography sessions and sponsor activations.' },
      { time: '1:00 PM', title: 'Gold Coast Excursions', desc: 'Optional group activities — theme parks, beach trips and cultural experiences.' },
      { time: '7:00 PM', title: 'Club Social Evening', desc: 'A dedicated club social event celebrating the spirit of your club.' },
    ],
  },
  {
    day: 'Sunday',
    date: '8 Nov',
    icon: Star,
    theme: 'Grand Finals',
    color: 'navy',
    events: [
      { time: '9:00 AM', title: 'Grand Final Day Opens', desc: 'The biggest day in country netball. Courts packed, energy at maximum.' },
      { time: '10:00 AM', title: 'Grand Finals Begin', desc: 'All grade Grand Finals played across championship courts. Live-streamed nationally.' },
      { time: '2:00 PM', title: 'National Champions Crowned', desc: 'Champions of each grade presented with the national title. One trophy. Ultimate pride.' },
      { time: '6:00 PM', title: 'Awards Gala Night', desc: 'Celebrate the champions in style at the official ACNC Awards Gala Night.' },
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
            Four unforgettable days of competition, celebration and community on the Gold Coast.
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
                <span className="sm:hidden">{day.date}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-navy-50 text-navy-400'}`}>
                  {day.date}
                </span>
              </motion.button>
            )
          })}
        </div>

        {/* Active day content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeDay}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
          >
            <div className="bg-gray-50 rounded-2xl overflow-hidden border border-navy-100">
              {/* Day header */}
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

              {/* Events */}
              <div className="divide-y divide-navy-100">
                {days[activeDay].events.map((event, i) => (
                  <motion.div
                    key={event.title}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className="flex gap-5 px-8 py-5 group hover:bg-white transition-colors"
                  >
                    <div className="flex-shrink-0 w-20 pt-0.5">
                      <span className="text-xs font-bold text-pink-500 tracking-wide">{event.time}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-bold text-navy-700 mb-1">{event.title}</h4>
                      <p className="text-sm text-navy-400 leading-relaxed">{event.desc}</p>
                    </div>
                    <div className="flex-shrink-0 w-1 bg-pink-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Calendar icon badge */}
            <div className="flex justify-center mt-8">
              <div className="inline-flex items-center gap-2 text-sm text-navy-400 font-medium">
                <Calendar size={15} className="text-pink-500" />
                Full schedule released to confirmed clubs 60 days before the event
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
