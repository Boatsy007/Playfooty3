import { motion } from 'framer-motion'
import { Award, Mail, CheckCircle2, Trophy, Lock, AlertCircle } from 'lucide-react'
import SectionLabel from '../ui/SectionLabel'
import Button from '../ui/Button'

const steps = [
  {
    number: '01',
    icon: Award,
    title: 'Win Your Local Premiership',
    desc: 'Eligibility begins on home turf. A Grade country premiership clubs are the foundation of CNCA. Win your local competition and you become eligible for an invitation.',
    note: null,
  },
  {
    number: '02',
    icon: Mail,
    title: 'Receive An Invitation',
    desc: 'Premier clubs are contacted with an official invitation to express interest in attending CNCA 2026. Invitations are limited and issued to confirm places are filled by committed clubs.',
    note: 'Runner-up clubs may be offered a wildcard invitation if the premier is unable to attend.',
  },
  {
    number: '03',
    icon: CheckCircle2,
    title: 'Secure Your Place',
    desc: 'Confirm your club\'s participation and register interest in accommodation options. A dedicated point of contact will guide your club through the next steps.',
    note: null,
  },
  {
    number: '04',
    icon: Trophy,
    title: 'Compete On The Gold Coast',
    desc: 'Your A Grade team takes the court against the best country premiership clubs in Australia. Play for the CNCA title — the highest honour in country club netball.',
    note: null,
  },
]

export default function HowItWorks() {
  const scrollToRegister = () => {
    document.querySelector('#register')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="format" className="bg-white">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <SectionLabel>How It Works</SectionLabel>
          <h2 className="text-4xl md:text-5xl font-extrabold text-navy-700 tracking-tight leading-tight mb-4">
            The CNCA Format
          </h2>
          <p className="text-lg text-navy-400 max-w-xl mx-auto leading-relaxed">
            An invitation-only championship for A Grade country premiership clubs. Limited places. Premier clubs first.
          </p>
        </motion.div>

        {/* Invitation-only banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex justify-center mb-14"
        >
          <div className="inline-flex items-center gap-2.5 bg-navy-700 text-white rounded-full px-6 py-3 text-sm font-semibold">
            <Lock size={13} className="text-pink-400" />
            Invitation only · A Grade premiership clubs · Limited places available
          </div>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
          {steps.map(({ number, icon: Icon, title, desc, note }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
              className="relative bg-gray-50 border border-navy-100 rounded-2xl p-8 card-hover"
            >
              {/* Step number */}
              <div className="flex items-start gap-5 mb-5">
                <div className="text-5xl font-black text-navy-100 leading-none flex-shrink-0 select-none">
                  {number}
                </div>
                <div className="w-11 h-11 bg-pink-500 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  <Icon size={20} className="text-white" />
                </div>
              </div>

              <h3 className="text-lg font-extrabold text-navy-700 mb-3">{title}</h3>
              <p className="text-sm text-navy-500 leading-relaxed">{desc}</p>

              {note && (
                <div className="mt-4 flex items-start gap-2 bg-pink-50 border border-pink-100 rounded-xl p-3.5">
                  <AlertCircle size={13} className="text-pink-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-pink-700 font-medium leading-snug">{note}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-pink-50 border border-pink-100 rounded-2xl px-8 py-7 flex flex-col sm:flex-row items-center justify-between gap-5"
        >
          <div>
            <p className="text-base font-bold text-navy-700 mb-1">Did your club win or are you a contender for the premiership?</p>
            <p className="text-sm text-navy-400">Register your interest now and we'll be in touch with invitation details.</p>
          </div>
          <Button onClick={scrollToRegister} size="md" className="flex-shrink-0">
            Request Invitation
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
