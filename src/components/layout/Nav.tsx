import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'

const links = [
  { label: 'Experience', href: '#experience' },
  { label: 'Format', href: '#format' },
  { label: 'Invitation', href: '#invitation' },
]

const Logo = ({ dark = false }: { dark?: boolean }) => (
  <div className="flex items-center gap-2.5">
    <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="52" cy="52" r="38" stroke="#ff2c91" strokeWidth="3" fill="none"/>
      <circle cx="52" cy="52" r="25" stroke="#ff2c91" strokeWidth="2" fill="none"/>
      <path d="M14 45 Q52 38 90 45" stroke="#ff2c91" strokeWidth="1.8" fill="none"/>
      <path d="M14 59 Q52 66 90 59" stroke="#ff2c91" strokeWidth="1.8" fill="none"/>
      <line x1="52" y1="14" x2="52" y2="90" stroke="#ff2c91" strokeWidth="1.8"/>
      <path d="M20 52 C20 30 34 14 52 10 C40 16 32 32 32 52 C32 72 40 88 52 94 C34 90 20 74 20 52Z" fill="#ff2c91"/>
      <path d="M49 4 L50.5 9 L55.5 9 L51.5 12 L53 17 L49 14 L45 17 L46.5 12 L42.5 9 L47.5 9Z" fill="#f4c14d"/>
    </svg>
    <div>
      <div className="font-display text-[22px] tracking-widest leading-none"
        style={{ color: dark ? '#ffffff' : '#1a1a1a' }}>
        AC<span style={{ color: '#ff2c91' }}>NC</span>
      </div>
      <div className="text-[7px] font-bold tracking-[0.12em] uppercase mt-0.5 leading-none"
        style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(26,26,26,0.38)' }}>
        Australian Club Netball Championships
      </div>
    </div>
  </div>
)

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const go = (href: string) => {
    setOpen(false)
    setTimeout(() => document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' }), open ? 250 : 0)
  }

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 ${scrolled ? 'nav-scrolled' : 'bg-white/90 backdrop-blur-sm'}`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-8 flex items-center justify-between h-[68px]">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <Logo />
          </button>

          <div className="hidden md:flex items-center gap-1">
            {links.map((l, i) => (
              <motion.button
                key={l.label}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.06 }}
                onClick={() => go(l.href)}
                className="relative px-4 py-2 text-sm font-semibold text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-colors group"
              >
                {l.label}
                <span className="absolute bottom-1 left-4 right-4 h-[2px] bg-[#ff2c91] scale-x-0 group-hover:scale-x-100 transition-transform duration-250 origin-left rounded-full" />
              </motion.button>
            ))}
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.32 }}
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => go('#invitation')}
              className="ml-3 btn-pink text-sm px-6 py-2.5 rounded-full font-bold"
            >
              Request Invitation
            </motion.button>
          </div>

          <button className="md:hidden p-2 text-[#1a1a1a]" onClick={() => setOpen(o => !o)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
            animate={{ opacity: 1, clipPath: 'inset(0 0 0% 0)' }}
            exit={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
            className="fixed inset-0 z-40 bg-white flex flex-col pt-[68px]"
          >
            <div className="flex flex-col p-8 gap-2">
              {links.map((l, i) => (
                <motion.button
                  key={l.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                  onClick={() => go(l.href)}
                  className="text-left py-4 border-b border-gray-100 font-display text-4xl text-[#1a1a1a] hover:text-[#ff2c91] transition-colors"
                >
                  {l.label}
                </motion.button>
              ))}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.28 }}
                onClick={() => go('#invitation')}
                className="mt-6 btn-pink text-sm py-4 rounded-2xl font-bold w-full"
              >
                Request Invitation
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
