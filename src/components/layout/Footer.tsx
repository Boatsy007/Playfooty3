import { motion } from 'framer-motion'
import { Globe, Mail, Phone, Camera, Users, Play } from 'lucide-react'

const footerLinks = {
  'Event': ['About ACNC', 'Schedule', 'Grades', 'Venue', 'Livestream'],
  'Travel': ['Club Packages', 'Team Packages', 'Supporter Packages', 'Accommodation', 'Payment Plans'],
  'Club': ['Request Invitation', '$10K Grant', 'Club Resources', 'Photography', 'Awards Night'],
  'Info': ['Contact Us', 'Privacy Policy', 'Terms & Conditions', 'Media Enquiries', 'Sponsorship'],
}

export default function Footer() {
  return (
    <footer className="bg-navy-800 text-white">
      <div className="max-w-container mx-auto px-6 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 mb-12">
          {/* Brand col — 2 wide */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-2"
          >
            {/* Logo */}
            <div className="flex items-center gap-2.5 mb-5">
              <div className="relative w-9 h-9 flex-shrink-0">
                <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <circle cx="20" cy="20" r="19" stroke="#E8157A" strokeWidth="2" />
                  <circle cx="20" cy="20" r="12" stroke="#E8157A" strokeWidth="1.5" />
                  <path d="M8 14 Q20 8 32 14" stroke="#E8157A" strokeWidth="1.5" fill="none" />
                  <path d="M8 26 Q20 32 32 26" stroke="#E8157A" strokeWidth="1.5" fill="none" />
                  <line x1="20" y1="1" x2="20" y2="39" stroke="#E8157A" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="leading-none">
                <div className="font-extrabold text-xl tracking-tight">
                  <span className="text-white">AC</span>
                  <span className="text-pink-500">NC</span>
                </div>
                <div className="text-[9px] font-bold tracking-[0.12em] uppercase text-white/40">
                  Australian Club Netball
                </div>
              </div>
            </div>

            <p className="text-white/55 text-sm leading-relaxed mb-6 max-w-xs">
              Australia's ultimate country netball experience. Bringing clubs together for competition, celebration and community.
            </p>

            <div className="space-y-2.5 mb-6">
              {[
                { icon: Globe, text: 'clubnetball.com.au' },
                { icon: Mail, text: 'hello@clubnetball.com.au' },
                { icon: Phone, text: '1300 NET BALL' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5 text-sm text-white/55 hover:text-white transition-colors">
                  <Icon size={13} className="text-pink-500 flex-shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              {([Camera, Users, Play] as const).map((Icon, i) => (
                <div
                  key={i}
                  className="w-9 h-9 bg-white/8 rounded-xl flex items-center justify-center hover:bg-pink-500 transition-colors cursor-pointer"
                >
                  <Icon size={15} className="text-white" />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Link cols */}
          {Object.entries(footerLinks).map(([heading, links], i) => (
            <motion.div
              key={heading}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <h4 className="text-xs font-bold tracking-widest uppercase text-white/50 mb-4">{heading}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-white/55 hover:text-white transition-colors duration-150">{link}</a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/35">
            <span>© 2026 Australian Club Netball Championships</span>
            <span className="hidden sm:inline">·</span>
            <span>All rights reserved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-pink-500 rounded-full" />
            <span className="text-xs text-white/35 font-medium">Gold Coast, Queensland · 5–8 November 2026</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
