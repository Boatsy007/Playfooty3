import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Sunset, Moon, Utensils, Info } from 'lucide-react'

interface ScheduleEvent {
  time: string
  title: string
  desc?: string
  icon: typeof Sun
}

interface Day {
  id: string
  day: string
  date: string
  theme: string
  events: ScheduleEvent[]
}

const days: Day[] = [
  {
    id: 'thu',
    day: 'Day One',
    date: 'Oct 2027',
    theme: 'Arrival + Welcome Function',
    events: [
      { time: 'Morning', title: 'Venue Opens', desc: 'Championship venue opens for arrivals', icon: Sun },
      { time: 'Afternoon', title: 'Club Check-In', desc: 'Official registration for all participating clubs', icon: Sunset },
      { time: 'Evening', title: 'Welcome Function', desc: 'All clubs, coaches, families and supporters welcomed at the official CNCA opening function', icon: Moon },
    ],
  },
  {
    id: 'fri',
    day: 'Day Two',
    date: 'Day 2',
    theme: 'Pool Matches',
    events: [
      { time: 'Morning', title: 'Pool Play Begins', desc: 'A Grade pool matches get underway', icon: Sun },
      { time: 'Midday', title: 'Lunch Break', desc: 'Food and entertainment on-site for all attendees', icon: Utensils },
      { time: 'Afternoon', title: 'Pool Play Continues', desc: 'Remaining pool rounds played out', icon: Sunset },
      { time: 'Evening', title: 'Club Social', desc: 'Clubs come together for an evening social event', icon: Moon },
    ],
  },
  {
    id: 'sat',
    day: 'Day Three',
    date: 'Day 3',
    theme: 'Finals + Celebration',
    events: [
      { time: 'Morning', title: 'Semi-Finals', desc: 'Top clubs from pool play compete for a Grand Final spot', icon: Sun },
      { time: 'Afternoon', title: 'Club Photography & Experiences', desc: 'Professional team and club photography sessions', icon: Sunset },
      { time: 'Evening', title: 'Gold Coast Evening', desc: 'Experience everything the Gold Coast has to offer', icon: Moon },
    ],
  },
  {
    id: 'sun',
    day: 'Day Four',
    date: 'Day 4',
    theme: 'Grand Final + Presentation',
    events: [
      { time: 'Morning', title: 'Grand Final Day Opens', desc: 'The final day of championship begins', icon: Sun },
      { time: 'Midday', title: 'CNCA Grand Final', desc: 'One match. One title.', icon: Sunset },
      { time: 'Evening', title: 'Awards Presentation', desc: 'Official CNCA awards honouring the champion club', icon: Moon },
    ],
  },
]

const tabContentVariants = {
  enter: { opacity: 0, y: 24 },
  center: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.25 } },
}

const eventRowVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const eventVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
}

export default function Schedule() {
  const [active, setActive] = useState('thu')
  const activeDay = days.find(d => d.id === active)!

  return (
    <section id="schedule" className="bg-white overflow-hidden">
      <div className="section-pad">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="mb-14"
        >
          <div className="section-divider mb-6" />
          <div className="text-xs font-bold tracking-[0.18em] uppercase text-pink mb-4">Event Schedule</div>
          <h2 className="font-display text-display-md text-navy leading-none">
            FOUR DAYS.<br />EVERY MOMENT.
          </h2>
        </motion.div>

        {/* Day tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="flex flex-wrap gap-3 mb-10"
        >
          {days.map(d => (
            <motion.button
              key={d.id}
              onClick={() => setActive(d.id)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className={`relative px-6 py-3 rounded-full font-semibold text-sm transition-all duration-300 ${
                active === d.id
                  ? 'bg-pink text-white shadow-pink'
                  : 'bg-surface text-navy/60 hover:text-navy hover:bg-navy-muted'
              }`}
            >
              <span className="font-display tracking-wide text-base mr-2">{d.day}</span>
              <span className="font-sans text-xs opacity-70">{d.date}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* Day content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            variants={tabContentVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {/* Day header bar */}
            <div className="bg-pink-grad rounded-2xl px-8 py-6 mb-6 flex items-center gap-4">
              <div className="flex-1">
                <div className="font-display text-white/60 text-sm tracking-widest uppercase mb-1">{activeDay.date}</div>
                <div className="font-display text-white text-[clamp(1.6rem,4vw,2.5rem)] leading-none">{activeDay.theme}</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Sun size={22} className="text-white" />
              </div>
            </div>

            {/* Events list */}
            <div className="bg-white rounded-2xl border border-navy/8 overflow-hidden shadow-glass">
              <motion.div
                variants={eventRowVariants}
                initial="hidden"
                animate="show"
              >
                {activeDay.events.map(({ time, title, desc, icon: Icon }, i) => (
                  <motion.div
                    key={`${active}-${i}`}
                    variants={eventVariants}
                    className="group relative flex gap-6 items-start px-6 md:px-8 py-6 border-b border-navy/6 last:border-0 hover:bg-surface transition-colors duration-300 cursor-default"
                  >
                    {/* Pink hover accent */}
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-pink scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center" />

                    {/* Time */}
                    <div className="w-24 shrink-0 pt-0.5">
                      <div className="flex items-center gap-2 text-pink">
                        <Icon size={13} />
                        <span className="text-xs font-bold uppercase tracking-widest">{time}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h4 className="font-bold text-navy text-base mb-1">{title}</h4>
                      {desc && <p className="text-navy/55 text-sm leading-snug">{desc}</p>}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex items-center gap-3 text-navy/40"
        >
          <Info size={14} />
          <p className="text-sm font-medium">Full schedule shared with confirmed clubs in advance.</p>
        </motion.div>
      </div>
    </section>
  )
}
