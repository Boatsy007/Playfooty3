/**
 * CNCA National Club Directory — an official competition database, not a dump.
 * Nothing shows until the visitor searches, filters by state/league, or picks a
 * letter. Bright championship styling; results link to team profiles.
 */
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import RankingsNav from '../components/rankings/RankingsNav'
import Footer from '../components/layout/Footer'
import { useSeo } from '../lib/seo'
import { teamPath } from '../lib/rankings'
import { PAGE, PAGE_ALT, TEXT, LINE, GOLD_DK, PINK, MUTE, FAINT, Eyebrow } from '../components/rankings/bits'

const STATES = ['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

interface DirClub { clubId: string; name: string; region: string | null; wins: number; losses: number; draws: number; percentage: number; rank: number | null; powerRating: number | null }
interface DirLeague { leagueId: string; name: string; clubs: DirClub[] }
interface DirState { code: string; name: string; leagues: DirLeague[] }
interface DirResponse { season: string | null; states: DirState[]; meta: { totalClubs: number; totalLeagues: number } }

interface FlatClub { clubId: string; name: string; region: string | null; stateCode: string; stateName: string; leagueId: string; leagueName: string; wins: number; losses: number; draws: number; percentage: number; rank: number | null }

export default function Directory() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [data, setData] = useState<DirResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState(params.get('q') ?? '')
  const [stateF, setStateF] = useState('')
  const [leagueF, setLeagueF] = useState('')
  const [letter, setLetter] = useState('')

  useSeo({
    title: 'National Club Directory — Country Netball | CNCA',
    description: 'Search Australia’s country netball clubs and teams by name, state and league, or browse A–Z. The official CNCA national club directory.',
    path: '/directory',
  })

  useEffect(() => {
    fetch('/api/directory')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<DirResponse> })
      .then(setData).catch(e => setError(String(e))).finally(() => setLoading(false))
  }, [])

  const clubs: FlatClub[] = useMemo(() => {
    const out: FlatClub[] = []
    for (const s of data?.states ?? [])
      for (const l of s.leagues)
        for (const c of l.clubs)
          out.push({ ...c, stateCode: s.code, stateName: s.name, leagueId: l.leagueId, leagueName: l.name })
    return out.sort((a, b) => a.name.localeCompare(b.name))
  }, [data])

  // Leagues available for the league filter (respect selected state)
  const leagueOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const c of clubs) if (!stateF || c.stateCode === stateF) if (!seen.has(c.leagueId)) seen.set(c.leagueId, c.leagueName)
    return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [clubs, stateF])

  const q = query.trim().toLowerCase()
  const hasCriteria = q.length >= 1 || !!stateF || !!leagueF || !!letter

  const results = useMemo(() => {
    if (!hasCriteria) return []
    return clubs.filter(c => {
      if (stateF && c.stateCode !== stateF) return false
      if (leagueF && c.leagueId !== leagueF) return false
      if (letter && !c.name.toUpperCase().startsWith(letter)) return false
      if (q) {
        const hay = `${c.name} ${c.region ?? ''} ${c.leagueName} ${c.stateName} ${c.stateCode}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [clubs, q, stateF, leagueF, letter, hasCriteria])

  const clearAll = () => { setQuery(''); setStateF(''); setLeagueF(''); setLetter('') }

  return (
    <div style={{ background: PAGE, minHeight: '100vh' }}>
      <RankingsNav />

      {/* Hero + controls */}
      <header style={{ background: PAGE_ALT, borderBottom: `1px solid ${LINE}`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(680px 320px at 12% -20%, rgba(255,44,145,0.10), transparent 62%)' }} />
        <div style={{ position: 'relative', maxWidth: 1000, margin: '0 auto', padding: '40px 20px 26px' }}>
          <Eyebrow>National Club Directory{data?.season ? ` · ${data.season}` : ''}</Eyebrow>
          <h1 className="font-display" style={{ fontSize: 'clamp(2.6rem,8vw,5.4rem)', color: TEXT, lineHeight: 0.88, margin: '12px 0 8px' }}>
            EVERY <span style={{ color: PINK }}>CLUB.</span>
          </h1>
          <p style={{ color: MUTE, fontSize: 15.5, maxWidth: 520 }}>
            Search the national database by club, team or league — filter by state, or browse A–Z.
          </p>

          {/* Search */}
          <div style={{ marginTop: 22, position: 'relative', maxWidth: 560 }}>
            <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: MUTE }} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search club, team or league"
              className="font-condensed" style={{ width: '100%', borderRadius: 12, outline: 'none', color: TEXT, fontSize: 16, background: PAGE, border: `1px solid ${LINE}`, padding: '14px 16px 14px 46px', letterSpacing: '0.01em' }} />
          </div>

          {/* State + league filters */}
          <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Select value={stateF} onChange={v => { setStateF(v); setLeagueF('') }} placeholder="All States"
              options={STATES.map(s => ({ id: s, name: s }))} />
            <Select value={leagueF} onChange={setLeagueF} placeholder="All Leagues / Regions" options={leagueOptions} wide />
            {hasCriteria && (
              <button onClick={clearAll} className="font-condensed" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: 'none', border: `1px solid ${LINE}`, borderRadius: 10, padding: '10px 14px', color: MUTE, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 12 }}>
                <X size={13} /> Clear
              </button>
            )}
          </div>

          {/* A–Z bar */}
          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {LETTERS.map(L => (
              <button key={L} onClick={() => setLetter(letter === L ? '' : L)} className="font-display"
                style={{ width: 32, height: 32, borderRadius: 8, cursor: 'pointer', border: `1px solid ${letter === L ? PINK : LINE}`, background: letter === L ? PINK : PAGE, color: letter === L ? '#fff' : TEXT, fontSize: 16, lineHeight: 1 }}>
                {L}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '26px 20px 90px' }}>
        {loading && <Centered>Loading directory…</Centered>}
        {error && !loading && <Centered tone="error">Unable to load the directory right now.</Centered>}

        {!loading && !error && !hasCriteria && (
          <EmptyState />
        )}

        {!loading && !error && hasCriteria && (
          <>
            <div className="font-condensed" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '4px 2px 12px', color: FAINT, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: 12 }}>
              <span>{results.length} result{results.length === 1 ? '' : 's'}{letter ? ` · ${letter}` : ''}{stateF ? ` · ${stateF}` : ''}</span>
            </div>
            {results.length === 0 && <Centered>No clubs match your search.</Centered>}
            <div style={{ borderTop: results.length ? `2px solid ${TEXT}` : 'none' }}>
              {results.map(c => {
                const clickable = c.rank != null
                return (
                  <button key={c.clubId} disabled={!clickable} onClick={() => clickable && navigate(teamPath(c.clubId))}
                    className={clickable ? 'rank-row-lt' : undefined}
                    style={{ width: '100%', textAlign: 'left', cursor: clickable ? 'pointer' : 'default', border: 'none', font: 'inherit', color: TEXT, display: 'grid', gridTemplateColumns: '52px 1fr auto', gap: 12, alignItems: 'center', padding: '14px 10px', borderBottom: `1px solid ${LINE}`, background: PAGE, opacity: clickable ? 1 : 0.65 }}>
                    <span className="font-display" style={{ fontSize: 22, color: c.rank != null ? (c.rank <= 3 ? GOLD_DK : PINK) : FAINT }}>{c.rank != null ? `#${c.rank}` : '—'}</span>
                    <span style={{ minWidth: 0 }}>
                      <span className="font-display" style={{ display: 'block', fontSize: 17, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name.toUpperCase()}</span>
                      <span className="font-condensed" style={{ display: 'block', fontSize: 12, color: MUTE, letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.leagueName} · {c.stateCode}</span>
                    </span>
                    <span className="font-condensed" style={{ fontSize: 12, color: FAINT, textAlign: 'right', whiteSpace: 'nowrap' }}>{c.wins}-{c.losses}{c.draws ? `-${c.draws}` : ''}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}

function Select({ value, onChange, options, placeholder, wide }: { value: string; onChange: (v: string) => void; options: { id: string; name: string }[]; placeholder: string; wide?: boolean }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)} className="font-condensed"
        style={{ appearance: 'none', cursor: 'pointer', background: value ? PINK : PAGE, color: value ? '#fff' : TEXT, border: `1px solid ${value ? PINK : LINE}`, borderRadius: 10, padding: '11px 34px 11px 14px', fontWeight: 700, letterSpacing: '0.04em', fontSize: 13.5, minWidth: wide ? 200 : 130, maxWidth: wide ? 260 : undefined }}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: value ? '#fff' : MUTE, fontSize: 11 }}>▾</span>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '70px 20px' }}>
      <div className="font-display" style={{ fontSize: 'clamp(3rem,10vw,6rem)', color: 'rgba(17,17,17,0.08)', lineHeight: 0.9, marginBottom: 8 }}>A–Z</div>
      <p className="font-display" style={{ color: TEXT, fontSize: 'clamp(1.3rem,4vw,1.9rem)', margin: '0 auto', maxWidth: 460, lineHeight: 1.1 }}>
        Search for a club or choose a letter to explore the national directory.
      </p>
      <p style={{ color: MUTE, fontSize: 14.5, marginTop: 12 }}>Try “Traralgon”, pick a state, or tap a letter above.</p>
    </div>
  )
}

function Centered({ children, tone }: { children: React.ReactNode; tone?: 'error' }) {
  return <div className="font-condensed" style={{ minHeight: 160, display: 'grid', placeItems: 'center', color: tone === 'error' ? '#dc2626' : MUTE, fontSize: 13, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{children}</div>
}
