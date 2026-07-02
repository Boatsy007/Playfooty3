/**
 * Club Editorial Profiles
 * ─────────────────────────────────────────────────────────────────────────────
 * Hand-curated content for a club's profile page — the things PlayHQ doesn't
 * give us: contact details, a bio/history, home ground, honours, etc.
 *
 * Keyed by the club's slug (e.g. "drouin-gfl", "geelong-amateur-bfnl"). Every
 * field is optional — provide as much or as little as you have. The profile API
 * merges this over the live scraped stats.
 *
 * To add a club: copy the template below, set the slug, fill in what you know.
 *   'drouin-gfl': {
 *     bio: 'Drouin Netball Club fields teams across all grades in the Gippsland League…',
 *     foundedYear: 1954,
 *     homeGround: 'Drouin Recreation Reserve',
 *     contactName: 'Jane Smith (Secretary)',
 *     contactEmail: 'secretary@drouinnc.com.au',
 *     contactPhone: '0400 000 000',
 *     honours: ['2019 A Grade Premiers', '2021 A Grade Premiers'],
 *   },
 */

export interface ClubProfileContent {
  bio?:          string
  history?:      string
  foundedYear?:  number
  homeGround?:   string
  contactName?:  string
  contactEmail?: string
  contactPhone?: string
  honours?:      string[]
}

export const CLUB_PROFILES: Record<string, ClubProfileContent> = {
  // Add clubs here, keyed by slug. Example:
  // 'drouin-gfl': {
  //   bio: '…',
  //   homeGround: 'Drouin Recreation Reserve',
  //   contactEmail: 'secretary@example.com',
  //   honours: ['2019 A Grade Premiers'],
  // },
}

/** Look up editorial content for a club slug (returns an empty object if none). */
export function profileContentFor(slug: string): ClubProfileContent {
  return CLUB_PROFILES[slug] ?? {}
}
