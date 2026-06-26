import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { CheckCircle, MapPin, Calendar, Lock } from 'lucide-react'

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

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const fieldVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
}

const inputCls = "w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy placeholder-gray-400 focus:outline-none focus:border-pink focus:ring-2 focus:ring-pink/15 transition-all duration-200"
const labelCls = "block text-xs font-bold tracking-wide text-navy/70 mb-1.5"

export default function Invitation() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit } = useForm<FormData>()

  const onSubmit = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    setLoading(false)
    setSubmitted(true)
  }

  return (
    <section id="register" className="bg-surface py-20 lg:py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[2fr,3fr] gap-12 lg:gap-20 items-start">

          {/* Left — copy */}
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="lg:sticky lg:top-28"
          >
            <div className="inline-flex items-center gap-2 mb-5">
              <div className="h-px w-8 bg-pink" />
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-pink">Invitation</span>
            </div>
            <h2 className="font-display leading-none text-navy mb-4" style={{ fontSize: 'clamp(2.8rem, 6vw, 4.5rem)' }}>
              REQUEST<br />
              <span className="text-pink">CLUB</span><br />
              INVITATION
            </h2>
            <p className="text-navy/60 text-base leading-relaxed mb-8">
              Fill in your details and our team will be in touch with everything you need to
              know about bringing your club to the Gold Coast.
            </p>

            {/* Event detail card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <div className="flex items-start gap-3">
                <Calendar size={16} className="text-pink shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-navy/50 tracking-wide uppercase mb-0.5">Dates</p>
                  <p className="text-sm font-semibold text-navy">5–8 November 2026</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-pink shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-navy/50 tracking-wide uppercase mb-0.5">Location</p>
                  <p className="text-sm font-semibold text-navy">Gold Coast, Queensland</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Lock size={16} className="text-pink shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-navy/50 tracking-wide uppercase mb-0.5">Eligibility</p>
                  <p className="text-sm font-semibold text-navy">A Grade Premiership Clubs</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right — form */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          >
            <div className="bg-white rounded-3xl border border-gray-100 shadow-glass p-8 lg:p-10">
              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center text-center py-12"
                  >
                    <div className="w-20 h-20 rounded-full bg-pink-muted flex items-center justify-center mb-6">
                      <CheckCircle size={36} className="text-pink" />
                    </div>
                    <h3 className="font-display text-3xl text-navy mb-3">Request Received</h3>
                    <p className="text-navy/60 text-base max-w-sm leading-relaxed">
                      Thanks for your interest. Our team will be in touch shortly with invitation details.
                    </p>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-5"
                  >
                    {/* Row 1 */}
                    <motion.div variants={fieldVariants} className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Contact Name *</label>
                        <input {...register('contactName', { required: true })} type="text" placeholder="Your full name" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Club Name *</label>
                        <input {...register('clubName', { required: true })} type="text" placeholder="Your netball club" className={inputCls} />
                      </div>
                    </motion.div>

                    {/* Row 2 */}
                    <motion.div variants={fieldVariants} className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>League / Association *</label>
                        <input {...register('league', { required: true })} type="text" placeholder="Your local competition" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>State *</label>
                        <select {...register('state', { required: true })} className={inputCls}>
                          <option value="">Select state</option>
                          {stateOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </motion.div>

                    {/* Row 3 */}
                    <motion.div variants={fieldVariants} className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Email *</label>
                        <input {...register('email', { required: true })} type="email" placeholder="your@email.com.au" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Phone</label>
                        <input {...register('phone')} type="tel" placeholder="04xx xxx xxx" className={inputCls} />
                      </div>
                    </motion.div>

                    {/* Premiership status */}
                    <motion.div variants={fieldVariants}>
                      <label className={labelCls}>Are you a current A Grade premier or in finals contention? *</label>
                      <select {...register('premiership', { required: true })} className={inputCls}>
                        <option value="">Select an option</option>
                        <option value="yes">Yes — we won our premiership</option>
                        <option value="runner-up">Strong runner-up this season</option>
                        <option value="contention">In contention — season not finished</option>
                        <option value="info">Not sure — would like more information</option>
                      </select>
                    </motion.div>

                    {/* Group size */}
                    <motion.div variants={fieldVariants} className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Approx travelling group size</label>
                        <select {...register('groupSize')} className={inputCls}>
                          <option value="">Select range</option>
                          <option>Under 15</option>
                          <option>15–30</option>
                          <option>30–50</option>
                          <option>50–80</option>
                          <option>80+</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Accommodation interest</label>
                        <select {...register('accommodation')} className={inputCls}>
                          <option value="">Select option</option>
                          <option>Yes — send me info</option>
                          <option>We'll arrange our own</option>
                          <option>Not sure yet</option>
                        </select>
                      </div>
                    </motion.div>

                    {/* Message */}
                    <motion.div variants={fieldVariants}>
                      <label className={labelCls}>Message (optional)</label>
                      <textarea
                        {...register('message')}
                        rows={3}
                        placeholder="Any questions or additional details..."
                        className={`${inputCls} resize-none`}
                      />
                    </motion.div>

                    {/* Submit */}
                    <motion.div variants={fieldVariants} className="pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-pink hover:bg-pink-dark disabled:opacity-60 text-white font-bold text-sm py-4 rounded-xl transition-all duration-200 shadow-pink hover:shadow-pink-lg flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Sending...
                          </>
                        ) : (
                          'Request Club Invitation'
                        )}
                      </button>
                      <p className="text-center text-xs text-navy/40 mt-3">
                        We'll respond within 2 business days
                      </p>
                    </motion.div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
