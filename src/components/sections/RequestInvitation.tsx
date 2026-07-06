import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { CheckCircle2, Lock, Mail, Users } from 'lucide-react'
import SectionLabel from '../ui/SectionLabel'
import Button from '../ui/Button'
import { useState } from 'react'

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

const states = ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT']
const premiershipOptions = [
  "Yes — we won our A Grade premiership",
  "We are a strong runner-up this season",
  "We are in contention — season not yet finished",
  "Not sure — we'd like to find out more",
]
const groupSizes = ['Under 15', '15–30', '30–50', '50–80', '80+']
const accommodationOptions = [
  "Yes — we'd like accommodation information",
  "We'll arrange our own accommodation",
  "Not sure yet",
]

export default function RequestInvitation() {
  const [submitted, setSubmitted] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>()

  const onSubmit = async (_data: FormData) => {
    await new Promise(r => setTimeout(r, 1200))
    setSubmitted(true)
  }

  return (
    <section id="register" className="bg-gray-50">
      <div className="section-container">
        <div className="grid lg:grid-cols-5 gap-12 items-start">
          {/* Left copy */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.65 }}
            className="lg:col-span-2"
          >
            <SectionLabel>Apply Now</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-extrabold text-navy-700 tracking-tight leading-tight mb-4">
              Request Club Invitation
            </h2>
            <p className="text-base text-navy-400 leading-relaxed mb-8">
              Tell us about your club and we'll be in touch with invitation details, competition format and accommodation options. Places are limited and invitation-only.
            </p>

            <div className="space-y-4 mb-8">
              {[
                { icon: Lock, text: 'Invitation-only — A Grade premiership clubs first' },
                { icon: Mail, text: "We'll be in touch with full event information" },
                { icon: Users, text: 'Accommodation enquiries handled separately' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-pink-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon size={15} className="text-pink-500" />
                  </div>
                  <p className="text-sm text-navy-500 font-medium">{text}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-navy-100 p-5">
              <p className="text-xs font-bold text-navy-400 uppercase tracking-widest mb-3">Event Details</p>
              <div className="space-y-2">
                {[
                  ['Name', 'Community Football Championships Australia'],
                  ['Short Name', 'PlayFooty'],
                  ['Date', 'October 2027'],
                  ['Location', 'Gold Coast, Queensland'],
                  ['Competition', 'A Grade — Invitation Only'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3 text-sm">
                    <span className="text-navy-400 flex-shrink-0">{label}</span>
                    <span className="font-semibold text-navy-700 text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right form */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.65 }}
            className="lg:col-span-3"
          >
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl border border-navy-100 p-10 text-center"
              >
                <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 size={32} className="text-pink-500" />
                </div>
                <h3 className="text-2xl font-extrabold text-navy-700 mb-3">Request Received</h3>
                <p className="text-navy-400 leading-relaxed max-w-sm mx-auto">
                  Thank you for your interest in PlayFooty 2027. We'll be in touch with invitation details, competition format and accommodation information.
                </p>
              </motion.div>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="bg-white rounded-2xl border border-navy-100 p-8 space-y-5 shadow-sm"
              >
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-navy-600 mb-1.5 uppercase tracking-wide">Contact Name *</label>
                    <input
                      {...register('contactName', { required: true })}
                      placeholder="Your full name"
                      className={`w-full border rounded-xl px-4 py-3 text-sm text-navy-700 outline-none transition-all focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 placeholder-navy-300 ${errors.contactName ? 'border-red-400' : 'border-navy-200'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-600 mb-1.5 uppercase tracking-wide">Club Name *</label>
                    <input
                      {...register('clubName', { required: true })}
                      placeholder="e.g. Mudgee Football Club"
                      className={`w-full border rounded-xl px-4 py-3 text-sm text-navy-700 outline-none transition-all focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 placeholder-navy-300 ${errors.clubName ? 'border-red-400' : 'border-navy-200'}`}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-navy-600 mb-1.5 uppercase tracking-wide">League / Association *</label>
                    <input
                      {...register('league', { required: true })}
                      placeholder="e.g. Central Western Football"
                      className={`w-full border rounded-xl px-4 py-3 text-sm text-navy-700 outline-none transition-all focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 placeholder-navy-300 ${errors.league ? 'border-red-400' : 'border-navy-200'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-600 mb-1.5 uppercase tracking-wide">State *</label>
                    <select
                      {...register('state', { required: true })}
                      className={`w-full border rounded-xl px-4 py-3 text-sm text-navy-700 outline-none transition-all focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 bg-white ${errors.state ? 'border-red-400' : 'border-navy-200'}`}
                    >
                      <option value="">Select state...</option>
                      {states.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-navy-600 mb-1.5 uppercase tracking-wide">Email Address *</label>
                    <input
                      {...register('email', { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ })}
                      type="email"
                      placeholder="you@club.com.au"
                      className={`w-full border rounded-xl px-4 py-3 text-sm text-navy-700 outline-none transition-all focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 placeholder-navy-300 ${errors.email ? 'border-red-400' : 'border-navy-200'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-600 mb-1.5 uppercase tracking-wide">Phone Number *</label>
                    <input
                      {...register('phone', { required: true })}
                      type="tel"
                      placeholder="0400 000 000"
                      className={`w-full border rounded-xl px-4 py-3 text-sm text-navy-700 outline-none transition-all focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 placeholder-navy-300 ${errors.phone ? 'border-red-400' : 'border-navy-200'}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-600 mb-1.5 uppercase tracking-wide">A Grade Premiership Status *</label>
                  <select
                    {...register('premiership', { required: true })}
                    className={`w-full border rounded-xl px-4 py-3 text-sm text-navy-700 outline-none transition-all focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 bg-white ${errors.premiership ? 'border-red-400' : 'border-navy-200'}`}
                  >
                    <option value="">Did your club win or are you a contender?</option>
                    {premiershipOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-navy-600 mb-1.5 uppercase tracking-wide">Approx. Travelling Group Size</label>
                    <select
                      {...register('groupSize')}
                      className="w-full border border-navy-200 rounded-xl px-4 py-3 text-sm text-navy-700 outline-none transition-all focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 bg-white"
                    >
                      <option value="">Estimate if known...</option>
                      {groupSizes.map(s => <option key={s} value={s}>{s} people</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-600 mb-1.5 uppercase tracking-wide">Accommodation Interest</label>
                    <select
                      {...register('accommodation')}
                      className="w-full border border-navy-200 rounded-xl px-4 py-3 text-sm text-navy-700 outline-none transition-all focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 bg-white"
                    >
                      <option value="">Select an option...</option>
                      {accommodationOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-600 mb-1.5 uppercase tracking-wide">Anything else you'd like to tell us?</label>
                  <textarea
                    {...register('message')}
                    rows={3}
                    placeholder="Tell us about your club, your season, or any questions you have..."
                    className="w-full border border-navy-200 rounded-xl px-4 py-3 text-sm text-navy-700 outline-none transition-all focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 placeholder-navy-300 resize-none"
                  />
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Request Club Invitation'}
                </Button>

                <p className="text-center text-xs text-navy-400">
                  Your details are used solely to assess invitation eligibility and respond to your enquiry.
                </p>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
