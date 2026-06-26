import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { CheckCircle, Mail } from 'lucide-react'

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
    <section id="invitation" className="py-14 lg:py-20" style={{ background: '#111111' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8">
        <div className="grid lg:grid-cols-[5fr,7fr] gap-10 lg:gap-16 items-start">

          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7 }}
            className="lg:sticky lg:top-24 pt-2"
          >
            <h2 className="font-display text-white leading-none mb-5" style={{ fontSize: 'clamp(2.6rem, 5.5vw, 4.5rem)' }}>
              CHAMPIONSHIP<br />INVITATION<br /><span style={{ color: '#ff2c91' }}>REQUEST</span>
            </h2>
            <p className="text-white/55 text-base leading-relaxed mb-8">
              Invitation requests are now open for eligible A Grade premiership clubs. Complete the form below to express interest in the 2026 Country Netball Championships Australia.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#ff2c91] mb-4">Event Details</p>
              <div className="space-y-2 text-sm text-white/70">
                <p><span className="font-bold text-white">Date:</span> 5–8 November 2026</p>
                <p><span className="font-bold text-white">Location:</span> Gold Coast, Queensland</p>
                <p><span className="font-bold text-white">Eligibility:</span> A Grade Premiership Clubs</p>
                <p><span className="font-bold text-white">Website:</span> cnca.com.au</p>
                <p><span className="font-bold text-white">Email:</span> info@cnca.com.au</p>
              </div>
            </div>
          </motion.div>

          {/* Right — form */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, delay: 0.1 }}
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
                  <div className="flex items-center gap-2 mb-6">
                    <Mail size={16} style={{ color: '#ff2c91' }} />
                    <h3 className="font-bold text-[#1a1a1a] text-base">Club Registration of Interest</h3>
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
