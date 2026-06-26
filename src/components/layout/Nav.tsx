import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'

const links = [
  { label: 'Experience', href: '#experience' },
  { label: 'Format', href: '#format' },
  { label: 'Invitation', href: '#invitation' },
]

const Logo = () => (
  <div className="flex items-center gap-2.5">
    <svg width="44" height="44" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="52" cy="52" r="38" stroke="#ff2c91" strokeWidth="3" fill="none"/>
      <circle cx="52" cy="52" r="25" stroke="#ff2c91" strokeWidth="2" fill="none"/>
      <path d="M14 45 Q52 38 90 45" stroke="#ff2c91" strokeWidth="1.8" fill="none"/>
      <path d="M14 59 Q52 66 90 59" stroke="#ff2c91" strokeWidth="1.8" fill="none"/>
      <line x1="52" y1="14" x2="52" y2="90" stroke="#ff2c91" strokeWidth="1.8"/>
      <path d="M20 52 C20 30 34 14 52 10 C40 16 32 32 32 52 C32 72 40 88 52 94 C34 90 20 74 20 52Z" fill="#ff2c91"/>
      <path d="M49 4 L50.5 9 L55.5 9 L51.5 12 L53 17 L49 14 L45 17 L46.5 12 L42.5 9 L47.5 9Z" fill="#f4c14d"/>
    </svg>
    <div>
      <div className="font-display text-[22px] tracking-widest leading-none text-[#1a1a1a]">
        AC<span style={{ color: '#ff2c91' }}>NC</span>
      </div>
      <div className="text-[7px] font-bold tracking-[0.12em] uppercase text-[#1a1a1a]/40 mt-0.5 leading-none">
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
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'nav-scrolled' : 'bg-white/90'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-8 flex items-center justify-between h-[68px]">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <Logo />
          </button>

          <div className="hidden md:flex items-center gap-1">
            {links.map(l => (
              <button key={l.label} onClick={() => go(l.href)}
                className="px-4 py-2 text-sm font-semibold text-[#1a1a1a]/65 hover:text-[#1a1a1a] transition-colors">
                {l.label}
              </button>
            ))}
            <button onClick={() => go('#invitation')}
              className="ml-4 btn-pink text-sm px-6 py-2.5 rounded-full font-bold">
              Request Invitation
            </button>
          </div>

          <button className="md:hidden p-2 text-[#1a1a1a]" onClick={() => setOpen(o => !o)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-40 bg-white flex flex-col pt-[68px]">
          <div className="flex flex-col p-8 gap-2">
            {links.map(l => (
              <button key={l.label} onClick={() => go(l.href)}
                className="text-left py-4 border-b border-gray-100 font-display text-4xl text-[#1a1a1a] hover:text-[#ff2c91] transition-colors">
                {l.label}
              </button>
            ))}
            <button onClick={() => go('#invitation')}
              className="mt-6 btn-pink text-sm py-4 rounded-2xl font-bold w-full">
              Request Invitation
            </button>
          </div>
        </div>
      )}
    </>
  )
}
