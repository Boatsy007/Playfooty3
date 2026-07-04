/**
 * Got Netty News — content model, sample editorial content, and query helpers.
 * ─────────────────────────────────────────────────────────────────────────────
 * Completely isolated from the rest of the app. Ships with sample articles for
 * launch; the shape is future-ready (video/podcast/gallery/author/coach fields,
 * club/league/state tagging, submissions) so it can scale to 10,000+ articles
 * and swap the in-memory source for an API/CMS with no UI changes.
 */

export type CategoryId =
  | 'rankings' | 'championship' | 'club-news' | 'league-news' | 'state-news'
  | 'transfers' | 'player-spotlight' | 'coach-spotlight' | 'history'
  | 'opinion' | 'community' | 'grassroots'

export interface Category { id: CategoryId; label: string; accent: string; blurb: string }

export const CATEGORIES: Category[] = [
  { id: 'rankings',        label: 'Rankings',        accent: '#ff2c91', blurb: 'Every movement on the national leaderboard.' },
  { id: 'championship',    label: 'Championship',    accent: '#f4c14d', blurb: 'The road to the Gold Coast.' },
  { id: 'club-news',       label: 'Club News',       accent: '#ff2c91', blurb: 'From the clubrooms up.' },
  { id: 'league-news',     label: 'League News',     accent: '#4dd9f4', blurb: 'Competitions across the country.' },
  { id: 'state-news',      label: 'State News',      accent: '#4dd9f4', blurb: 'State by state.' },
  { id: 'transfers',       label: 'Transfers',       accent: '#ff2c91', blurb: 'Ins, outs and signings.' },
  { id: 'player-spotlight',label: 'Player Spotlight',accent: '#f4c14d', blurb: 'The players shaping the season.' },
  { id: 'coach-spotlight', label: 'Coach Spotlight', accent: '#f4c14d', blurb: 'Minds behind the teams.' },
  { id: 'history',         label: 'History',         accent: '#b8860b', blurb: 'The stories that built the game.' },
  { id: 'opinion',         label: 'Opinion',         accent: '#111111', blurb: 'Analysis and argument.' },
  { id: 'community',       label: 'Community',        accent: '#4dd9f4', blurb: 'The heart of country netball.' },
  { id: 'grassroots',      label: 'Grassroots',       accent: '#22c55e', blurb: 'Where it all begins.' },
]

export const categoryOf = (id: CategoryId) => CATEGORIES.find(c => c.id === id)!

export interface Author { name: string; role: string }

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string }
  | { type: 'quote'; text: string; cite?: string }
  | { type: 'image'; seed: string; caption?: string }

export interface Article {
  slug: string
  title: string
  subtitle: string
  category: CategoryId
  author: Author
  date: string            // ISO
  readingTime: number     // minutes
  summary: string
  heroSeed: string        // deterministic editorial image seed (swap for real URL later)
  heroCredit?: string
  body: Block[]
  gallery?: { seed: string; caption?: string }[]
  tags: { state?: string; league?: string; leagueId?: string; club?: string; clubId?: string }
  featured?: boolean
  trending?: boolean
  mostRead?: boolean
  breaking?: boolean
}

