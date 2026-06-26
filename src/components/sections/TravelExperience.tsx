import { motion } from 'framer-motion'
import { Check, Plane, Hotel, Users, Star, CreditCard } from 'lucide-react'
import SectionLabel from '../ui/SectionLabel'
import Button from '../ui/Button'

const packages = [
  {
    icon: Star,
    name: 'Supporter',
    tagline: 'For fans & families',
    color: 'border-navy-200',
    features: [
      '3 nights Gold Coast accommodation',
      'Championship event access',
      'Welcome party tickets',
      'Awards night access',
      'Airport transfers included',
    ],
    highlight: false,
  },
  {
    icon: Users,
    name: 'Team',
    tagline: 'Per playing team',
    color: 'border-pink-500',
    features: [
      '4 nights team accommodation',
      'Full competition entry',
      'Team photo session',
      'Welcome & awards events',
      'Dedicated team liaison',
      'Flexible booking options',
    ],
    highlight: true,
  },
  {
    icon: Hotel,
    name: 'Club',
    tagline: 'Whole club package',
    color: 'border-navy-200',
    features: [
      'Accommodation for full club',
      'All grades competition entry',
      'Club banner display',
      'Priority court scheduling',
      'Club-branded event experience',
      'Payment plan available',
    ],
    highlight: false,
  },
  {
    icon: Plane,
    name: 'Premium Club',
    tagline: 'Ultimate experience',
    color: 'border-gold-400',
    features: [
      'Premium resort accommodation',
      'All-inclusive catering',
      'VIP championship access',
      'Private group experiences',
      'Dedicated club host',
      'Flexible payment plans',
      'Priority grant eligibility',
    ],
    highlight: false,
  },
]

export default function TravelExperience() {
  const scrollToRegister = () => {
    document.querySelector('#register')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="travel" className="bg-pink-50">
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
            <SectionLabel>Travel & Packages</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-extrabold text-navy-700 tracking-tight leading-tight mb-6">
              Turn Your Championship Trip Into A Gold Coast Holiday
            </h2>
            <p className="text-lg text-navy-500 leading-relaxed mb-6">
              We've taken care of everything. From accommodation and transfers to event entry and experiences — our club travel packages make bringing your whole team simple, affordable and unforgettable.
            </p>
            <p className="text-base text-navy-400 leading-relaxed mb-8">
              Whether you're sending one team or your entire club, we have a package that fits. Flexible payment plans mean you can lock in early and pay over time.
            </p>

            {/* Trust badges */}
            <div className="space-y-3 mb-8">
              {[
                { icon: CreditCard, text: 'Flexible payment plans available for all clubs' },
                { icon: Hotel, text: 'Premium Gold Coast accommodation options' },
                { icon: Users, text: 'Group bookings from 10 to 200+ people' },
                { icon: Plane, text: 'Interstate travel support and coordination' },
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
              Request Travel Information
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
            {packages.map(({ icon: Icon, name, tagline, color, features, highlight }, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`relative bg-white rounded-2xl border-2 ${color} p-6 card-hover ${highlight ? 'shadow-lg shadow-pink-500/15' : ''}`}
              >
                {highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-pink-gradient text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${highlight ? 'bg-pink-500' : 'bg-navy-50'}`}>
                  <Icon size={18} className={highlight ? 'text-white' : 'text-navy-500'} />
                </div>

                <h3 className="text-lg font-extrabold text-navy-700 mb-0.5">{name}</h3>
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
