/**
 * Manual league-strength overrides (carried into the discovery system).
 * ─────────────────────────────────────────────────────────────────────────────
 * Under the "discovery replaces manual" model, auto-discovery owns every league
 * and computes strength automatically. These are the manual ★ ratings the
 * operator set for specific leagues; discovery re-applies them as
 * manualStrengthOverride so those leagues keep their intended rating while every
 * other league relies on the automatic value.
 *
 * Keyed by a normalised league name (lowercase, alphanumerics only) so it
 * matches regardless of "FNL"/"League"/punctuation formatting.
 */

export function normaliseName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

const OVERRIDES: Record<string, number> = {
  bellarinefnl:            5.0,
  bellarinefnlagradenetball: 5.0,
  gippslandleague:         4.0,
  gippslandleagueagradenetball: 4.0,
  geelonganddistrictfnl:   4.0,
  gdfnl:                   4.0,
  northgippslandfnl:       3.0,
}

/** Manual override (0–5) for a league by name, or null if none is configured. */
export function overrideForLeague(...names: (string | null | undefined)[]): number | null {
  for (const n of names) {
    if (!n) continue
    const key = normaliseName(n)
    if (key in OVERRIDES) return OVERRIDES[key]
  }
  return null
}
