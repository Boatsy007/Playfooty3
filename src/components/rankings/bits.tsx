/**
 * Shared presentational bits for the rankings product — premium dark leaderboard
 * language: form pips, star strength, rank movement, qualification badge, stars.
 */
import { TrendingUp, TrendingDown, Minus, Star } from 'lucide-react'
import type { FormResult } from '../../lib/rankings'

export const INK = '#050914'
export const PANEL = '#0b1428'
export const PANEL_2 = '#0f1c38'
export const LINE = 'rgba(255,255,255,0.08)'
export const PINK = '#ff2c91'
export const GOLD = '#f4c14d'
export const CYAN = '#4dd9f4'
export const MUTE = 'rgba(255,255,255,0.55)'

export function FormPips({ form }: { form: FormResult[] }) {
  if (!form?.length) return <span style={{ color: MUTE, fontSize: 12 }}>—</span>
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {form.slice(-5).map((r, i) => (
        <span key={i} title={r}
          style={{
            width: 20, height: 20, borderRadius: 5, display: 'grid', placeItems: 'center',
            fontSize: 11, fontWeight: 800, color: r === 'W' ? '#04210f' : '#fff',
            background: r === 'W' ? '#37d67a' : r === 'L' ? 'rgba(255,255,255,0.12)' : GOLD,
          }}>{r}</span>
      ))}
    </div>
  )
}

export function StarStrength({ stars, size = 14 }: { stars: number; size?: number }) {
  return (
    <div style={{ display: 'inline-flex', gap: 2 }} aria-label={`${stars} of 5 strength`}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={size}
          fill={n <= stars ? GOLD : 'none'}
          color={n <= stars ? GOLD : 'rgba(255,255,255,0.25)'} strokeWidth={2} />
      ))}
    </div>
  )
}

export function Movement({ current, previous }: { current: number; previous: number | null }) {
  if (previous == null || previous === current)
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: MUTE, fontSize: 12, fontWeight: 700 }}><Minus size={13} /></span>
  const up = previous > current
  const diff = Math.abs(previous - current)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: up ? '#37d67a' : '#ff6b6b', fontSize: 12, fontWeight: 800 }}>
      {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{diff}
    </span>
  )
}

export function QualBadge({ qualified, small }: { qualified: boolean; small?: boolean }) {
  return (
    <span className="font-condensed" style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
      fontSize: small ? 10 : 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
      padding: small ? '3px 8px' : '5px 12px', borderRadius: 999,
      color: qualified ? GOLD : MUTE,
      background: qualified ? 'rgba(244,193,77,0.12)' : 'rgba(255,255,255,0.05)',
      border: `1px solid ${qualified ? 'rgba(244,193,77,0.35)' : LINE}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: qualified ? GOLD : 'rgba(255,255,255,0.3)' }} />
      {qualified ? 'Qualified' : 'Outside cut'}
    </span>
  )
}

export function Label({ children }: { children: React.ReactNode }) {
  return <div className="font-condensed" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.24em', textTransform: 'uppercase', color: MUTE }}>{children}</div>
}
