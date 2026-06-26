import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import MagneticButton from '../ui/MagneticButton'

const links = [
  { label: 'Experience', href: '#experience' },
  { label: 'Format', href: '#how-it-works' },
  { label: 'Prize', href: '#prize' },
  { label: 'Invitation', href: '#register' },
]

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const scrollTo = (href: string) => {
    setMobileOpen(false)
    setTimeout(() => {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
    }, mobileOpen ? 280 : 0)
  }

  const dark = !scrolled

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'nav-white' : 'bg-transparent'
        }`}
      >
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between h-[76px]">

            {/* Logo */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-3 shrink-0 group"
            >
              <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 50 C20 29 34 13 52 10 C40 15 32 31 32 50 C32 69 40 85 52 90 C34 87 20 71 20 50Z" fill="#ff2c91"/>
                <circle cx="60" cy="50" r="26" stroke="#ff2c91" strokeWidth="2.5" fill="none"/>
                <circle cx="60" cy="50" r="17" stroke="#ff2c91" strokeWidth="1.6" fill="none"/>
                <path d="M36 43 Q60 37 84 43" stroke="#ff2c91" strokeWidth="1.5" fill="none"/>
                <path d="M36 57 Q60 63 84 57" stroke="#ff2c91" strokeWidth="1.5" fill="none"/>
                <line x1="60" y1="24" x2="60" y2="76" stroke="#ff2c91" strokeWidth="1.5"/>
                <path d="M57 7 L58.4 11 L62.5 11 L59.2 13.4 L60.6 17.4 L57 15 L53.4 17.4 L54.8 13.4 L51.5 11 L55.6 11Z" fill="#f4c14d"/>
              </svg>
              <div className="leading-none">
                <div className="font-display text-[27px] tracking-widest leading-none">
                  <span className={`transition-colors duration-500 ${dark ? 'text-white' : 'text-navy-DEFAULT'}`}
                    style={{ color: dark ? '#ffffff' : '#081a3d' }}>CN</span>
                  <span style={{ color: '#ff2c91' }}>CA</span>
                </div>
                <div className={`text-[7px] font-bold tracking-[0.13em] uppercase mt-0.5 transition-colors duration-500 ${
                  dark ? 'text-white/40' : 'text-[#081a3d]/40'
                }`}>
                  Country Netball Championships Australia
                </div>
              </div>
            </button>

            {/* Desktop links */}
            <div className="hidden lg:flex items-center gap-1">
              {links.map(link => (
                <button
                  key={link.label}
                  onClick={() => scrollTo(link.href)}
                  className={`relative px-4 py-2 text-sm font-semibold transition-colors duration-300 group ${
                    dark ? 'text-white/70 hover:text-white' : 'text-[#081a3d]/65 hover:text-[#081a3d]'
                  }`}
                >
                  {link.label}
                  <span className="absolute bottom-0.5 left-4 right-4 h-[2px] bg-[#ff2c91] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
                </button>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden lg:block">
              <MagneticButton
                onClick={() => scrollTo('#register')}
                className="bg-[#ff2c91] hover:bg-[#cc1f6e] text-white font-bold text-[13px] px-7 py-3 rounded-full transition-colors duration-200 shadow-pink"
              >
                Request Invitation
              </MagneticButton>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              className={`lg:hidden p-2 rounded-lg transition-colors ${dark ? 'text-white' : 'text-[#081a3d]'}`}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
            animate={{ opacity: 1, clipPath: 'inset(0 0 0% 0)' }}
            exit={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="fixed inset-0 z-40 bg-[#081a3d] flex flex-col lg:hidden"
          >
            <div className="flex items-center justify-between h-[76px] px-6">
              <div className="font-display text-[27px] tracking-widest">
                <span className="text-white">CN</span>
                <span style={{ color: '#ff2c91' }}>CA</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-white/60 hover:text-white p-2">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 flex flex-col justify-center px-8 gap-1">
              {links.map((link, i) => (
                <motion.button
                  key={link.label}
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                  onClick={() => scrollTo(link.href)}
                  className="text-left py-5 border-b border-white/8 group"
                >
                  <span className="font-display text-[clamp(2.8rem,10vw,4.5rem)] text-white leading-none group-hover:text-[#ff2c91] transition-colors duration-300">
                    {link.label}
                  </span>
                </motion.button>
              ))}
            </div>

            <div className="px-8 pb-12">
              <button
                onClick={() => scrollTo('#register')}
                className="w-full bg-[#ff2c91] text-white font-bold text-sm py-4 rounded-2xl"
              >
                Request Club Invitation
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
