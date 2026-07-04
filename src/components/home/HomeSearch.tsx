/**
 * Find Your Club: a large inline search with instant results, recent searches
 * (localStorage) and trending clubs/leagues derived from live rankings.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Clock3, Flame } from 'lucide-react'
import { fetchSearch, teamPath, leaguePath, type SearchResults, type RankingEntry } from '../../lib/rankings'
import { TeamLogo } from '../rankings/bits'
import { Section, SectionHead, Reveal, TEXT, MUTE, FAINT, LINE, PINK, CYANISH } from './ui'
import type { LeagueRow } from './useHomeData'

const RECENTS_KEY = 'gn_recent_searches'
const loadRecents = (): { label: string; path: string }[] => {
  try { return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]') } catch { return [] }
}
const pushRecent = (r: { label: string; path: string }) => {
  const next = [r, ...loadRecents().filter(x => x.path !== r.path)].slice(0, 5)
  try { localStorage.setItem(RECENTS_KEY, JSON.stringify(next)) } catch { /* private mode */ }
}

export default function HomeSearch({ entries, leagues }: { entries: RankingEntry[]; leagues: LeagueRow[] }) {
  const [q, setQ] = useState('')
  const [res, setRes] = useState<SearchResults>({ teams: [], leagues: [] })
  const [searching, setSearching] = useState(false)
  const [focused, setFocused] = useState(false)
  const [recents, setRecents] = useState(loadRecents)
  const boxRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const trendingClubs = entries.filter(e => e.rankMovement > 0).slice(0, 4)
  const trendingLeagues = [...leagues].sort((a, b) => b.strengthScore - a.strengthScore).slice(0, 3)
  const active = q.trim().length >= 2

  useEffect(() => {
    if (!active) { setRes({ teams: [], leagues: [] }); return }
    setSearching(true)
    const id = setTimeout(() => {
      fetchSearch(q.trim()).then(setRes).catch(() => setRes({ teams: [], leagues: [] })).finally(() => setSearching(false))
    }, 200)
    return () => clearTimeout(id)
  }, [q, active])

  // Close the panel when clicking elsewhere.
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setFocused(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const go = (label: string, path: string) => {
    pushRecent({ label, path }); setRecents(loadRecents())
    setQ(''); setFocused(false)
    navigate(path)
  }

  const open = focused && (active || recents.length > 0 || trendingClubs.length > 0 || trendingLeagues.length > 0)

  return (
    <Section>
      <SectionHead
        title={<>FIND YOUR <span style={{ color: PINK }}>CLUB</span></>}
        sub="Every ranked club, team and league in the country. Start typing."
      />
      <Reveal>
        <div ref={boxRef} style={{ position: 'relative', maxWidth: 720 }}>
          <div className="gn-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '4px 8px 4px 22px', borderRadius: 999, borderColor: focused ? PINK : undefined, boxShadow: focused ? '0 2px 4px rgba(17,17,17,0.05), 0 24px 48px -18px rgba(255,44,145,0.25)' : undefined }}>
            <Search size={19} color={focused ? PINK : MUTE} aria-hidden />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder="Search clubs, teams and leagues"
              aria-label="Search clubs, teams and leagues"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 16.5, color: TEXT, padding: '15px 0', minWidth: 0 }}
            />
            <kbd className="font-condensed hide-sm" aria-hidden style={{ color: FAINT, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', border: `1px solid ${LINE}`, borderRadius: 8, padding: '4px 8px', marginRight: 8 }}>
              CTRL K
            </kbd>
          </div>

          {open && (
            <div className="gn-card" role="listbox" aria-label="Search results" style={{ position: 'absolute', top: 'calc(100% + 10px)', left: 0, right: 0, zIndex: 30, overflow: 'hidden', maxHeight: 420, overflowY: 'auto' }}>
              {active && searching && <Hint>Searching&hellip;</Hint>}
              {active && !searching && res.teams.length === 0 && res.leagues.length === 0 && <Hint>No matches for &ldquo;{q.trim()}&rdquo;</Hint>}

              {active && res.teams.slice(0, 6).map(t => (
                <ResultRow key={t.clubId} onPick={() => go(t.clubName, teamPath(t.clubId))}
                  left={<TeamLogo name={t.clubName} size={30} />} title={t.clubName} sub={`#${t.rank} nationally · ${t.leagueName} · ${t.state}`} />
              ))}
              {active && res.leagues.slice(0, 4).map(l => (
                <ResultRow key={l.id} onPick={() => go(l.name, leaguePath(l.id))}
                  left={<span className="font-condensed" style={{ fontSize: 10.5, color: CYANISH, fontWeight: 800, letterSpacing: '0.08em', width: 30, textAlign: 'center' }}>{l.state}</span>}
                  title={l.name} sub="League profile, ladder and ranked clubs" />
              ))}

              {!active && recents.length > 0 && (
                <>
                  <GroupLabel icon={<Clock3 size={11} aria-hidden />}>Recent</GroupLabel>
                  {recents.map(r => <ResultRow key={r.path} onPick={() => go(r.label, r.path)} title={r.label} sub="Search again" />)}
                </>
              )}
              {!active && trendingClubs.length > 0 && (
                <>
                  <GroupLabel icon={<Flame size={11} aria-hidden />}>Trending clubs</GroupLabel>
                  {trendingClubs.map(e => (
                    <ResultRow key={e.clubId} onPick={() => go(e.clubName, teamPath(e.clubId))}
                      left={<TeamLogo name={e.clubName} size={30} />} title={e.clubName} sub={`Up ${e.rankMovement} to #${e.rank} this week`} />
                  ))}
                </>
              )}
              {!active && trendingLeagues.length > 0 && (
                <>
                  <GroupLabel>Strongest leagues</GroupLabel>
                  {trendingLeagues.map(l => (
                    <ResultRow key={l.id} onPick={() => go(l.name, leaguePath(l.id))}
                      left={<span className="font-condensed" style={{ fontSize: 10.5, color: CYANISH, fontWeight: 800, width: 30, textAlign: 'center' }}>{l.state}</span>}
                      title={l.name} sub={`${l.clubCount} clubs`} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </Reveal>
    </Section>
  )
}

function ResultRow({ left, title, sub, onPick }: { left?: React.ReactNode; title: string; sub: string; onPick: () => void }) {
  return (
    <button onClick={onPick} className="gn-row" role="option" aria-selected={false}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', font: 'inherit', color: TEXT, borderBottom: `1px solid ${LINE}` }}>
      {left && <span style={{ display: 'grid', placeItems: 'center', flexShrink: 0 }}>{left}</span>}
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 700, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
        <span className="font-condensed" style={{ display: 'block', color: MUTE, fontSize: 12, letterSpacing: '0.03em' }}>{sub}</span>
      </span>
    </button>
  )
}
function GroupLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="font-condensed" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px 7px', fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: FAINT, background: '#fbfaf8' }}>
      {icon}{children}
    </div>
  )
}
function Hint({ children }: { children: React.ReactNode }) {
  return <div className="font-condensed" style={{ padding: '24px 20px', color: MUTE, fontSize: 13, letterSpacing: '0.06em', textAlign: 'center' }}>{children}</div>
}
