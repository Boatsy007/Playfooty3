import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { CheckCircle } from 'lucide-react'

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
}

const stateOptions = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA']

const inputCls = "w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#1a1a1a] placeholder-gray-400 focus:outline-none focus:border-[#ff2c91] focus:ring-2 focus:ring-[#ff2c91]/10 transition-all duration-200"
const labelCls = "block text-xs font-bold tracking-wide text-[#1a1a1a]/60 mb-1.5 uppercase"

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function Invitation() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit } = useForm<FormData>()

  const onSubmit = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 1000))
    setLoading(false)
    setSubmitted(true)
  }

  return (
    <section id="invitation" className="relative overflow-hidden" style={{ background: '#0d0d0d' }}>
      {/* Subtle photo tint at top */}
      <div className="relative h-16 lg:h-24 overflow-hidden">
        <img src="/hero-photo.webp" alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '65% 80%' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(13,13,13,0.3) 0%, rgba(13,13,13,1) 100%)' }} />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 pb-20 lg:pb-28">
        <div className="grid lg:grid-cols-[5fr,7fr] gap-10 lg:gap-16 items-start">

          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease }}
            className="lg:sticky lg:top-24 pt-2"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full" style={{ background: 'rgba(255,44,145,0.12)', border: '1px solid rgba(255,44,145,0.3)' }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#ff2c91' }} />
              <span className="font-condensed font-bold text-[10px] tracking-[0.22em] uppercase" style={{ color: '#ff2c91' }}>
                Invitation Only
              </span>
            </div>

            <h2 className="font-display text-white leading-none mb-5" style={{ fontSize: 'clamp(2.8rem, 6vw, 5rem)' }}>
              REQUEST AN<br /><span style={{ color: '#ff2c91' }}>INVITATION</span>
            </h2>
            <p className="leading-relaxed mb-8" style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.45)' }}>
              Places are limited. Invitation requests are now open for eligible A Grade premiership clubs across Australia.
            </p>

            {/* Prestige divider */}
            <div className="flex items-center gap-3 mb-8">
              <div className="h-[1px] flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <span className="font-condensed font-bold text-[9px] tracking-[0.25em] uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Event Details
              </span>
              <div className="h-[1px] flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
            </div>

            <div className="space-y-3">
              {[
                { label: 'Date', value: '5–8 November 2026' },
                { label: 'Location', value: 'Gold Coast, Queensland' },
                { label: 'Eligibility', value: 'A Grade Premiership Clubs' },
                { label: 'Website', value: 'cnca.com.au' },
                { label: 'Email', value: 'info@cnca.com.au' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="font-condensed font-bold text-xs tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {label}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right — form */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, delay: 0.1, ease }}
            className="bg-white rounded-3xl p-8 lg:p-10"
          >
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center text-center py-12"
                >
                  <div className="w-16 h-16 rounded-full bg-[#ff2c91]/10 flex items-center justify-center mb-5">
                    <CheckCircle size={32} style={{ color: '#ff2c91' }} />
                  </div>
                  <h3 className="font-display text-[#1a1a1a] text-3xl mb-3">Request Received</h3>
                  <p className="text-[#1a1a1a]/55 text-sm max-w-xs leading-relaxed">
                    Thanks for your interest. Our team will be in touch within 2 business days.
                  </p>
                </motion.div>
              ) : (
                <form key="form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="mb-6">
                    <h3 className="font-display text-[#1a1a1a] leading-none mb-1" style={{ fontSize: '1.6rem' }}>
                      Club Registration
                    </h3>
                    <p className="text-xs" style={{ color: 'rgba(17,17,17,0.4)' }}>Complete the form below to request your invitation.</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Contact Name *</label>
                      <input {...register('contactName', { required: true })} type="text" placeholder="Your full name" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Club Name *</label>
                      <input {...register('clubName', { required: true })} type="text" placeholder="Your netball club" className={inputCls} />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>League / Association *</label>
                      <input {...register('league', { required: true })} type="text" placeholder="Your local competition" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>State *</label>
                      <select {...register('state', { required: true })} className={inputCls}>
                        <option value="">Select state</option>
                        {stateOptions.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Email *</label>
                      <input {...register('email', { required: true })} type="email" placeholder="your@email.com.au" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Phone</label>
                      <input {...register('phone')} type="tel" placeholder="04xx xxx xxx" className={inputCls} />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Are you an A Grade premier or in finals contention? *</label>
                    <select {...register('premiership', { required: true })} className={inputCls}>
                      <option value="">Select an option</option>
                      <option value="yes">Yes, we won our premiership</option>
                      <option value="runner-up">Strong runner-up this season</option>
                      <option value="contention">In contention, season not yet finished</option>
                      <option value="info">Not sure, we would like more information</option>
                    </select>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Approx group size</label>
                      <select {...register('groupSize')} className={inputCls}>
                        <option value="">Select range</option>
                        {['Under 15', '15–30', '30–50', '50–80', '80+'].map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Accommodation interest</label>
                      <select {...register('accommodation')} className={inputCls}>
                        <option value="">Select option</option>
                        <option>Yes, send me info</option>
                        <option>We'll arrange our own</option>
                        <option>Not sure yet</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button type="submit" disabled={loading}
                      className="w-full btn-pink text-sm py-4 rounded-xl flex items-center justify-center gap-2">
                      {loading ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
                      ) : (
                        'Request Club Invitation'
                      )}
                    </button>
                    <p className="text-center text-xs text-[#1a1a1a]/35 mt-3">We'll respond within 2 business days</p>
                  </div>
                </form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
