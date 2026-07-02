/**
 * CNCA Club Directory
 * Browse every tracked country netball club by state → league.
 * Live data from /api/directory.
 */
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, Search, MapPin, Trophy } from 'lucide-react'
import Nav from '../components/layout/Nav'
import Ticker from '../components/layout/Ticker'
import Footer from '../components/layout/Footer'

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

interface DirClub {
  clubId: string; name: string; slug: string; region: string | null
  websiteUrl: string | null; facebookUrl: string | null; instagramUrl: string | null
  played: number; wins: number; losses: number; draws: number
  percentage: number; points: number; rank: number | null; powerRating: number | null
}
interface DirLeague {
  leagueId: string; name: string; shortName: string | null
  strengthTier: number; strengthScore: number; clubs: DirClub[]
}
interface DirState { code: string; name: string; leagues: DirLeague[] }
interface DirResponse { season: string | null; states: DirState[]; meta: { totalClubs: number; totalLeagues: number } }

function Stars({ tier }: { tier: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`Strength tier ${tier}/5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ fontSize: '10px', color: i < tier ? '#f4c14d' : 'rgba(255,255,255,0.15)' }}>★</span>
      ))}
    </span>
  )
}

function ClubRow({ club, index }: { club: DirClub; index: number }) {
  return (
    <div
      className="grid items-center gap-3 px-4 sm:px-5 py-3"
      style={{
        gridTemplateColumns: 'auto 1fr auto auto',
        borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Ladder position */}
      <span
        className="font-display text-right leading-none"
        style={{ color: '#ff2c91', fontSize: 'clamp(1.4rem, 4vw, 2rem)', minWidth: '1.8rem' }}
      >
        {index + 1}
      </span>

      {/* Name + region */}
      <div className="min-w-0">
        <p className="font-display text-white leading-tight truncate" style={{ fontSize: '1rem' }}>{club.name}</p>
        {club.region && (
          <p className="font-condensed font-bold text-[9px] tracking-[0.15em] uppercase flex items-center gap-1 mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <MapPin size={9} /> {club.region}
          </p>
        )}
      </div>

      {/* Record + rating */}
      <div className="text-right hidden sm:block">
        <p className="font-display text-white text-sm">{club.wins}–{club.losses}{club.draws ? `–${club.draws}` : ''}</p>
        <p className="font-condensed font-bold text-[9px] tracking-[0.12em] uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {club.percentage ? `${club.percentage}%` : '—'}
          {club.rank ? ` · #${club.rank}` : ''}
        </p>
      </div>

      {/* Links */}
      <div className="flex items-center gap-1.5 justify-end">
        {club.websiteUrl && <IconLink href={club.websiteUrl} label="Website">Web</IconLink>}
        {club.facebookUrl && <IconLink href={club.facebookUrl} label="Facebook">FB</IconLink>}
        {club.instagramUrl && <IconLink href={club.instagramUrl} label="Instagram">IG</IconLink>}
        {!club.websiteUrl && !club.facebookUrl && !club.instagramUrl && (
          <span className="font-condensed text-[9px] tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>
        )}
      </div>
    </div>
  )
}

function IconLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href} target="_blank" rel="noopener noreferrer" title={label}
      className="h-7 px-2.5 rounded-full flex items-center justify-center transition-all font-condensed font-bold text-[9px] tracking-[0.12em] uppercase"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
      onMouseEnter={e => { e.currentTarget.style.color = '#ff2c91'; e.currentTarget.style.borderColor = 'rgba(255,44,145,0.4)' }}
      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
    >
      {children}
    </a>
  )
}

function LeagueCard({ league }: { league: DirLeague }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="font-display text-white leading-tight" style={{ fontSize: 'clamp(1.1rem, 2.4vw, 1.5rem)' }}>{league.name}</h3>
            <Stars tier={league.strengthTier} />
          </div>
          <p className="font-condensed font-bold text-[9px] tracking-[0.2em] uppercase mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {league.clubs.length} clubs
          </p>
        </div>
        <ChevronDown size={18} style={{ color: 'rgba(255,255,255,0.4)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s', flexShrink: 0 }} />
      </button>
      {open && <div>{league.clubs.map((c, i) => <ClubRow key={c.clubId} club={c} index={i} />)}</div>}
    </div>
  )
}

