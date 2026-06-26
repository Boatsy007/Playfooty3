import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import Button from '../ui/Button'

const links = [
  { label: 'Experience', href: '#experience' },
  { label: 'Why ACNC', href: '#why-acnc' },
  { label: 'Schedule', href: '#schedule' },
  { label: 'Travel', href: '#travel' },
  { label: 'Grant', href: '#grant' },
]

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
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/95 nav-blur shadow-sm border-b border-navy-50' : 'bg-transparent'
        }`}
      >
        <div className="max-w-container mx-auto px-6">
          <div className="flex items-center justify-between h-16 md:h-18">
            {/* Logo */}
            <motion.a
              href="#"
              className="flex items-center gap-2.5 flex-shrink-0"
              whileHover={{ scale: 1.02 }}
            >
              <div className="relative w-9 h-9 flex-shrink-0">
                <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <circle cx="20" cy="20" r="19" stroke="#E8157A" strokeWidth="2" />
                  <circle cx="20" cy="20" r="12" stroke="#E8157A" strokeWidth="1.5" />
                  <path d="M8 14 Q20 8 32 14" stroke="#E8157A" strokeWidth="1.5" fill="none" />
                  <path d="M8 26 Q20 32 32 26" stroke="#E8157A" strokeWidth="1.5" fill="none" />
                  <line x1="20" y1="1" x2="20" y2="39" stroke="#E8157A" strokeWidth="1.5" />
                  <path d="M6 8 Q14 14 6 24" stroke="#E8157A" strokeWidth="1.5" fill="none" />
                  <path d="M34 8 Q26 14 34 24" stroke="#E8157A" strokeWidth="1.5" fill="none" />
                </svg>
                <div className="absolute -top-1.5 -right-1.5">
                  <svg viewBox="0 0 10 10" className="w-3 h-3">
                    <path d="M5 0 L5.8 3.5 L9 5 L5.8 6.5 L5 10 L4.2 6.5 L1 5 L4.2 3.5 Z" fill="#F5C842" />
                  </svg>
                </div>
              </div>
              <div className="leading-none">
                <div className={`font-extrabold text-lg tracking-tight transition-colors duration-300 ${scrolled ? 'text-navy-700' : 'text-white'}`}>
                  <span className={scrolled ? 'text-navy-700' : 'text-white'}>AC</span>
                  <span className="text-pink-500">NC</span>
                </div>
                <div className={`text-[9px] font-bold tracking-[0.12em] uppercase transition-colors duration-300 ${scrolled ? 'text-navy-400' : 'text-white/70'}`}>
                  Aust. Club Netball
                </div>
              </div>
            </motion.a>

            {/* Desktop Links */}
            <div className="hidden lg:flex items-center gap-1">
              {links.map((link) => (
                <button
                  key={link.label}
                  onClick={() => scrollTo(link.href)}
                  className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 hover:text-pink-500 hover:bg-pink-50 ${
                    scrolled ? 'text-navy-700' : 'text-white hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* CTA */}
            <div className="hidden lg:block">
              <Button
                onClick={() => scrollTo('#register')}
                size="sm"
              >
                Request Invitation
              </Button>
            </div>

            {/* Mobile burger */}
            <button
              className={`lg:hidden p-2 rounded-full transition-colors ${scrolled ? 'text-navy-700' : 'text-white'}`}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 left-0 right-0 z-40 bg-white/98 nav-blur border-b border-navy-100 shadow-xl lg:hidden"
          >
            <div className="max-w-container mx-auto px-6 py-6 flex flex-col gap-1">
              {links.map((link) => (
                <button
                  key={link.label}
                  onClick={() => scrollTo(link.href)}
                  className="text-left px-4 py-3.5 text-base font-semibold text-navy-700 rounded-xl hover:bg-pink-50 hover:text-pink-500 transition-colors"
                >
                  {link.label}
                </button>
              ))}
              <div className="pt-3 mt-2 border-t border-navy-50">
                <Button onClick={() => scrollTo('#register')} className="w-full" size="md">
                  Request Invitation
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
