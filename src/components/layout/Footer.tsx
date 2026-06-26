import { motion } from 'framer-motion'
import { Globe, Mail, Camera, Users, Play } from 'lucide-react'

const footerLinks = {
  Championship: ['About CNCA', 'How It Works', 'Schedule', 'A Grade Format', 'Livestream'],
  Accommodation: ['Team Accommodation', 'Club Group Bookings', 'Supporter Options', 'Family Options', 'Payment Options'],
  Club: ['Request Invitation', 'Major Prize', 'Photography', 'Awards Presentation', 'Bring The Club'],
  Info: ['Contact Us', 'Privacy Policy', 'Terms & Conditions', 'Media Enquiries', 'Sponsorship'],
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const colVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
}

export default function Footer() {
  return (
    <footer className="bg-navy-DEFAULT overflow-hidden">
      {/* Pink top line */}
      <div className="h-[3px] bg-pink-grad" />

      <div className="container-main pt-16 pb-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 mb-14"
        >
          {/* Brand column — 2 wide */}
          <motion.div variants={colVariants} className="lg:col-span-2">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 shrink-0">
                <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <circle cx="20" cy="20" r="19" stroke="#ff2c91" strokeWidth="2" />
                  <circle cx="20" cy="20" r="12" stroke="#ff2c91" strokeWidth="1.5" />
                  <path d="M8 14 Q20 8 32 14" stroke="#ff2c91" strokeWidth="1.5" fill="none" />
                  <path d="M8 26 Q20 32 32 26" stroke="#ff2c91" strokeWidth="1.5" fill="none" />
                  <line x1="20" y1="1" x2="20" y2="39" stroke="#ff2c91" strokeWidth="1.5" />
                  <path d="M6 10 Q14 16 6 26" stroke="#ff2c91" strokeWidth="1.2" fill="none" />
                  <path d="M34 10 Q26 16 34 26" stroke="#ff2c91" strokeWidth="1.2" fill="none" />
                </svg>
              </div>
              <div className="leading-none">
                <div className="font-display text-3xl tracking-widest leading-none">
                  <span className="text-white">CN</span>
                  <span className="text-pink-DEFAULT">CA</span>
                </div>
                <div className="text-[9px] font-bold tracking-[0.12em] uppercase text-white/40 mt-0.5">
                  Country Netball Championships
                </div>
              </div>
            </div>

            <div className="mb-1">
              <p className="font-display text-[clamp(1.2rem,3vw,1.8rem)] text-white leading-snug">
                Country Netball<br />Championships Australia
              </p>
            </div>
            <p className="text-white/40 text-sm mb-6 font-medium">
              Gold Coast, Queensland · 5–8 November 2026
            </p>

            {/* Contact */}
            <div className="space-y-3 mb-7">
              {[
                { icon: Globe, text: 'clubnetball.com.au' },
                { icon: Mail, text: 'hello@clubnetball.com.au' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5 text-sm text-white/50 hover:text-white transition-colors cursor-default">
                  <Icon size={13} className="text-pink-DEFAULT shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>

            {/* Social */}
            <div className="flex gap-2">
              {[Camera, Users, Play].map((Icon, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center hover:bg-pink-DEFAULT hover:border-pink-DEFAULT transition-all duration-300 cursor-pointer"
                >
                  <Icon size={15} className="text-white" />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([heading, items]) => (
            <motion.div key={heading} variants={colVariants}>
              <h4 className="text-[10px] font-bold tracking-[0.16em] uppercase text-white/30 mb-5">{heading}</h4>
              <ul className="space-y-3">
                {items.map(item => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-white/50 hover:text-white transition-colors duration-200 font-medium"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30 font-medium">
            © 2026 Country Netball Championships Australia · All rights reserved
          </p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-pink-DEFAULT" />
            <span className="text-xs text-white/30 font-medium">Gold Coast QLD · 5–8 November 2026</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
