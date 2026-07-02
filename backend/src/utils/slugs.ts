/**
 * SEO slug helpers — one source of truth for the public URL shapes.
 *   club:   /clubs/geelong-amateur-netball-club
 *   league: /leagues/gippsland-league-a-grade-netball
 * Slugs are computed from names and returned in API responses so the frontend
 * never has to reinvent them.
 */

function base(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Club profile slug, e.g. "Geelong Amateur" → "geelong-amateur-netball-club". */
export function clubSlug(name: string): string {
  const b = base(name)
  return /netball-club$/.test(b) ? b : `${b}-netball-club`
}

/** League page slug, e.g. "Gippsland League - A Grade Netball" → "gippsland-league-a-grade-netball". */
export function leagueSlug(name: string): string {
  return base(name)
}
