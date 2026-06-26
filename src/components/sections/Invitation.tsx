import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { CheckCircle, MapPin, Calendar, Lock } from 'lucide-react'
import MagneticButton from '../ui/MagneticButton'

interface FormData {
  contactName: string
  clubName: string
  league: string
  state: string
  email: string
  phone: string
  premiership: string
  groupSize: string
  accommodation: string
  message: string
}

const stateOptions = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA']

interface FieldDef {
  name: keyof FormData
  label: string
  type: string
  placeholder?: string
  options?: string[]
}

const fieldGroups: FieldDef[][] = [
  [
    { name: 'contactName' as const, label: 'Contact Name', type: 'text', placeholder: 'Your full name' },
    { name: 'clubName' as const, label: 'Club Name', type: 'text', placeholder: 'Your netball club' },
  ],
  [
    { name: 'league' as const, label: 'League / Association', type: 'text', placeholder: 'Your local competition' },
    { name: 'state' as const, label: 'State', type: 'select', options: stateOptions },
  ],
  [
    { name: 'email' as const, label: 'Email', type: 'email', placeholder: 'your@email.com.au' },
    { name: 'phone' as const, label: 'Phone', type: 'tel', placeholder: '04xx xxx xxx' },
  ],
]

const selectFields = [
  {
    name: 'premiership' as const,
    label: 'A Grade Premiership Status',
    options: [
      'Yes — we won our premiership',
      'Strong runner-up this season',
      'In contention — season not finished',
      'Not sure — would like more information',
    ],
  },
  {
    name: 'groupSize' as const,
    label: 'Approximate Travelling Group Size',
    options: ['Under 15', '15–30', '30–50', '50–80', '80+'],
  },
  {
    name: 'accommodation' as const,
    label: 'Accommodation Interest',
    options: ["Yes — send info", "We'll arrange our own", 'Not sure yet'],
  },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const fieldVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
}

export default function Invitation() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>()

  const onSubmit = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 1400))
    setLoading(false)
    setSubmitted(true)
  }

  return (
    <section id="register" className="bg-surface overflow-hidden">
      <div className="section-pad">
        <div className="grid lg:grid-cols-[2fr,3fr] gap-12 lg:gap-20 items-start">

          {/* Left — editorial copy */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="lg:sticky lg:top-28"
          >
            <div className="section-divider mb-6" />
            <div className="text-xs font-bold tracking-[0.18em] uppercase text-pink-DEFAULT mb-4">Get Started</div>
            <h2 className="font-display text-display-md text-navy-DEFAULT leading-none mb-6">
              REQUEST<br />CLUB<br />INVITATION
            </h2>
            <p className="text-navy-DEFAULT/60 text-base leading-relaxed mb-8 max-w-xs">
              Tell us about your club. We'll be in touch with invitation details and next steps.
            </p>

            {/* Event details card */}
            <div className="bg-white rounded-2xl border border-navy-DEFAULT/8 p-6 shadow-glass space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-pink-DEFAULT/10 flex items-center justify-center shrink-0">
                  <Calendar size={14} className="text-pink-DEFAULT" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-navy-DEFAULT/40">Dates</p>
                  <p className="text-sm font-bold text-navy-DEFAULT">5–8 November 2026</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-pink-DEFAULT/10 flex items-center justify-center shrink-0">
                  <MapPin size={14} className="text-pink-DEFAULT" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-navy-DEFAULT/40">Location</p>
                  <p className="text-sm font-bold text-navy-DEFAULT">Gold Coast, Queensland</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-pink-DEFAULT/10 flex items-center justify-center shrink-0">
                  <Lock size={14} className="text-pink-DEFAULT" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-navy-DEFAULT/40">Eligibility</p>
                  <p className="text-sm font-bold text-navy-DEFAULT">A Grade Premiership Clubs</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right — form card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="glass-white rounded-3xl p-8 md:p-10 shadow-glass card-3"
          >
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                  className="flex flex-col items-center text-center py-12"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
                    className="w-20 h-20 rounded-full bg-pink-DEFAULT/10 flex items-center justify-center mb-6"
                  >
                    <CheckCircle size={40} className="text-pink-DEFAULT" />
                  </motion.div>
                  <h3 className="font-display text-3xl text-navy-DEFAULT mb-3">Request Received</h3>
                  <p className="text-navy-DEFAULT/60 text-base leading-relaxed max-w-xs">
                    Thank you for your interest. We'll be in touch with invitation details for your club.
                  </p>
                </motion.div>
              ) : (
                <motion.div key="form">
                  <div className="mb-8">
                    <h3 className="font-display text-2xl text-navy-DEFAULT mb-1">Club Interest Form</h3>
                    <p className="text-navy-DEFAULT/40 text-sm">All fields required unless marked optional.</p>
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)}>
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true }}
                      className="space-y-5"
                    >
                      {/* Paired text fields */}
                      {fieldGroups.map((group, gi) => (
                        <motion.div key={gi} variants={fieldVariants} className="grid sm:grid-cols-2 gap-4">
                          {group.map(field => (
                            <div key={field.name}>
                              <label className="block text-xs font-bold text-navy-DEFAULT/70 mb-1.5 tracking-wide uppercase">
                                {field.label}
                              </label>
                              {field.type === 'select' ? (
                                <select
                                  {...register(field.name, { required: true })}
                                  className={`input-premium ${errors[field.name] ? 'error' : ''}`}
                                >
                                  <option value="">Select state</option>
                                  {field.options?.map(o => (
                                    <option key={o} value={o}>{o}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type={field.type}
                                  placeholder={field.placeholder}
                                  {...register(field.name, { required: true })}
                                  className={`input-premium ${errors[field.name] ? 'error' : ''}`}
                                />
                              )}
                            </div>
                          ))}
                        </motion.div>
                      ))}

                      {/* Select fields */}
                      {selectFields.map(field => (
                        <motion.div key={field.name} variants={fieldVariants}>
                          <label className="block text-xs font-bold text-navy-DEFAULT/70 mb-1.5 tracking-wide uppercase">
                            {field.label}
                          </label>
                          <select
                            {...register(field.name, { required: true })}
                            className={`input-premium ${errors[field.name] ? 'error' : ''}`}
                          >
                            <option value="">Select...</option>
                            {field.options.map(o => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        </motion.div>
                      ))}

                      {/* Message */}
                      <motion.div variants={fieldVariants}>
                        <label className="block text-xs font-bold text-navy-DEFAULT/70 mb-1.5 tracking-wide uppercase">
                          Message <span className="font-normal normal-case text-navy-DEFAULT/30">(optional)</span>
                        </label>
                        <textarea
                          {...register('message')}
                          rows={3}
                          placeholder="Anything else you'd like us to know..."
                          className="input-premium resize-none"
                        />
                      </motion.div>

                      {/* Submit */}
                      <motion.div variants={fieldVariants} className="pt-2">
                        <MagneticButton
                          type="submit"
                          disabled={loading}
                          className="w-full bg-pink-grad text-white font-bold text-sm py-4 rounded-2xl shadow-pink hover:shadow-pink-lg transition-shadow duration-300"
                        >
                          {loading ? (
                            <span className="flex items-center gap-2">
                              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Sending...
                            </span>
                          ) : (
                            'Request Club Invitation'
                          )}
                        </MagneticButton>
                      </motion.div>
                    </motion.div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
