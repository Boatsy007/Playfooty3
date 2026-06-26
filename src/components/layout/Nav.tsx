import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'

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
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const scrollTo = (href: string) => {
    setMobileOpen(false)
    setTimeout(() => {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
    }, mobileOpen ? 250 : 0)
  }

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 bg-white transition-shadow duration-300 ${
          scrolled ? 'shadow-sm border-b border-gray-100' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[72px]">

            {/* Full CNCA Logo */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-3 shrink-0 hover:opacity-90 transition-opacity"
            >
              {/* Logo icon */}
              <svg width="42" height="42" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 50 C20 29 34 13 52 10 C40 15 32 31 32 50 C32 69 40 85 52 90 C34 87 20 71 20 50Z" fill="#ff2c91"/>
                <circle cx="60" cy="50" r="26" stroke="#ff2c91" strokeWidth="3" fill="none"/>
                <circle cx="60" cy="50" r="17" stroke="#ff2c91" strokeWidth="1.8" fill="none"/>
                <path d="M36 43 Q60 37 84 43" stroke="#ff2c91" strokeWidth="1.6" fill="none"/>
                <path d="M36 57 Q60 63 84 57" stroke="#ff2c91" strokeWidth="1.6" fill="none"/>
                <line x1="60" y1="24" x2="60" y2="76" stroke="#ff2c91" strokeWidth="1.6"/>
                <path d="M57 7 L58.4 11 L62.5 11 L59.2 13.4 L60.6 17.4 L57 15 L53.4 17.4 L54.8 13.4 L51.5 11 L55.6 11Z" fill="#f4c14d"/>
              </svg>

              {/* Wordmark */}
              <div className="leading-none">
                <div className="font-display text-[26px] tracking-widest leading-none">
                  <span className="text-navy">CN</span>
                  <span className="text-pink">CA</span>
                </div>
                <div className="text-[7.5px] font-bold tracking-[0.13em] uppercase text-navy/40 mt-0.5">
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
                  className="relative px-4 py-2 text-sm font-semibold text-navy/65 hover:text-navy transition-colors duration-200 group"
                >
                  {link.label}
                  <span className="absolute bottom-0.5 left-4 right-4 h-[2px] bg-pink scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
                </button>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden lg:block">
              <button
                onClick={() => scrollTo('#register')}
                className="bg-pink hover:bg-pink-dark text-white font-bold text-sm px-6 py-3 rounded-full transition-all duration-200 shadow-pink hover:shadow-pink-lg"
              >
                Request Invitation
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="lg:hidden p-2 text-navy rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed top-[72px] left-0 right-0 z-40 bg-white border-b border-gray-100 shadow-lg lg:hidden"
          >
            <div className="px-4 py-3 space-y-0.5">
              {links.map(link => (
                <button
                  key={link.label}
                  onClick={() => scrollTo(link.href)}
                  className="w-full text-left px-4 py-3 text-base font-semibold text-navy hover:text-pink hover:bg-pink-muted rounded-xl transition-colors duration-150"
                >
                  {link.label}
                </button>
              ))}
              <div className="pt-2 pb-2">
                <button
                  onClick={() => scrollTo('#register')}
                  className="w-full bg-pink text-white font-bold text-sm py-3.5 rounded-full hover:bg-pink-dark transition-colors"
                >
                  Request Invitation
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
