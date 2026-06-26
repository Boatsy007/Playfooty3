import { motion } from 'framer-motion'
import { Check, Hotel, Users, Heart, Home } from 'lucide-react'
import SectionLabel from '../ui/SectionLabel'
import Button from '../ui/Button'

const packages = [
  {
    icon: Users,
    name: 'Team Accommodation',
    tagline: 'For the playing group',
    features: [
      'Options for full playing squad',
      'Close to championship venue',
      'Group booking support',
      'Flexible booking windows',
    ],
    highlight: false,
  },
  {
    icon: Hotel,
    name: 'Club Group Bookings',
    tagline: 'For the whole travelling club',
    features: [
      'Accommodation for larger groups',
      'Club-together options where available',
      'Dedicated booking coordination',
      'Payment plan options',
    ],
    highlight: true,
  },
  {
    icon: Heart,
    name: 'Supporter Accommodation',
    tagline: 'For families & supporters',
    features: [
      'Options near the venue',
      'Suitable for couples and families',
      'Flexible check-in and check-out',
      'Enquire for availability',
    ],
    highlight: false,
  },
  {
    icon: Home,
    name: 'Family-Friendly Options',
    tagline: 'For travelling families',
    features: [
      'Family room configurations',
      'Gold Coast holiday options',
      'Proximity to beaches and attractions',
      'Enquire for tailored options',
    ],
    highlight: false,
  },
]

export default function TravelExperience() {
  const scrollToRegister = () => {
    document.querySelector('#register')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="accommodation" className="bg-pink-50">
      <div className="section-container">
        <div className="grid lg:grid-cols-2 gap-14 items-start">
          {/* Left copy */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.65 }}
            className="lg:sticky lg:top-28"
          >
            <SectionLabel>Accommodation</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-extrabold text-navy-700 tracking-tight leading-tight mb-6">
              Make The Trip Easy For Your Club
            </h2>
            <p className="text-lg text-navy-500 leading-relaxed mb-6">
              CNCA will work with accommodation partners to provide group options for travelling clubs, teams, families and supporters. Our goal is to make the end-of-season trip to the Gold Coast as simple as possible.
            </p>
            <p className="text-base text-navy-400 leading-relaxed mb-8">
              Whether you're coordinating accommodation for ten people or a hundred, register your interest and we'll connect you with the right options.
            </p>

            <div className="space-y-3 mb-8">
              {[
                { icon: Hotel, text: 'Group accommodation options near the venue' },
                { icon: Users, text: 'Suitable for teams, families and supporters' },
                { icon: Home, text: 'Gold Coast location — beaches and attractions nearby' },
                { icon: Heart, text: 'Flexible payment options where available' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon size={14} className="text-white" />
                  </div>
                  <p className="text-sm font-medium text-navy-600">{text}</p>
                </div>
              ))}
            </div>

            <Button size="lg" onClick={scrollToRegister}>
              Enquire About Accommodation
            </Button>
          </motion.div>

          {/* Right packages */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.65 }}
            className="grid sm:grid-cols-2 gap-4"
          >
            {packages.map(({ icon: Icon, name, tagline, features, highlight }, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`relative bg-white rounded-2xl border-2 p-6 card-hover ${highlight ? 'border-pink-500 shadow-lg shadow-pink-500/15' : 'border-navy-100'}`}
              >
                {highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-pink-gradient text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                      Most Requested
                    </span>
                  </div>
                )}

                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${highlight ? 'bg-pink-500' : 'bg-navy-50'}`}>
                  <Icon size={18} className={highlight ? 'text-white' : 'text-navy-500'} />
                </div>

                <h3 className="text-base font-extrabold text-navy-700 mb-0.5">{name}</h3>
                <p className="text-xs text-pink-500 font-semibold uppercase tracking-wide mb-4">{tagline}</p>

                <ul className="space-y-2.5 mb-5">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check size={13} className="text-pink-500 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-navy-500 leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={scrollToRegister}
                  className="w-full text-center py-2.5 text-xs font-bold rounded-xl border-2 border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white transition-all duration-200"
                >
                  Enquire Now
                </button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
