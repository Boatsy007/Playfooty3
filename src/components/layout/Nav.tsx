import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

const NAV_H = 96 // px — tall enough for the full logo
const HEADER_NAVY = '#041f42'
const ACTION_RED = '#ee0018'

const links = [
  { label: 'Home',     href: '/',           route: '/'          },
  { label: 'Rankings', href: '/rankings',   route: '/rankings'  },
  { label: 'Goal Kickers', href: '/goal-kickers', route: '/goal-kickers' },
  { label: 'Leagues',  href: '/leagues',    route: '/leagues'   },
  { label: 'Clubs',    href: '/directory',  route: '/directory' },
  { label: 'News',     href: '/news',       route: '/news'      },
  { label: 'About',    href: '/about',      route: '/about'     },
]

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function Nav() {
  const [scrolled, setScrolled]     = useState(false)
  const [open, setOpen]             = useState(false)
  const [activeLink, setActiveLink] = useState<string | null>(null)
  const prefersReduced              = useReducedMotion()
  const navigate                    = useNavigate()
  const location                    = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const go = useCallback((href: string, route?: string) => {
    setActiveLink(href)
    setOpen(false)
    // Page-level navigation
    if (href.startsWith('/') && !href.startsWith('/#')) {
      navigate(href)
      window.scrollTo({ top: 0, behavior: 'auto' })
      return
    }
    // Hash scroll — navigate to home first if not already there
    const delay = open ? 300 : 0
    if (route && route !== '/' && location.pathname !== '/') {
      navigate('/')
      setTimeout(() => {
        document.querySelector(href)?.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' })
      }, 400)
      return
    }
    if (location.pathname !== '/') {
      navigate('/')
      setTimeout(() => {
        document.querySelector(href)?.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' })
      }, 400)
      return
    }
    setTimeout(() => {
      document.querySelector(href)?.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' })
    }, delay)
  }, [open, prefersReduced, navigate, location.pathname])

  return (
    <>
      {/* ─── Desktop / tablet nav bar ─── */}
      <motion.nav
        initial={{ y: -NAV_H, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease }}
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          height: NAV_H,
          background: HEADER_NAVY,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.12)',
          boxShadow: scrolled ? '0 2px 24px rgba(120,0,12,0.28)' : 'none',
          transition: 'background 0.35s, border-color 0.35s, box-shadow 0.35s',
        }}
        role="navigation"
        aria-label="Main navigation"
      >
        <div
          className="max-w-6xl mx-auto px-4 sm:px-8 flex items-center justify-between h-full"
        >
          {/* Logo */}
          <button
            onClick={() => { navigate('/'); window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' }) }}
            aria-label="PlayFooty home"
            className="shrink-0 flex items-center"
            style={{ height: NAV_H - 8 }}
          >
            <img src="/logo.webp" alt="PlayFooty" style={{ height: 62, width: 'auto', maxWidth: 300, display: 'block', objectFit: 'contain' }} />
          </button>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-1">
            {links.map((l, i) => (
              <motion.button
                key={l.label}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.08 + i * 0.05, ease }}
                onClick={() => go(l.href, l.route)}
                className="relative px-4 py-2.5 text-[14.5px] font-semibold tracking-wide transition-colors duration-200 group"
                style={{ color: (activeLink === l.href || (l.href.startsWith('/') && location.pathname === l.href)) ? '#ffffff' : 'rgba(255,255,255,0.78)' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#ffffff' }}
                onMouseLeave={e => { const isActive = activeLink === l.href || (l.href.startsWith('/') && location.pathname === l.href); e.currentTarget.style.color = isActive ? '#ffffff' : 'rgba(255,255,255,0.78)' }}
              >
                {l.label}
                {/* Animated underline */}
                <span
                  className="absolute bottom-0 left-3.5 right-3.5 rounded-full"
                  style={{
                    height: '2px',
                    background: '#ffffff',
                    transform: (activeLink === l.href || (l.href.startsWith('/') && location.pathname === l.href)) ? 'scaleX(1)' : 'scaleX(0)',
                    transformOrigin: 'left',
                    transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1)',
                  }}
                />
                {/* Hover underline (separate element so active + hover don't clash) */}
                <span
                  className="absolute bottom-0 left-3.5 right-3.5 rounded-full opacity-0 group-hover:opacity-100 group-hover:scale-x-100"
                  style={{
                    height: '2px',
                    background: 'rgba(255,255,255,0.45)',
                    transform: 'scaleX(0)',
                    transformOrigin: 'left',
                    transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1), opacity 0.2s',
                    display: (activeLink === l.href || (l.href.startsWith('/') && location.pathname === l.href)) ? 'none' : undefined,
                  }}
                />
              </motion.button>
            ))}

            <motion.button
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.42, ease }}
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => go('/rankings', '/rankings')}
              className="ml-4 font-bold rounded-full text-[13px] tracking-wide"
              style={{
                background: '#ffffff',
                color: ACTION_RED,
                padding: '0.6rem 1.4rem',
                boxShadow: '0 4px 20px rgba(120,0,12,0.24)',
                transition: 'background 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#fff4f5'
                e.currentTarget.style.boxShadow = '0 8px 28px rgba(120,0,12,0.34)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#ffffff'
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(120,0,12,0.24)'
              }}
            >
              View Rankings
            </motion.button>
          </div>

          {/* Mobile hamburger */}
          <motion.button
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl"
            style={{ background: open ? 'rgba(255,255,255,0.16)' : 'transparent', color: '#ffffff' }}
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            whileTap={{ scale: 0.92 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {open ? (
                <motion.span
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.18, ease }}
                >
                  <X size={20} strokeWidth={2} />
                </motion.span>
              ) : (
                <motion.span
                  key="open"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.18, ease }}
                >
                  <Menu size={20} strokeWidth={2} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.nav>

      {/* ─── Mobile full-screen overlay ─── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease }}
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: HEADER_NAVY }}
          >
            {/* Top bar fill (matches nav) */}
            <div style={{ height: NAV_H }} />

            {/* Pink accent line */}
            <div style={{ height: '2px', background: 'rgba(255,255,255,0.34)' }} />

            {/* Links */}
            <nav className="flex flex-col px-6 pt-6 pb-10 overflow-y-auto" style={{ maxHeight: `calc(100vh - ${NAV_H + 2}px)` }}>
              {links.map((l, i) => (
                <motion.button
                  key={l.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: 0.05 + i * 0.06, ease }}
                  onClick={() => go(l.href, l.route)}
                  className="flex items-center justify-between w-full text-left py-4 group"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.16)' }}
                >
                  <span
                    className="font-display leading-none transition-colors duration-200 group-active:text-[#d71920]"
                    style={{ fontSize: 'clamp(2rem, 8vw, 3rem)', color: '#ffffff' }}
                  >
                    {l.label.toUpperCase()}
                  </span>
                  <span className="font-condensed font-bold text-[10px] tracking-[0.22em] uppercase" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </motion.button>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.42, ease }}
                className="mt-8 space-y-3"
              >
                <button
                  onClick={() => go('/rankings', '/rankings')}
                  className="w-full font-bold rounded-2xl text-base py-4"
                  style={{
                    background: '#ffffff',
                    color: ACTION_RED,
                    boxShadow: '0 8px 32px rgba(120,0,12,0.24)',
                  }}
                >
                  View National Rankings
                </button>
                <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.68)' }}>
                  PlayFooty · Australia’s home of community football
                </p>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer so page content clears the fixed nav */}
      <div style={{ height: NAV_H }} aria-hidden />
    </>
  )
}