// ── Sample editorial content ────────────────────────────────────────────────
const A = (a: Article) => a
export const ARTICLES: Article[] = [
  A({
    slug: 'geelong-amateur-move-to-number-one',
    title: 'Geelong Amateur surge to national #1',
    subtitle: 'A statement weekend lifts the Bellarine powerhouse to the top of the country for the first time.',
    category: 'rankings', author: { name: 'Marla Prentice', role: 'National Rankings Editor' },
    date: '2026-07-02', readingTime: 5, featured: true, trending: true, mostRead: true, breaking: true,
    heroSeed: 'geelong-amateur', heroCredit: 'Got Netty / Match Day',
    summary: 'Geelong Amateur have claimed top spot on the national leaderboard after a dominant Bellarine FNL performance pushed their power rating clear of the field.',
    tags: { state: 'VIC', league: 'Bellarine FNL - A Grade Netball', club: 'Geelong Amateur' },
    body: [
      { type: 'p', text: 'For the first time in the national era, Geelong Amateur sit alone at the summit of country netball. A commanding weekend on the Bellarine peninsula has done what months of consistency had been building toward.' },
      { type: 'quote', text: 'We don’t talk about rankings inside the group — but the standard we hold ourselves to is exactly what put us here.', cite: 'Geelong Amateur A Grade coach' },
      { type: 'p', text: 'The result reshapes the top of the leaderboard heading into the back half of the season, with the chasing pack closing in.' },
      { type: 'h', text: 'What it means for the run home' },
      { type: 'p', text: 'At the top of the national leaderboard, every percentage point matters. Geelong Amateur’s rise tightens the squeeze on the clubs chasing them.' },
    ],
    gallery: [{ seed: 'ga-1', caption: 'Centre pass under lights.' }, { seed: 'ga-2', caption: 'The huddle.' }],
  }),
  A({
    slug: 'wildcard-invitations-announced',
    title: 'Wildcard invitations: how the last spots open up',
    subtitle: 'When a qualified club declines, the door swings open for the teams on the edge.',
    category: 'championship', author: { name: 'Dan Whitely', role: 'Championship Reporter' },
    date: '2026-07-01', readingTime: 4, featured: true, trending: true, breaking: true,
    heroSeed: 'wildcard', summary: 'The wildcard mechanism explained — and the clubs best placed to benefit if a top-32 side steps aside.',
    tags: { state: 'National' },
    body: [
      { type: 'p', text: 'Not every qualified club will make the trip. When they don’t, a wildcard opens to the next eligible team — and a season can pivot on it.' },
      { type: 'quote', text: 'You prepare like you’re going, because you might be.', cite: 'A bubble-team captain' },
      { type: 'p', text: 'Here’s how the invitations cascade, and who is watching the phone most closely.' },
    ],
  }),
  A({
    slug: 'championship-schedule-released',
    title: 'Championship schedule released for the Gold Coast',
    subtitle: 'Four days, one national title — the full running order is here.',
    category: 'championship', author: { name: 'Dan Whitely', role: 'Championship Reporter' },
    date: '2026-06-30', readingTime: 3, trending: true, breaking: true,
    heroSeed: 'schedule', summary: 'The complete Championship schedule, venues and marquee match windows for the Gold Coast finals.',
    tags: { state: 'National' },
    body: [
      { type: 'p', text: 'The wait is over. Organisers have confirmed the four-day running order for the national Championship on the Gold Coast.' },
      { type: 'p', text: 'Marquee windows have been reserved for the highest-ranked qualifiers, with the decider slated for the final evening.' },
    ],
  }),
  A({
    slug: 'weekend-round-wrap',
    title: 'Weekend Round Wrap: movers, upsets and the bubble',
    subtitle: 'Everything that shifted the national picture this weekend, in one place.',
    category: 'rankings', author: { name: 'Marla Prentice', role: 'National Rankings Editor' },
    date: '2026-06-29', readingTime: 6, mostRead: true, breaking: true,
    heroSeed: 'roundwrap', summary: 'The biggest risers, the shock results and the clubs on the move after a huge round.',
    tags: { state: 'National' },
    body: [
      { type: 'p', text: 'A round that rearranged the leaderboard from top to bubble. We break down who moved, who slipped, and who is now staring at the cut-off line.' },
      { type: 'h', text: 'Risers' },
      { type: 'p', text: 'Percentage did the heavy lifting for several clubs who won ugly but won big.' },
      { type: 'h', text: 'The bubble' },
      { type: 'p', text: 'Three clubs separated by less than a rating point will define the coming fortnight.' },
    ],
  }),
  A({
    slug: 'drouin-sign-marquee-midcourter',
    title: 'Transfer: Drouin land marquee midcourter',
    subtitle: 'A Gippsland League statement signing reshapes the centre third.',
    category: 'transfers', author: { name: 'Priya Nand', role: 'Transfers Desk' },
    date: '2026-06-28', readingTime: 3, trending: true,
    heroSeed: 'drouin-signing', summary: 'Drouin have secured one of the most sought-after midcourters in the region ahead of a Championship push.',
    tags: { state: 'VIC', league: 'Gippsland League - A Grade Netball', club: 'Drouin' },
    body: [
      { type: 'p', text: 'Drouin have moved early and decisively, adding a marquee midcourter who instantly lifts their ceiling.' },
      { type: 'quote', text: 'The pull of a Championship run is real. This group is going somewhere.', cite: 'The incoming midcourter' },
    ],
  }),
  A({
    slug: 'player-spotlight-goal-machine',
    title: 'Player Spotlight: the shooter rewriting the record books',
    subtitle: 'Inside the season that has the whole country watching one goal circle.',
    category: 'player-spotlight', author: { name: 'Erin Colley', role: 'Features Writer' },
    date: '2026-06-27', readingTime: 7, mostRead: true,
    heroSeed: 'spotlight-shooter', summary: 'Accuracy, volume and nerve — a deep dive on the shooter putting up numbers country netball has rarely seen.',
    tags: { state: 'VIC', league: 'Geelong & District FNL - A Grade Netball' },
    body: [
      { type: 'p', text: 'Some seasons demand a closer look. This is one of them.' },
      { type: 'quote', text: 'I just try to make the next one. That’s the whole game, really.', cite: 'The featured shooter' },
      { type: 'p', text: 'Behind the tally is a training week built on repetition and ruthless self-review.' },
    ],
    gallery: [{ seed: 'sp-1' }, { seed: 'sp-2' }, { seed: 'sp-3' }],
  }),
  A({
    slug: 'coach-spotlight-the-system',
    title: 'Coach Spotlight: the system behind the surge',
    subtitle: 'How a defensive blueprint turned a mid-table side into contenders.',
    category: 'coach-spotlight', author: { name: 'Erin Colley', role: 'Features Writer' },
    date: '2026-06-26', readingTime: 6,
    heroSeed: 'coach', summary: 'A tactical breakdown of the pressure system reshaping one of the season’s best stories.',
    tags: { state: 'VIC', league: 'Geelong FNL - A Grade Netball' },
    body: [
      { type: 'p', text: 'Great defence is a decision made twenty times a quarter. This coach has their group making it every time.' },
      { type: 'p', text: 'We chart the triggers, the rotations and the trust that makes it hold under fatigue.' },
    ],
  }),
  A({
    slug: 'league-news-gippsland-title-race',
    title: 'League News: the Gippsland title race goes down to the wire',
    subtitle: 'Three clubs, two rounds, one ladder that refuses to settle.',
    category: 'league-news', author: { name: 'Sam Reidy', role: 'League Correspondent' },
    date: '2026-06-25', readingTime: 4,
    heroSeed: 'gippsland-race', summary: 'The Gippsland League A Grade race is the tightest it has been in years, with national implications.',
    tags: { state: 'VIC', league: 'Gippsland League - A Grade Netball', club: 'Moe' },
    body: [
      { type: 'p', text: 'The ladder tells one story; the percentage column tells another. Both point to a grandstand finish.' },
    ],
  }),
  A({
    slug: 'club-news-community-day',
    title: 'Club News: the community day that packed the courts',
    subtitle: 'A regional club shows why country netball is more than results.',
    category: 'community', author: { name: 'Jo Fairweather', role: 'Community Editor' },
    date: '2026-06-24', readingTime: 3,
    heroSeed: 'community-day', summary: 'Junior clinics, a packed canteen and a senior side to be proud of — a snapshot of country netball at its best.',
    tags: { state: 'VIC', club: 'Bannockburn' },
    body: [
      { type: 'p', text: 'The scoreboard mattered, but the queue at the canteen mattered more. This is the fabric of the country game.' },
    ],
  }),
  A({
    slug: 'history-the-first-national-era',
    title: 'History: the clubs that shaped the modern game',
    subtitle: 'Before the national leaderboard, there were the dynasties that built the standard.',
    category: 'history', author: { name: 'Ted Marlowe', role: 'Historian' },
    date: '2026-06-22', readingTime: 8,
    heroSeed: 'history', summary: 'A look back at the powerhouse clubs and defining rivalries that set the benchmark country netball now measures itself against.',
    tags: { state: 'National' },
    body: [
      { type: 'p', text: 'Every ranking has a history. This is where the modern standard was forged.' },
      { type: 'quote', text: 'You inherit a jumper and a standard. You don’t get to lower either.', cite: 'A club life member' },
    ],
  }),
  A({
    slug: 'opinion-percentage-is-king',
    title: 'Opinion: percentage is the most honest number in the game',
    subtitle: 'Why margin, not just the win, should shape how we read the ladder.',
    category: 'opinion', author: { name: 'Marla Prentice', role: 'National Rankings Editor' },
    date: '2026-06-20', readingTime: 5,
    heroSeed: 'opinion', summary: 'A case for reading country netball through the lens of margin — and what it reveals about the true contenders.',
    tags: { state: 'National' },
    body: [
      { type: 'p', text: 'Wins tell you who survived. Percentage tells you who dominated. For a national ranking, the difference matters.' },
    ],
  }),
  A({
    slug: 'grassroots-net-set-go-boom',
    title: 'Grassroots: the junior boom reshaping country clubs',
    subtitle: 'Record registrations are changing what regional clubs can become.',
    category: 'grassroots', author: { name: 'Jo Fairweather', role: 'Community Editor' },
    date: '2026-06-18', readingTime: 4,
    heroSeed: 'grassroots', summary: 'From NetSetGo to A Grade, a wave of junior participation is rewriting the future of country netball.',
    tags: { state: 'National' },
    body: [
      { type: 'p', text: 'The pathway starts on a Friday night on a cold court. Right now, those courts have never been busier.' },
    ],
  }),
]

