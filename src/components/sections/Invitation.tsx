import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { CheckCircle, MapPin, Calendar, Lock, ChevronRight } from 'lucide-react'

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
  show: { transition: { staggerChildren: 0.06 } },
}

const fieldVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
}

const inputCls = "w-full rounded-xl px-4 py-3.5 text-sm transition-all duration-200 outline-none"
const inputStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#ffffff',
}
const inputFocusStyle = {
  borderColor: '#ff2c91',
  boxShadow: '0 0 0 3px rgba(255,44,145,0.12)',
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      {...props}
      className={inputCls}
      style={{ ...inputStyle, ...(focused ? inputFocusStyle : {}) }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <select
      {...props}
      className={`${inputCls} cursor-pointer`}
      style={{ ...inputStyle, ...(focused ? inputFocusStyle : {}), appearance: 'none' }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

const labelCls = "block text-[11px] font-bold tracking-[0.14em] uppercase mb-2 text-white/45"

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
    <section id="register" className="relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #040e22 0%, #081a3d 60%, #040e22 100%)' }}>

      {/* Pink atmospheric glow */}
      <div className="absolute top-0 left-0 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,44,145,0.1) 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,44,145,0.06) 0%, transparent 70%)' }} />

      <div className="relative z-10 max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12 py-24 lg:py-32">
        <div className="grid lg:grid-cols-[5fr,7fr] gap-12 lg:gap-20 items-start">

          {/* Left — editorial copy */}
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="lg:sticky lg:top-28"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="h-[3px] w-10 bg-[#ff2c91]" />
              <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-[#ff2c91]">Invitation</span>
            </div>

            <h2 className="font-display leading-none text-white mb-6"
              style={{ fontSize: 'clamp(3.2rem, 7vw, 7rem)' }}>
              REQUEST<br />
              <span style={{ color: '#ff2c91' }}>CLUB</span><br />
              INVITE
            </h2>

            <p className="text-white/50 text-base leading-relaxed mb-10 max-w-sm">
              Fill in your details and our team will be in touch with everything you need to
              know about bringing your club to the Gold Coast.
            </p>

            {/* Event detail strip */}
            <div className="space-y-3">
              {[
                { icon: Calendar, label: 'Dates', value: '5–8 November 2026' },
                { icon: MapPin, label: 'Location', value: 'Gold Coast, Queensland' },
                { icon: Lock, label: 'Eligibility', value: 'A Grade Premiership Clubs' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-4 rounded-xl px-5 py-3.5"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(255,44,145,0.15)' }}>
                    <Icon size={14} style={{ color: '#ff2c91' }} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-white/30 mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-white">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right — form panel */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          >
            <div className="rounded-3xl p-8 lg:p-10"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(20px)' }}>

              {/* Top accent */}
              <div className="h-[2px] w-12 bg-[#ff2c91] mb-8 rounded-full" />

              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center text-center py-16"
                  >
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                      style={{ background: 'rgba(255,44,145,0.15)', border: '1px solid rgba(255,44,145,0.3)' }}>
                      <CheckCircle size={36} style={{ color: '#ff2c91' }} />
                    </div>
                    <h3 className="font-display text-white leading-none mb-3" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
                      REQUEST RECEIVED
                    </h3>
                    <p className="text-white/50 text-base max-w-sm leading-relaxed">
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
                    <motion.div variants={fieldVariants} className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Contact Name *</label>
                        <Input {...register('contactName', { required: true })} type="text" placeholder="Your full name" />
                      </div>
                      <div>
                        <label className={labelCls}>Club Name *</label>
                        <Input {...register('clubName', { required: true })} type="text" placeholder="Your netball club" />
                      </div>
                    </motion.div>

                    <motion.div variants={fieldVariants} className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>League / Association *</label>
                        <Input {...register('league', { required: true })} type="text" placeholder="Your local competition" />
                      </div>
                      <div>
                        <label className={labelCls}>State *</label>
                        <Select {...register('state', { required: true })}>
                          <option value="" style={{ background: '#081a3d' }}>Select state</option>
                          {stateOptions.map(s => <option key={s} value={s} style={{ background: '#081a3d' }}>{s}</option>)}
                        </Select>
                      </div>
                    </motion.div>

                    <motion.div variants={fieldVariants} className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Email *</label>
                        <Input {...register('email', { required: true })} type="email" placeholder="your@email.com.au" />
                      </div>
                      <div>
                        <label className={labelCls}>Phone</label>
                        <Input {...register('phone')} type="tel" placeholder="04xx xxx xxx" />
                      </div>
                    </motion.div>

                    <motion.div variants={fieldVariants}>
                      <label className={labelCls}>Are you a current A Grade premier or in finals contention? *</label>
                      <Select {...register('premiership', { required: true })}>
                        <option value="" style={{ background: '#081a3d' }}>Select an option</option>
                        <option value="yes" style={{ background: '#081a3d' }}>Yes — we won our premiership</option>
                        <option value="runner-up" style={{ background: '#081a3d' }}>Strong runner-up this season</option>
                        <option value="contention" style={{ background: '#081a3d' }}>In contention — season not finished</option>
                        <option value="info" style={{ background: '#081a3d' }}>Not sure — would like more information</option>
                      </Select>
                    </motion.div>

                    <motion.div variants={fieldVariants} className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Approx group size</label>
                        <Select {...register('groupSize')}>
                          <option value="" style={{ background: '#081a3d' }}>Select range</option>
                          {['Under 15', '15–30', '30–50', '50–80', '80+'].map(o => (
                            <option key={o} style={{ background: '#081a3d' }}>{o}</option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <label className={labelCls}>Accommodation interest</label>
                        <Select {...register('accommodation')}>
                          <option value="" style={{ background: '#081a3d' }}>Select option</option>
                          {["Yes — send me info", "We'll arrange our own", "Not sure yet"].map(o => (
                            <option key={o} style={{ background: '#081a3d' }}>{o}</option>
                          ))}
                        </Select>
                      </div>
                    </motion.div>

                    <motion.div variants={fieldVariants}>
                      <label className={labelCls}>Message (optional)</label>
                      <textarea
                        {...register('message')}
                        rows={3}
                        placeholder="Any questions or additional details..."
                        className={`${inputCls} resize-none`}
                        style={inputStyle}
                      />
                    </motion.div>

                    <motion.div variants={fieldVariants} className="pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full font-bold text-sm py-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 group"
                        style={{ background: '#ff2c91', color: '#ffffff', boxShadow: '0 8px 40px rgba(255,44,145,0.35)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#cc1f6e')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#ff2c91')}
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            Request Club Invitation
                            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform duration-200" />
                          </>
                        )}
                      </button>
                      <p className="text-center text-xs text-white/25 mt-3">
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
