import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'

const links = [
  { label: 'The Weekend', href: '#the-weekend' },
  { label: 'Who Attends', href: '#who-attends' },
  { label: 'Invitation', href: '#invitation' },
]

const Logo = () => (
  <img src="/logo.webp" alt="CNCA Country Netball Championships Australia" className="h-20 w-auto" />
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