// ── Query helpers ───────────────────────────────────────────────────────────
const byDateDesc = (a: Article, b: Article) => +new Date(b.date) - +new Date(a.date)

// V1 reposition: championship coverage is postponed with the event — its
// sample articles stay in the model but are excluded from every public feed.
const LIVE = ARTICLES.filter(a => a.category !== 'championship')

export const allArticles = () => [...LIVE].sort(byDateDesc)
export const getArticle = (slug: string) => LIVE.find(a => a.slug === slug) ?? null
export const featuredArticles = () => allArticles().filter(a => a.featured)
export const latestArticles = (n = 8) => allArticles().slice(0, n)
export const trendingArticles = (n = 6) => allArticles().filter(a => a.trending).slice(0, n)
export const mostReadArticles = (n = 6) => allArticles().filter(a => a.mostRead).slice(0, n)
export const breakingHeadlines = () => allArticles().filter(a => a.breaking).map(a => ({ slug: a.slug, title: a.title }))
export const articlesInCategory = (id: CategoryId, n = 4) => allArticles().filter(a => a.category === id).slice(0, n)

export function relatedArticles(article: Article, n = 3) {
  return allArticles()
    .filter(a => a.slug !== article.slug)
    .map(a => {
      let score = 0
      if (a.category === article.category) score += 3
      if (article.tags.league && a.tags.league === article.tags.league) score += 4
      if (article.tags.club && a.tags.club === article.tags.club) score += 5
      if (article.tags.state && a.tags.state === article.tags.state) score += 1
      return { a, score }
    })
    .filter(x => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, n)
    .map(x => x.a)
}
export const moreFromLeague = (league: string, exclude: string, n = 3) => allArticles().filter(a => a.tags.league === league && a.slug !== exclude).slice(0, n)
export const moreFromClub = (club: string, exclude: string, n = 3) => allArticles().filter(a => a.tags.club === club && a.slug !== exclude).slice(0, n)

export interface NewsFilters { q?: string; category?: CategoryId | ''; state?: string; league?: string; club?: string }
export function searchArticles(f: NewsFilters) {
  const q = (f.q ?? '').trim().toLowerCase()
  return allArticles().filter(a => {
    if (f.category && a.category !== f.category) return false
    if (f.state && a.tags.state !== f.state) return false
    if (f.league && a.tags.league !== f.league) return false
    if (f.club && a.tags.club !== f.club) return false
    if (q) {
      const hay = `${a.title} ${a.subtitle} ${a.summary} ${a.author.name} ${a.tags.club ?? ''} ${a.tags.league ?? ''} ${categoryOf(a.category).label}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

export const uniqueStates = () => [...new Set(LIVE.map(a => a.tags.state).filter(Boolean) as string[])].sort()
export const uniqueLeagues = () => [...new Set(LIVE.map(a => a.tags.league).filter(Boolean) as string[])].sort()
export const uniqueClubs = () => [...new Set(LIVE.map(a => a.tags.club).filter(Boolean) as string[])].sort()

export function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
}
export const newsPath = (slug: string) => `/news/${slug}`
