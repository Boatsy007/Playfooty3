import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import MagneticButton from '../ui/MagneticButton'

const links = [
  { label: 'Experience', href: '#experience' },
  { label: 'Format', href: '#how-it-works' },
  { label: 'Accommodation', href: '#accommodation' },
  { label: 'Prize', href: '#prize' },
  { label: 'Invitation', href: '#register' },
]

const mobileMenuVariants = {
  hidden: { opacity: 0, clipPath: 'inset(0 0 100% 0)' },
  show: {
    opacity: 1,
    clipPath: 'inset(0 0 0% 0)',
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
  exit: {
    opacity: 0,
    clipPath: 'inset(0 0 100% 0)',
    transition: { duration: 0.25 },
  },
}

const linkVariants = {
  hidden: { opacity: 0, x: -30 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
}

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const scrollTo = (href: string) => {
    setMobileOpen(false)
    setTimeout(() => {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
    }, mobileOpen ? 300 : 0)
  }

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 ${
          scrolled
            ? 'nav-glass shadow-glass border-b border-navy-DEFAULT/8'
            : 'bg-transparent'
        }`}
      >
        <div className="container-main">
          <div className="flex items-center justify-between h-16 md:h-20">

            {/* Logo */}
            <motion.button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-3 shrink-0 group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Netball SVG icon */}
              <div className="relative w-9 h-9 shrink-0">
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

              {/* Wordmark */}
              <div className="leading-none">
                <div className="font-display text-2xl tracking-widest leading-none">
                  <span className={`transition-colors duration-300 ${scrolled ? 'text-navy-DEFAULT' : 'text-white'}`}>CN</span>
                  <span className="text-pink-DEFAULT">CA</span>
                </div>
                <div className={`text-[8px] font-bold tracking-[0.12em] uppercase mt-0.5 transition-colors duration-300 ${
                  scrolled ? 'text-navy-DEFAULT/40' : 'text-white/50'
                }`}>
                  Country Netball Championships
                </div>
              </div>
            </motion.button>

            {/* Desktop links */}
            <div className="hidden lg:flex items-center gap-1">
              {links.map(link => (
                <button
                  key={link.label}
                  onClick={() => scrollTo(link.href)}
                  className={`relative px-4 py-2 text-sm font-semibold transition-colors duration-200 group ${
                    scrolled ? 'text-navy-DEFAULT/70 hover:text-navy-DEFAULT' : 'text-white/80 hover:text-white'
                  }`}
                >
                  {link.label}
                  {/* Pink underline on hover */}
                  <span className="absolute bottom-0.5 left-4 right-4 h-[2px] bg-pink-DEFAULT scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
                </button>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden lg:block">
              <MagneticButton
                onClick={() => scrollTo('#register')}
                className="bg-pink-grad text-white font-bold text-xs px-6 py-3 rounded-full shadow-pink hover:shadow-pink-lg transition-shadow duration-300"
              >
                Request Invitation
              </MagneticButton>
            </div>

            {/* Mobile hamburger */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setMobileOpen(o => !o)}
              className={`lg:hidden p-2 rounded-xl transition-colors duration-300 ${
                scrolled ? 'text-navy-DEFAULT' : 'text-white'
              }`}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile full-screen menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            variants={mobileMenuVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed inset-0 z-40 bg-navy-DEFAULT flex flex-col lg:hidden"
          >
            {/* Close button */}
            <div className="flex items-center justify-between h-16 px-6">
              <div className="font-display text-2xl tracking-widest">
                <span className="text-white">CN</span>
                <span className="text-pink-DEFAULT">CA</span>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setMobileOpen(false)}
                className="text-white/60 hover:text-white p-2"
              >
                <X size={24} />
              </motion.button>
            </div>

            {/* Links */}
            <div className="flex-1 flex flex-col justify-center px-8 gap-2">
              {links.map((link, i) => (
                <motion.button
                  key={link.label}
                  custom={i}
                  variants={linkVariants}
                  initial="hidden"
                  animate="show"
                  onClick={() => scrollTo(link.href)}
                  className="text-left group flex items-center gap-4 py-4 border-b border-white/10"
                >
                  <span className="font-display text-[clamp(2.5rem,9vw,4rem)] text-white leading-none group-hover:text-pink-DEFAULT transition-colors duration-300">
                    {link.label}
                  </span>
                </motion.button>
              ))}
            </div>

            {/* Mobile CTA */}
            <div className="px-8 pb-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <button
                  onClick={() => scrollTo('#register')}
                  className="w-full bg-pink-DEFAULT text-white font-bold text-sm py-4 rounded-2xl"
                >
                  Request Club Invitation
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