export default function Directory() {
  const [data, setData] = useState<DirResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetch('/api/directory')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<DirResponse> })
      .then(setData)
      .catch(err => setError(String(err)))
      .finally(() => setIsLoading(false))
  }, [])

  // Client-side filter across club + league + region + state
  const q = query.trim().toLowerCase()
  const states = (data?.states ?? [])
    .map(s => ({
      ...s,
      leagues: s.leagues
        .map(l => ({ ...l, clubs: q ? l.clubs.filter(c =>
          c.name.toLowerCase().includes(q) || (c.region ?? '').toLowerCase().includes(q) ||
          l.name.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
        ) : l.clubs }))
        .filter(l => l.clubs.length > 0),
    }))
    .filter(s => s.leagues.length > 0)

  return (
    <>
      <Ticker />
      <Nav />

      <main style={{ background: '#0a0a0a', minHeight: '100vh' }}>
        {/* Hero */}
        <section className="relative overflow-hidden" style={{ background: '#0d0d0d', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 60% at 20% 0%, rgba(255,44,145,0.06) 0%, transparent 70%)' }} />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-8 pt-28 pb-14">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-6 h-[1.5px]" style={{ background: '#ff2c91' }} />
              <span className="font-condensed font-bold tracking-[0.28em] uppercase text-[10px]" style={{ color: '#f4c14d' }}>
                CNCA Club Directory{data?.season ? ` · ${data.season}` : ''}
              </span>
            </div>
            <h1 className="font-display text-white leading-[0.9] mb-5" style={{ fontSize: 'clamp(2.5rem, 8vw, 6rem)' }}>
              EVERY <span style={{ color: '#ff2c91' }}>CLUB.</span>
            </h1>
            <p style={{ fontSize: 'clamp(1rem, 1.8vw, 1.2rem)', color: 'rgba(255,255,255,0.5)', maxWidth: '46ch' }}>
              Every country netball club we track, organised by state and league.
              {data && <span className="text-white/70"> {data.meta.totalClubs} clubs across {data.meta.totalLeagues} leagues.</span>}
            </p>

            {/* Search */}
            <div className="mt-8 relative" style={{ maxWidth: '440px' }}>
              <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)' }} />
              <input
                value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search clubs, leagues or regions…"
                className="w-full rounded-xl outline-none text-sm text-white"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', padding: '0.75rem 1rem 0.75rem 2.5rem' }}
              />
            </div>
          </div>
        </section>

        {/* Body */}
        <section className="max-w-6xl mx-auto px-4 sm:px-8 py-14">
          {isLoading && (
            <p className="font-condensed font-bold text-[11px] tracking-[0.28em] uppercase text-center py-20" style={{ color: 'rgba(255,255,255,0.25)' }}>Loading directory…</p>
          )}
          {error && !isLoading && (
            <p className="font-condensed font-bold text-[11px] tracking-[0.2em] uppercase text-center py-20" style={{ color: '#ef4444' }}>Unable to load the directory. Please try again later.</p>
          )}
          {!isLoading && !error && states.length === 0 && (
            <p className="font-display text-white/25 text-2xl text-center py-20">No clubs match your search.</p>
          )}

          {states.map(state => (
            <motion.div
              key={state.code}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.5, ease }}
              className="mb-14"
            >
              <div className="flex items-center gap-3 mb-6">
                <Trophy size={16} style={{ color: '#f4c14d' }} />
                <h2 className="font-display text-white" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}>{state.name}</h2>
                <span className="font-condensed font-bold text-[9px] tracking-[0.2em] uppercase px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>{state.code}</span>
                <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
              <div className="space-y-4">
                {state.leagues.map(l => <LeagueCard key={l.leagueId} league={l} />)}
              </div>
            </motion.div>
          ))}

          {/* Claim-your-club prompt */}
          {!isLoading && !error && states.length > 0 && (
            <div className="mt-6 p-6 rounded-2xl flex items-start gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Is this your club?</strong> Records and ladders update weekly from publicly available results.
                To add your club's website, socials or contact details, get in touch — we'll keep your listing current.
              </p>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  )
}
