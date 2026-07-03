/**
 * Global search overlay — teams, clubs and leagues. Controlled by the nav via
 * useSearchController(); also opens on Cmd/Ctrl+K. Debounced results.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { fetchSearch, teamPath, leaguePath, type SearchResults } from '../../lib/rankings'
import { PAGE, PAGE_ALT, LINE, GOLD_DK, CYAN, MUTE, TEXT } from './bits'

export interface SearchController {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

export function useSearchController(): SearchController {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen(o => !o), [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); toggle() }
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, close])
  return { isOpen, open, close, toggle }
}

export default function GlobalSearch({ controller }: { controller: SearchController }) {
  const { isOpen, close } = controller
  const [q, setQ] = useState('')
  const [res, setRes] = useState<SearchResults>({ teams: [], leagues: [] })
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const go = useCallback((path: string) => { close(); setQ(''); navigate(path) }, [navigate, close])

  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 40) }, [isOpen])

  useEffect(() => {
    if (q.trim().length < 2) { setRes({ teams: [], leagues: [] }); return }
    setLoading(true)
    const id = setTimeout(() => {
      fetchSearch(q.trim()).then(setRes).catch(() => setRes({ teams: [], leagues: [] })).finally(() => setLoading(false))
    }, 220)
    return () => clearTimeout(id)
  }, [q])

  if (!isOpen) return null

  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(17,17,17,0.45)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '11vh 16px 0' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 640, background: PAGE, border: `1px solid ${LINE}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 40px 120px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', borderBottom: `1px solid ${LINE}` }}>
          <Search size={18} color={MUTE} />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Search club, team or league…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: TEXT, fontSize: 16 }} />
          <button onClick={close} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTE }}><X size={18} /></button>
        </div>
        <div style={{ maxHeight: '54vh', overflowY: 'auto' }}>
          {q.trim().length < 2 && <Hint>Type at least 2 characters to search.</Hint>}
          {q.trim().length >= 2 && loading && <Hint>Searching…</Hint>}
          {q.trim().length >= 2 && !loading && res.teams.length === 0 && res.leagues.length === 0 && <Hint>No matches.</Hint>}

          {res.teams.length > 0 && <SectionLabel>Teams</SectionLabel>}
          {res.teams.map(t => (
            <Row key={t.clubId} onClick={() => go(teamPath(t.clubId))}
              left={<span className="font-display" style={{ fontSize: 18, color: t.rank <= 32 ? GOLD_DK : MUTE, minWidth: 34 }}>#{t.rank}</span>}
              title={t.clubName} sub={`${t.leagueName} · ${t.state}`} />
          ))}
          {res.leagues.length > 0 && <SectionLabel>Leagues</SectionLabel>}
          {res.leagues.map(l => (
            <Row key={l.id} onClick={() => go(leaguePath(l.id))}
              left={<span className="font-condensed" style={{ fontSize: 11, color: CYAN, fontWeight: 800, letterSpacing: '0.1em' }}>{l.state}</span>}
              title={l.name} sub={`Strength ${Math.round((l.strengthScore ?? 60) / 20)}/5`} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Row({ left, title, sub, onClick }: { left: React.ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none', background: 'transparent', font: 'inherit', color: TEXT, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: `1px solid ${LINE}` }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(17,17,17,0.03)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      <span style={{ display: 'grid', placeItems: 'center' }}>{left}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
        <span className="font-condensed" style={{ display: 'block', color: MUTE, fontSize: 12, letterSpacing: '0.04em' }}>{sub}</span>
      </span>
    </button>
  )
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="font-condensed" style={{ padding: '12px 18px 6px', fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: MUTE, background: PAGE_ALT }}>{children}</div>
}
function Hint({ children }: { children: React.ReactNode }) {
  return <div className="font-condensed" style={{ padding: '28px 18px', color: MUTE, fontSize: 13, letterSpacing: '0.08em', textAlign: 'center' }}>{children}</div>
}
