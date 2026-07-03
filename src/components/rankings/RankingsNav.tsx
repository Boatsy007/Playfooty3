/**
 * Product navigation — bright championship style matching the homepage (white,
 * black wordmark, pink active/hover). Links: Rankings, Clubs, Leagues,
 * Championship, About. Integrated search + clean full-screen mobile menu.
 */
import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Search } from 'lucide-react'
import GlobalSearch, { useSearchController } from './GlobalSearch'
import { PINK } from './bits'

const NAV_H = 72

const LINKS = [
  { label: 'Rankings', to: '/rankings' },
  { label: 'Clubs', to: '/directory' },
  { label: 'Leagues', to: '/leagues' },
  { label: 'Championship', to: '/championship' },
  { label: 'About', to: '/' },
]

export default function RankingsNav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const search = useSearchController()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [open])

  const isActive = (to: string) => (to === '/' ? false : pathname === to || pathname.startsWith(to + '/'))
  const inactive = 'rgba(17,17,17,0.55)'

  return (
    <>
      <GlobalSearch controller={search} />

      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 70, height: NAV_H, display: 'flex', alignItems: 'center',
        background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${scrolled ? 'rgba(17,17,17,0.08)' : 'transparent'}`,
        boxShadow: scrolled ? '0 2px 24px rgba(0,0,0,0.06)' : 'none', transition: 'border-color .3s, box-shadow .3s',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => navigate('/')} aria-label="CNCA home" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <img src="/logo.webp" alt="CNCA — Country Netball Championships Australia" style={{ height: 46, width: 'auto', objectFit: 'contain' }} />
          </button>

          <div className="hide-sm" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {LINKS.map(l => (
              <Link key={l.label} to={l.to}
                style={{ padding: '9px 14px', textDecoration: 'none', fontWeight: 600, fontSize: 14.5, letterSpacing: '0.01em', color: isActive(l.to) ? PINK : inactive, transition: 'color .2s' }}
                onMouseEnter={e => { if (!isActive(l.to)) e.currentTarget.style.color = '#111' }}
                onMouseLeave={e => { e.currentTarget.style.color = isActive(l.to) ? PINK : inactive }}>
                {l.label}
              </Link>
            ))}
            <button onClick={search.open} aria-label="Search" style={{ marginLeft: 8, cursor: 'pointer', background: 'rgba(17,17,17,0.05)', border: '1px solid rgba(17,17,17,0.1)', borderRadius: 999, width: 38, height: 38, display: 'grid', placeItems: 'center', color: '#111' }}>
              <Search size={17} />
            </button>
          </div>

          <div className="show-sm" style={{ display: 'none', alignItems: 'center', gap: 4 }}>
            <button onClick={search.open} aria-label="Search" style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#111', display: 'grid', placeItems: 'center', width: 40, height: 40 }}><Search size={20} /></button>
            <button onClick={() => setOpen(o => !o)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#111', display: 'grid', placeItems: 'center', width: 40, height: 40 }}>
              {open ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 65, background: '#fff', paddingTop: NAV_H }}>
          <div style={{ height: 2, background: 'linear-gradient(90deg,#ff2c91,#f4c14d,#ff2c91)' }} />
          <nav style={{ display: 'flex', flexDirection: 'column', padding: '18px 22px' }}>
            {LINKS.map((l, i) => (
              <Link key={l.label} to={l.to} onClick={() => setOpen(false)} className="font-display"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 0', textDecoration: 'none', color: isActive(l.to) ? PINK : '#111', fontSize: 'clamp(2rem,9vw,3rem)', lineHeight: 1, borderBottom: '1px solid rgba(17,17,17,0.08)' }}>
                {l.label.toUpperCase()}
                <span className="font-condensed" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'rgba(17,17,17,0.25)' }}>{String(i + 1).padStart(2, '0')}</span>
              </Link>
            ))}
            <Link to="/championship" onClick={() => setOpen(false)} className="btn-pink" style={{ marginTop: 26, textAlign: 'center', padding: '16px', fontSize: 15 }}>The Championship</Link>
          </nav>
        </div>
      )}

      <div style={{ height: NAV_H }} aria-hidden />
    </>
  )
}
