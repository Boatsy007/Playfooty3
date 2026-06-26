import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { CheckCircle2, Shield, Clock, Users } from 'lucide-react'
import SectionLabel from '../ui/SectionLabel'
import Button from '../ui/Button'
import { useState } from 'react'

interface FormData {
  name: string
  club: string
  email: string
  phone: string
  grade: string
  clubSize: string
  message: string
}

const grades = ['A Grade', 'B Grade', 'C Grade', 'D Grade', 'Multiple Grades', 'Not sure yet']
const clubSizes = ['Under 30', '30–60', '60–100', '100–150', '150+']

const trust = [
  { icon: Shield, text: 'Your details are never shared or sold' },
  { icon: Clock, text: 'Response within 48 business hours' },
  { icon: Users, text: 'No commitment required to express interest' },
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
          {/* Left copy — 2 cols */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.65 }}
            className="lg:col-span-2"
          >
            <SectionLabel>Apply Now</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-extrabold text-navy-700 tracking-tight leading-tight mb-4">
              Request Your Invitation
            </h2>
            <p className="text-base text-navy-400 leading-relaxed mb-8">
              Spaces are limited to ensure the highest quality experience for every club. Submit your expression of interest and our team will be in touch with everything you need to know.
            </p>

            <div className="space-y-4 mb-8">
              {trust.map(({ icon: Icon, text }) => (
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
                  ['Date', '5–8 November 2026'],
                  ['Location', 'Gold Coast, Queensland'],
                  ['Grades', 'A, B, C & D Grade'],
                  ['Format', 'National Championship'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-navy-400">{label}</span>
                    <span className="font-semibold text-navy-700">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right form — 3 cols */}
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
                <h3 className="text-2xl font-extrabold text-navy-700 mb-3">Request Received!</h3>
                <p className="text-navy-400 leading-relaxed max-w-sm mx-auto">
                  Thank you for your interest in ACNC 2026. Our team will be in touch within 48 hours with everything your club needs to know.
                </p>
              </motion.div>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="bg-white rounded-2xl border border-navy-100 p-8 space-y-5 shadow-sm"
              >
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-navy-600 mb-1.5 uppercase tracking-wide">Full Name *</label>
                    <input
                      {...register('name', { required: true })}
                      placeholder="e.g. Sarah Johnson"
                      className={`w-full border rounded-xl px-4 py-3 text-sm text-navy-700 outline-none transition-all focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 placeholder-navy-300 ${
                        errors.name ? 'border-red-400' : 'border-navy-200'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-600 mb-1.5 uppercase tracking-wide">Club Name *</label>
                    <input
                      {...register('club', { required: true })}
                      placeholder="e.g. Mudgee Netball Club"
                      className={`w-full border rounded-xl px-4 py-3 text-sm text-navy-700 outline-none transition-all focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 placeholder-navy-300 ${
                        errors.club ? 'border-red-400' : 'border-navy-200'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-navy-600 mb-1.5 uppercase tracking-wide">Email Address *</label>
                    <input
                      {...register('email', { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ })}
                      type="email"
                      placeholder="you@club.com.au"
                      className={`w-full border rounded-xl px-4 py-3 text-sm text-navy-700 outline-none transition-all focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 placeholder-navy-300 ${
                        errors.email ? 'border-red-400' : 'border-navy-200'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-600 mb-1.5 uppercase tracking-wide">Phone Number *</label>
                    <input
                      {...register('phone', { required: true })}
                      type="tel"
                      placeholder="0400 000 000"
                      className={`w-full border rounded-xl px-4 py-3 text-sm text-navy-700 outline-none transition-all focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 placeholder-navy-300 ${
                        errors.phone ? 'border-red-400' : 'border-navy-200'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-navy-600 mb-1.5 uppercase tracking-wide">Grade *</label>
                    <select
                      {...register('grade', { required: true })}
                      className={`w-full border rounded-xl px-4 py-3 text-sm text-navy-700 outline-none transition-all focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 bg-white ${
                        errors.grade ? 'border-red-400' : 'border-navy-200'
                      }`}
                    >
                      <option value="">Select grade...</option>
                      {grades.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-600 mb-1.5 uppercase tracking-wide">Approx. Club Size *</label>
                    <select
                      {...register('clubSize', { required: true })}
                      className={`w-full border rounded-xl px-4 py-3 text-sm text-navy-700 outline-none transition-all focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 bg-white ${
                        errors.clubSize ? 'border-red-400' : 'border-navy-200'
                      }`}
                    >
                      <option value="">Select size...</option>
                      {clubSizes.map(s => <option key={s} value={s}>{s} members</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-600 mb-1.5 uppercase tracking-wide">Anything else? (Optional)</label>
                  <textarea
                    {...register('message')}
                    rows={3}
                    placeholder="Tell us about your club, questions about travel packages, or anything else..."
                    className="w-full border border-navy-200 rounded-xl px-4 py-3 text-sm text-navy-700 outline-none transition-all focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 placeholder-navy-300 resize-none"
                  />
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>

                <p className="text-center text-xs text-navy-400">
                  By submitting you agree to our privacy policy. No spam, ever.
                </p>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
