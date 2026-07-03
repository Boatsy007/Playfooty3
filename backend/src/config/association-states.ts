/**
 * Association → State resolver.
 * ─────────────────────────────────────────────────────────────────────────────
 * PlayHQ's association directory does not reliably expose a state on the card,
 * so the crawler leaves `state = null` and everything falls back to "VIC". This
 * map assigns the correct Australian state to each known association by its
 * (normalised) name, so ranking entries, team profiles and the directory show
 * the real state. Keyed by normalised name; extend as new associations import.
 */

export type StateCode = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'NT' | 'ACT'

const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

// Normalised association name → state. Derived from PlayHQ association locations.
const RAW: Record<string, StateCode> = {
  // ── VIC ──
  'AFL Barwon FNL': 'VIC',
  'AFL Barwon': 'VIC',
  'Gippsland League': 'VIC',
  'North Gippsland FNL': 'VIC',
  'Geelong & District FNL': 'VIC',
  'Colac & District Football & Netball League': 'VIC',
  // ── SA ──
  'Adelaide Metropolitan Netball Division': 'SA',
  'Yorke Peninsula Netball Association': 'SA',
  'KNT Netball Association': 'SA',
  'Mid South East Netball Association': 'SA',
  'Great Flinders Netball Association': 'SA',
  'Mid Hills Netball Association': 'SA',
  'Northern Areas Netball Association': 'SA',
  'Kadina and Districts Netball Association': 'SA',
  'Kangaroo Island Netball Association': 'SA',
  'Limestone Coast Football Netball League': 'SA',
  'Western Eyre Netball Association': 'SA',
  'Eastern Eyre Netball Association': 'SA',
  'Port Augusta Netball Association': 'SA',
  'Port Pirie Netball Association': 'SA',
  // ── WA ──
  'Bridgetown Netball Association': 'WA',
  'Ongerup Netball Association': 'WA',
  'Peel Football and Netball League': 'WA',
  'Port Hedland Netball Association': 'WA',
  // ── NSW ──
  'Wollondilly Netball Association': 'NSW',
  'Liverpool City Netball Association': 'NSW',
  'Mount Druitt Netball Association': 'NSW',
  'Narrabri Netball Association': 'NSW',
  'Southern Districts Netball Association': 'NSW',
  'Tamworth Netball Association': 'NSW',
  // ── TAS ──
  'South Midlands Netball Association': 'TAS',
}

const MAP = new Map<string, StateCode>(Object.entries(RAW).map(([k, v]) => [norm(k), v]))

export const STATE_NAMES: Record<StateCode, string> = {
  NSW: 'New South Wales', VIC: 'Victoria', QLD: 'Queensland', WA: 'Western Australia',
  SA: 'South Australia', TAS: 'Tasmania', NT: 'Northern Territory', ACT: 'Australian Capital Territory',
}

/** Resolve an association name to its state, or null if unknown. */
export function stateForAssociation(name: string | null | undefined): StateCode | null {
  if (!name) return null
  return MAP.get(norm(name)) ?? null
}
