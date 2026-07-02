/**
 * CNCA National Power Rankings
 * Editorial weekly rankings — designed for future live-data integration.
 * Live data fetched from /api/top10 on mount.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Minus, Share2, ChevronDown, ChevronRight,
  Target, Zap, Shield, Trophy, BarChart2, Star, Clock, Filter, X,
  ArrowRight, Info
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Nav from '../components/layout/Nav'
import Ticker from '../components/layout/Ticker'
import Footer from '../components/layout/Footer'

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

// ─────────────────────────────────────────────────────────────────────────────
// DATA TYPES — structured for future DB / API integration
// ─────────────────────────────────────────────────────────────────────────────
type FormResult = 'W' | 'L' | 'D'

interface RankedClub {
  id: string
  rank: number
  previousRank: number
  name: string
  league: string
  state: string
  region: string
  powerRating: number
  record: { wins: number; losses: number; draws: number }
  form: FormResult[]
  goalsFor: number
  goalsAgainst: number
  leagueStrength: number   // 1–5
  accent: string
  tag?: string             // e.g. "Defending Champions"
}

interface RankingFactor {
  label: string
  weight: number           // 0–100 display weight
  description: string
  icon: React.ElementType
  accent: string
}

interface WeeklyAnalysis {
  headline: string
  body: string
  tag: string
  accent: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Live data — fetched from /api/top10 on mount
// ─────────────────────────────────────────────────────────────────────────────

let WEEK_LABEL = 'Loading...'
let UPDATED    = ''

const ACCENT_PALETTE = ['#ff2c91', '#f4c14d', '#4dd9f4'] as const

interface ApiEntry {
  rank:            number
  previousRank:    number | null
  rankMovement:    number
  clubId:          string
  clubName:        string
  leagueName:      string
  state:           string
  powerRating:     number
  recentForm:      string[]
  componentScores: Record<string, number>
  calculatedAt:    string
}

function mapApiEntry(entry: ApiEntry, index: number): RankedClub {
  const accent = ACCENT_PALETTE[index % ACCENT_PALETTE.length]
  const leagueStrengthRaw = entry.componentScores?.leagueStrength ?? 58
  const leagueStrength = Math.max(1, Math.min(5, Math.round(leagueStrengthRaw / 20)))
  const prevRank = entry.previousRank != null
    ? entry.previousRank
    : entry.rank - entry.rankMovement || entry.rank
  return {
    id:           entry.clubId,
    rank:         entry.rank,
    previousRank: prevRank,
    name:         entry.clubName,
    league:       entry.leagueName,
    state:        entry.state,
    region:       entry.state,
    powerRating:  Math.round(entry.powerRating * 100) / 100,
    record:       { wins: 0, losses: 0, draws: 0 },
    form:         entry.recentForm as FormResult[],
    goalsFor:     0,
    goalsAgainst: 0,
    leagueStrength,
    accent,
  }
}

const RANKING_FACTORS: RankingFactor[] = [
  { label: 'Win Rate',              weight: 92, description: 'Wins divided by total games played this season.',              icon: Trophy,   accent: '#ff2c91' },
  { label: 'League Strength',       weight: 85, description: 'Assessed rating of the competition your club plays in.',       icon: Shield,   accent: '#f4c14d' },
  { label: 'Scoring Margin',        weight: 78, description: 'Average point differential across all games this season.',     icon: BarChart2, accent: '#4dd9f4' },
  { label: 'Goals For',             weight: 72, description: 'Total attacking output across the season.',                    icon: Target,   accent: '#ff2c91' },
  { label: 'Goals Against',         weight: 68, description: 'Defensive quality — lower is better.',                        icon: Shield,   accent: '#f4c14d' },
  { label: 'Recent Form',           weight: 80, description: 'Performance weighting of last 5 games, most recent heaviest.', icon: Zap,      accent: '#4dd9f4' },
  { label: 'Finals Performance',    weight: 60, description: 'Historical finals record including premiership wins.',          icon: Star,     accent: '#ff2c91' },
  { label: 'Consistency',           weight: 55, description: 'Low variance in results — clubs that win AND cover margins.',  icon: BarChart2, accent: '#f4c14d' },
  { label: 'Strength of Opp.',      weight: 65, description: 'Calibre of teams defeated — a win vs top-5 weighs more.',     icon: Target,   accent: '#4dd9f4' },
  { label: 'Premiership Bonus',     weight: 40, description: 'A Grade premiership clubs receive a verified excellence bonus.', icon: Trophy, accent: '#ff2c91' },
]

const WEEKLY_ANALYSIS: WeeklyAnalysis[] = [
  {
    tag: 'Form Guide',
    headline: 'Why Dubbo Moves To #1',
    body: 'An unblemished 14–0 record combined with the highest scoring margin in the Western Plains competition has finally propelled Dubbo to the top spot. Their average winning margin of +23.6 is unprecedented in this year\'s top 10.',
    accent: '#ff2c91',
  },
  {
    tag: 'Biggest Surprise',
    headline: 'Toowoomba\'s Rise Is No Accident',
    body: 'Jumping two places to #3, the Storm have quietly built the strongest attack outside the top 2. Their Darling Downs competition has been assessed as a Tier 4 league this season — an upgrade that lifted their power rating significantly.',
    accent: '#f4c14d',
  },
  {
    tag: 'Watch List',
    headline: 'Launceston Knocking On The Door',
    body: 'Rising to #9 from #11, Launceston\'s Northern Tasmanian competition doesn\'t always get the recognition it deserves. Four wins from their last five, combined with a goals-against ratio improving each week, makes them a genuine top-5 threat.',
    accent: '#4dd9f4',
  },
]

const STATE_FILTERS = ['All States', 'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT']
const STRENGTH_FILTERS = ['All Strengths', '★★★★★', '★★★★', '★★★', '★★', '★']
const FORM_FILTERS = ['All Form', 'WWWWW', 'W Last 5', 'L Last Game']

const COMING_SOON = [
  { title: 'Top 25',              desc: 'Extended rankings covering the next 15 clubs outside the top 10.',    accent: '#ff2c91' },
  { title: 'Top 50',              desc: 'Full national coverage across every active country netball league.',    accent: '#f4c14d' },
  { title: 'State Rankings',      desc: 'Separate power rankings for each Australian state and territory.',      accent: '#4dd9f4' },
  { title: 'Historical Rankings', desc: 'Season-by-season power rating history for every tracked club.',        accent: '#ff2c91' },
  { title: 'Defensive Rankings',  desc: 'Ranking clubs by defensive efficiency, goals against and lock-down rate.', accent: '#f4c14d' },
  { title: 'Attack Rankings',     desc: 'Goals for, shooting percentage and attack consistency across all clubs.', accent: '#4dd9f4' },
]

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function Movement({ current, previous }: { current: number; previous: number }) {
  const diff = previous - current  // positive = moved up
  if (diff === 0) {
    return (
      <div className="flex items-center gap-1">
        <Minus size={11} style={{ color: 'rgba(255,255,255,0.25)' }} />
        <span className="font-condensed font-bold text-[10px] tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>
      </div>
    )
  }
  const isUp = diff > 0
  return (
    <div className="flex items-center gap-1">
      {isUp
        ? <TrendingUp size={11} style={{ color: '#22c55e' }} />
        : <TrendingDown size={11} style={{ color: '#ef4444' }} />
      }
      <span className="font-condensed font-bold text-[10px] tracking-[0.1em]" style={{ color: isUp ? '#22c55e' : '#ef4444' }}>
        {isUp ? `+${diff}` : diff}
      </span>
    </div>
  )
}

function FormPills({ form }: { form: FormResult[] }) {
  return (
    <div className="flex items-center gap-1">
      {form.map((r, i) => (
        <div
          key={i}
          className="w-5 h-5 rounded-full flex items-center justify-center"
          style={{
            background: r === 'W' ? 'rgba(34,197,94,0.2)' : r === 'L' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)',
            border: `1.5px solid ${r === 'W' ? '#22c55e' : r === 'L' ? '#ef4444' : 'rgba(255,255,255,0.2)'}`,
          }}
        >
          <span className="font-condensed font-bold text-[8px]" style={{ color: r === 'W' ? '#22c55e' : r === 'L' ? '#ef4444' : 'rgba(255,255,255,0.4)' }}>
            {r}
          </span>
        </div>
      ))}
    </div>
  )
}

function LeagueStrengthBar({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width: '6px', height: '6px',
            background: i < n ? '#f4c14d' : 'rgba(255,255,255,0.1)',
            boxShadow: i < n ? '0 0 6px rgba(244,193,77,0.5)' : 'none',
          }}
        />
      ))}
    </div>
  )
}

function RatingRing({ value }: { value: number }) {
  const circumference = 2 * Math.PI * 38
  const offset = circumference * (1 - value / 100)
  return (
    <div className="relative w-[90px] h-[90px] flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="90" height="90">
        <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
        <circle
          cx="45" cy="45" r="38" fill="none"
          stroke="#ff2c91" strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <span className="font-display text-white" style={{ fontSize: '1.3rem', lineHeight: 1 }}>{value}</span>
    </div>
  )
}

function PercentageBar({ value, accent }: { value: number; accent: string }) {
  return (
    <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)', minWidth: '80px' }}>
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${value}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1, delay: 0.2, ease }}
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: accent, boxShadow: `0 0 8px ${accent}60` }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────────────────────────────────────
function RankingsHero({ onScrollToTop10, onScrollToMethod, clubs }: { onScrollToTop10: () => void; onScrollToMethod: () => void; clubs: RankedClub[] }) {
  const prefersReduced = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '18%'])
  const [tick, setTick] = useState(0)

  // Subtle animated gradient ticker
  useEffect(() => {
    if (prefersReduced) return
    const id = setInterval(() => setTick(t => t + 1), 3000)
    return () => clearInterval(id)
  }, [prefersReduced])

  return (
    <section ref={ref} className="relative overflow-hidden flex flex-col" style={{ minHeight: '100svh' }}>
      {/* Animated dark gradient BG */}
      <motion.div
        className="absolute inset-0"
        style={prefersReduced ? undefined : { y: bgY }}
      >
        <div className="absolute inset-0" style={{ background: '#0a0a0a' }} />
        <motion.div
          className="absolute inset-0"
          animate={prefersReduced ? {} : { opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ background: 'radial-gradient(ellipse 70% 60% at 20% 50%, rgba(255,44,145,0.07) 0%, transparent 70%)' }}
        />
        <motion.div
          className="absolute inset-0"
          animate={prefersReduced ? {} : { opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          style={{ background: 'radial-gradient(ellipse 50% 70% at 80% 30%, rgba(244,193,77,0.05) 0%, transparent 65%)' }}
        />
        {/* Grid overlay */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      </motion.div>

      {/* Floating rank numbers in background */}
      {!prefersReduced && [1,2,3,4,5].map((n, i) => (
        <motion.div
          key={n}
          className="absolute font-display select-none pointer-events-none"
          style={{
            fontSize: 'clamp(8rem, 20vw, 18rem)',
            color: 'rgba(255,255,255,0.015)',
            right: `${5 + i * 18}%`,
            top: `${10 + (i % 3) * 25}%`,
            lineHeight: 1,
          }}
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 6 + i * 1.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.8 }}
        >
          {n}
        </motion.div>
      ))}

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end flex-1 px-6 sm:px-10 lg:px-16 pb-16 lg:pb-24 max-w-6xl mx-auto w-full">

        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease }}
          className="flex items-center gap-3 mb-7"
        >
          <div className="w-6 h-[1.5px]" style={{ background: '#ff2c91' }} />
          <span className="font-condensed font-bold tracking-[0.28em] uppercase text-[10px]" style={{ color: '#f4c14d' }}>
            CNCA National Power Rankings · {WEEK_LABEL}
          </span>
          <AnimatePresence mode="wait">
            <motion.div
              key={tick}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
              <span className="font-condensed font-bold text-[8px] tracking-[0.2em] uppercase" style={{ color: '#22c55e' }}>Live</span>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Headline */}
        <div className="overflow-hidden mb-2">
          <motion.h1
            initial={{ y: '105%' }}
            animate={{ y: '0%' }}
            transition={{ duration: 0.85, delay: 0.2, ease }}
            className="font-display text-white leading-[0.88]"
            style={{ fontSize: 'clamp(3rem, 10vw, 10rem)' }}
          >
            NATIONAL POWER
          </motion.h1>
        </div>
        <div className="overflow-hidden mb-8">
          <motion.span
            initial={{ y: '105%' }}
            animate={{ y: '0%' }}
            transition={{ duration: 0.85, delay: 0.32, ease }}
            className="block font-display leading-[0.88]"
            style={{ fontSize: 'clamp(3rem, 10vw, 10rem)', color: '#ff2c91' }}
          >
            RANKINGS.
          </motion.span>
        </div>

        {/* Sub copy */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease }}
          className="mb-2"
        >
          <p style={{ fontSize: 'clamp(1rem, 1.8vw, 1.25rem)', color: 'rgba(255,255,255,0.5)', fontWeight: 500, lineHeight: 1.5 }}>
            Australia's strongest country netball clubs.
          </p>
          <p style={{ fontSize: 'clamp(1rem, 1.8vw, 1.25rem)', color: '#ff2c91', fontWeight: 600, lineHeight: 1.5 }}>
            Powered by performance. Not reputation.
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.62, ease }}
          className="mb-10 font-condensed font-bold text-[10px] tracking-[0.22em] uppercase"
          style={{ color: 'rgba(255,255,255,0.2)' }}
        >
          Updated every Monday · {UPDATED}
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.7, ease }}
          className="flex flex-wrap items-center gap-4"
        >
          <button
            onClick={onScrollToTop10}
            className="font-bold rounded-full text-white text-sm tracking-wide transition-all flex items-center gap-2"
            style={{
              background: '#ff2c91',
              padding: '0.85rem 2.2rem',
              boxShadow: '0 4px 32px rgba(255,44,145,0.35)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#cc1f6e'
              e.currentTarget.style.boxShadow = '0 8px 48px rgba(255,44,145,0.5)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#ff2c91'
              e.currentTarget.style.boxShadow = '0 4px 32px rgba(255,44,145,0.35)'
            }}
          >
            View Top 10 <ChevronDown size={14} />
          </button>
          <button
            onClick={onScrollToMethod}
            className="font-bold rounded-full text-sm tracking-wide flex items-center gap-2 transition-all"
            style={{
              border: '1.5px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.7)',
              padding: '0.85rem 2.2rem',
              background: 'rgba(255,255,255,0.04)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.55)'
              e.currentTarget.style.color = '#ffffff'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
            }}
          >
            How Rankings Work <ChevronRight size={14} />
          </button>
        </motion.div>
      </div>

      {/* Bottom ticker strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.1, ease }}
        className="relative z-10 overflow-hidden"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-8 px-6 sm:px-10 py-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {clubs.slice(0, 5).map(club => (
            <div key={club.id} className="flex items-center gap-2.5 shrink-0">
              <span className="font-condensed font-bold text-[10px] tracking-[0.12em]" style={{ color: '#f4c14d' }}>#{club.rank}</span>
              <span className="font-condensed font-bold text-[10px] tracking-[0.1em] uppercase text-white/60">{club.name}</span>
              <span className="font-condensed font-bold text-[10px]" style={{ color: club.powerRating >= 80 ? '#ff2c91' : 'rgba(255,255,255,0.3)' }}>{club.powerRating}</span>
              <Movement current={club.rank} previous={club.previousRank} />
            </div>
          ))}
          {clubs.length === 0 && (
            <div className="shrink-0 font-condensed font-bold text-[9px] tracking-[0.25em] uppercase" style={{ color: 'rgba(255,255,255,0.15)' }}>
              Loading rankings...
            </div>
          )}
        </div>
      </motion.div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURED #1 CLUB
// ─────────────────────────────────────────────────────────────────────────────
function FeaturedClub({ club }: { club: RankedClub }) {
  const prefersReduced = useReducedMotion()
  const totalGoals = club.goalsFor + club.goalsAgainst
  const totalGames = club.record.wins + club.record.losses + club.record.draws
  const pct = totalGoals > 0 ? ((club.goalsFor / totalGoals) * 100).toFixed(1) : '–'
  const avgMarginNum = totalGames > 0 ? ((club.goalsFor - club.goalsAgainst) / totalGames).toFixed(1) : null
  const avgMargin = avgMarginNum != null ? (parseFloat(avgMarginNum) >= 0 ? `+${avgMarginNum}` : avgMarginNum) : '–'

  return (
    <section id="featured" style={{ background: '#111111' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 lg:py-24">

        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease }}
          className="flex items-center gap-4 mb-10"
        >
          <p className="font-condensed font-bold tracking-[0.28em] text-[10px] uppercase" style={{ color: '#f4c14d' }}>
            Current #1 · {WEEK_LABEL}
          </p>
          <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <span className="font-condensed font-bold text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,44,145,0.12)', color: '#ff2c91', border: '1px solid rgba(255,44,145,0.3)' }}>
            Live Rankings · NGFNL 2026 Pilot
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease }}
          className="relative rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1a0a12 0%, #0f0f0f 50%, #0a1a0f 100%)',
            border: '1px solid rgba(255,44,145,0.15)',
            boxShadow: '0 0 80px rgba(255,44,145,0.08)',
          }}
        >
          {/* Top pink line */}
          <div style={{ height: '3px', background: 'linear-gradient(to right, #ff2c91, #f4c14d, transparent)' }} />

          {/* Glow effects */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 80% at 0% 50%, rgba(255,44,145,0.06) 0%, transparent 60%)' }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 40% 60% at 100% 20%, rgba(244,193,77,0.04) 0%, transparent 55%)' }} />

          <div className="relative p-8 sm:p-10 lg:p-14 grid lg:grid-cols-[1fr,auto] gap-10 items-start">

            {/* Left */}
            <div>
              {/* Rank badge */}
              <div className="flex items-center gap-4 mb-8">
                <div
                  className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(255,44,145,0.12)', border: '1px solid rgba(255,44,145,0.25)' }}
                >
                  <span className="font-display text-white" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', lineHeight: 1 }}>1</span>
                </div>
                <div>
                  <p className="font-condensed font-bold text-[10px] tracking-[0.25em] uppercase mb-1" style={{ color: 'rgba(255,44,145,0.7)' }}>
                    National #1 · Power Rankings
                  </p>
                  <div className="flex items-center gap-2">
                    <Movement current={club.rank} previous={club.previousRank} />
                    <span className="font-condensed font-bold text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>from #{club.previousRank} last week</span>
                  </div>
                </div>
              </div>

              {/* Club name */}
              <h2 className="font-display text-white leading-none mb-2" style={{ fontSize: 'clamp(2.2rem, 6vw, 5.5rem)' }}>
                {club.name.toUpperCase()}
              </h2>
              <p className="font-condensed font-bold text-[11px] tracking-[0.22em] uppercase mb-8" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {club.league} · {club.state} · {club.region}
              </p>

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-0" style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: '1rem', overflow: 'hidden' }}>
                {[
                  { label: 'Record',     value: totalGames > 0 ? `${club.record.wins}–${club.record.losses}` : `${club.form.filter(r => r === 'W').length}–${club.form.filter(r => r === 'L').length}` },
                  { label: 'Goals For', value: club.goalsFor > 0 ? club.goalsFor.toString() : '–' },
                  { label: 'Goals Ag.', value: club.goalsAgainst > 0 ? club.goalsAgainst.toString() : '–' },
                  { label: 'Avg. Margin', value: avgMargin },
                ].map(({ label, value }, i) => (
                  <div
                    key={label}
                    className="px-5 py-4"
                    style={{ borderRight: i < 3 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}
                  >
                    <p className="font-condensed font-bold text-[9px] tracking-[0.22em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</p>
                    <p className="font-display text-white" style={{ fontSize: 'clamp(1.2rem, 3vw, 2rem)' }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Form + league strength */}
              <div className="flex flex-wrap items-center gap-6 mt-6">
                <div>
                  <p className="font-condensed font-bold text-[9px] tracking-[0.22em] uppercase mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Current Form</p>
                  <FormPills form={club.form} />
                </div>
                <div>
                  <p className="font-condensed font-bold text-[9px] tracking-[0.22em] uppercase mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>League Strength</p>
                  <LeagueStrengthBar n={club.leagueStrength} />
                </div>
                <div>
                  <p className="font-condensed font-bold text-[9px] tracking-[0.22em] uppercase mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Attack %</p>
                  <span className="font-display text-white" style={{ fontSize: '1rem' }}>{pct}%</span>
                </div>
              </div>
            </div>

            {/* Right — power rating */}
            <div className="flex flex-col items-center gap-3 lg:pt-4">
              <p className="font-condensed font-bold text-[9px] tracking-[0.25em] uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>Power Rating</p>
              <RatingRing value={club.powerRating} />
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,44,145,0.1)', border: '1px solid rgba(255,44,145,0.2)' }}>
                <Star size={9} fill="#f4c14d" color="#f4c14d" />
                <span className="font-condensed font-bold text-[9px] tracking-[0.18em] uppercase" style={{ color: '#f4c14d' }}>National Leader</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER BAR
// ─────────────────────────────────────────────────────────────────────────────
function FilterBar({
  stateFilter, setStateFilter,
  formFilter, setFormFilter,
  strengthFilter, setStrengthFilter,
  count,
}: {
  stateFilter: string; setStateFilter: (v: string) => void
  formFilter: string; setFormFilter: (v: string) => void
  strengthFilter: string; setStrengthFilter: (v: string) => void
  count: number
}) {
  const [open, setOpen] = useState(false)

  const activeCount = [stateFilter !== 'All States', formFilter !== 'All Form', strengthFilter !== 'All Strengths'].filter(Boolean).length

  const reset = () => {
    setStateFilter('All States')
    setFormFilter('All Form')
    setStrengthFilter('All Strengths')
  }

  return (
    <div className="sticky top-[96px] z-30" style={{ background: 'rgba(17,17,17,0.96)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3 flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 font-condensed font-bold text-[11px] tracking-[0.18em] uppercase rounded-xl px-3.5 py-2 transition-all"
          style={{
            background: open ? '#ff2c91' : 'rgba(255,255,255,0.06)',
            color: open ? '#ffffff' : 'rgba(255,255,255,0.6)',
            border: `1px solid ${open ? '#ff2c91' : 'rgba(255,255,255,0.1)'}`,
          }}
        >
          <Filter size={11} /> Filters {activeCount > 0 && `(${activeCount})`}
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.22, ease }}
              className="flex items-center gap-2 overflow-hidden"
            >
              {/* State */}
              <select
                value={stateFilter}
                onChange={e => setStateFilter(e.target.value)}
                className="font-condensed font-bold text-[10px] tracking-[0.12em] uppercase rounded-xl px-3 py-2 outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {STATE_FILTERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              {/* Form */}
              <select
                value={formFilter}
                onChange={e => setFormFilter(e.target.value)}
                className="font-condensed font-bold text-[10px] tracking-[0.12em] uppercase rounded-xl px-3 py-2 outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {FORM_FILTERS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>

              {/* Strength */}
              <select
                value={strengthFilter}
                onChange={e => setStrengthFilter(e.target.value)}
                className="font-condensed font-bold text-[10px] tracking-[0.12em] uppercase rounded-xl px-3 py-2 outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {STRENGTH_FILTERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              {activeCount > 0 && (
                <button onClick={reset} className="flex items-center gap-1 font-condensed font-bold text-[10px] tracking-[0.15em] uppercase px-2.5 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <X size={9} /> Clear
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="ml-auto font-condensed font-bold text-[9px] tracking-[0.22em] uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>
          {count} clubs ranked · {WEEK_LABEL}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CLUB PROFILE DRAWER (click to expand)
// ─────────────────────────────────────────────────────────────────────────────
function ClubDrawer({ club, onClose }: { club: RankedClub; onClose: () => void }) {
  const drawerTotalGoals = club.goalsFor + club.goalsAgainst
  const drawerTotalGames = club.record.wins + club.record.losses + club.record.draws
  const pct = drawerTotalGoals > 0 ? ((club.goalsFor / drawerTotalGoals) * 100).toFixed(1) : '–'
  const avgMarginRaw = drawerTotalGames > 0 ? ((club.goalsFor - club.goalsAgainst) / drawerTotalGames).toFixed(1) : null
  const avgMargin = avgMarginRaw != null ? (parseFloat(avgMarginRaw) >= 0 ? `+${avgMarginRaw}` : avgMarginRaw) : '–'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 40, scale: 0.97 }}
        transition={{ duration: 0.32, ease }}
        className="w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ height: '3px', background: `linear-gradient(to right, ${club.accent}, transparent)` }} />
        <div className="p-7 sm:p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-display text-white" style={{ fontSize: '2.5rem', lineHeight: 1, color: club.accent }}>#{club.rank}</span>
                <Movement current={club.rank} previous={club.previousRank} />
              </div>
              <h3 className="font-display text-white leading-none" style={{ fontSize: 'clamp(1.4rem, 4vw, 2.2rem)' }}>{club.name.toUpperCase()}</h3>
              <p className="font-condensed font-bold text-[10px] tracking-[0.2em] uppercase mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{club.league} · {club.state}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>✕</button>
              <RatingRing value={club.powerRating} />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { l: 'Record', v: drawerTotalGames > 0 ? `${club.record.wins}–${club.record.losses}` : `${club.form.filter(r => r === 'W').length}–${club.form.filter(r => r === 'L').length}` },
              { l: 'Goals For', v: club.goalsFor > 0 ? club.goalsFor : '–' },
              { l: 'Goals Ag.', v: club.goalsAgainst > 0 ? club.goalsAgainst : '–' },
              { l: 'Avg. Margin', v: avgMargin },
              { l: 'Attack %', v: pct !== '–' ? `${pct}%` : '–' },
              { l: 'League Strength', v: '·'.repeat(club.leagueStrength) },
            ].map(({ l, v }) => (
              <div key={l} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="font-condensed font-bold text-[9px] tracking-[0.2em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{l}</p>
                <p className="font-display text-white" style={{ fontSize: '1.2rem' }}>{v}</p>
              </div>
            ))}
          </div>

          <div className="mb-6">
            <p className="font-condensed font-bold text-[9px] tracking-[0.22em] uppercase mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Current Form (last 5)</p>
            <FormPills form={club.form} />
          </div>

          {/* Future placeholders */}
          <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.08)' }}>
            <p className="font-condensed font-bold text-[10px] tracking-[0.2em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.2)' }}>Coming Soon</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Full match history · Power rating graph · CNCA appearances · Head-to-head records</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// RANKING CARD (one per club in Top 10)
// ─────────────────────────────────────────────────────────────────────────────
function RankingCard({ club, index, onSelect }: { club: RankedClub; index: number; onSelect: (c: RankedClub) => void }) {
  const [hovered, setHovered] = useState(false)
  const [shared, setShared] = useState(false)
  const prefersReduced = useReducedMotion()

  const handleShare = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShared(true)
    setTimeout(() => setShared(false), 2000)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, x: prefersReduced ? 0 : -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.55, delay: prefersReduced ? 0 : index * 0.07, ease }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(club)}
      className="relative cursor-pointer rounded-2xl transition-all duration-300"
      style={{
        background: hovered ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${hovered ? `${club.accent}35` : 'rgba(255,255,255,0.07)'}`,
        boxShadow: hovered ? `0 8px 40px rgba(0,0,0,0.25), 0 0 0 1px ${club.accent}20` : 'none',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl transition-all duration-300"
        style={{ background: hovered ? club.accent : `${club.accent}40` }}
      />

      <div className="flex items-center gap-4 sm:gap-6 p-5 sm:p-6 pl-6 sm:pl-8">

        {/* Rank */}
        <div className="shrink-0 text-right" style={{ minWidth: '2.2rem' }}>
          <span
            className="font-display leading-none block"
            style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)', color: hovered ? club.accent : 'rgba(255,255,255,0.25)', lineHeight: 1, transition: 'color 0.25s' }}
          >
            {club.rank}
          </span>
        </div>

        {/* Logo placeholder */}
        <div
          className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
          style={{
            background: `${club.accent}12`,
            border: `1.5px solid ${club.accent}35`,
          }}
        >
          <Trophy size={14} style={{ color: club.accent, opacity: 0.7 }} />
        </div>

        {/* Club info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-white leading-none" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.4rem)' }}>
              {club.name.toUpperCase()}
            </h3>
            {club.tag && (
              <span className="font-condensed font-bold text-[8px] tracking-[0.18em] uppercase px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,44,145,0.1)', color: '#ff2c91', border: '1px solid rgba(255,44,145,0.2)' }}>
                {club.tag}
              </span>
            )}
          </div>
          <p className="font-condensed font-bold text-[9px] tracking-[0.18em] uppercase mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {club.league} · {club.state}
          </p>
        </div>

        {/* Metrics — desktop */}
        <div className="hidden sm:flex items-center gap-6 shrink-0">
          <div className="text-center">
            <p className="font-condensed font-bold text-[8px] tracking-[0.18em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.2)' }}>Record</p>
            <p className="font-display text-white" style={{ fontSize: '0.95rem' }}>{club.record.wins}–{club.record.losses}</p>
          </div>
          <div className="text-center">
            <p className="font-condensed font-bold text-[8px] tracking-[0.18em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.2)' }}>Form</p>
            <FormPills form={club.form} />
          </div>
          <div className="text-center hidden lg:block">
            <p className="font-condensed font-bold text-[8px] tracking-[0.18em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.2)' }}>Strength</p>
            <LeagueStrengthBar n={club.leagueStrength} />
          </div>
          <div className="text-center hidden lg:block">
            <p className="font-condensed font-bold text-[8px] tracking-[0.18em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.2)' }}>GF / GA</p>
            <p className="font-condensed font-bold text-[10px]" style={{ color: 'rgba(255,255,255,0.55)' }}>{club.goalsFor} / {club.goalsAgainst}</p>
          </div>
        </div>

        {/* Power rating + movement */}
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <span
            className="font-display"
            style={{ fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', color: club.accent, lineHeight: 1 }}
          >
            {club.powerRating}
          </span>
          <Movement current={club.rank} previous={club.previousRank} />
        </div>

        {/* Share button */}
        <button
          onClick={handleShare}
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
          style={{
            background: shared ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${shared ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)'}`,
          }}
          title="Share ranking"
        >
          <Share2 size={11} style={{ color: shared ? '#22c55e' : 'rgba(255,255,255,0.3)' }} />
        </button>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TOP 10 SECTION
// ─────────────────────────────────────────────────────────────────────────────
function Top10Section({
  clubs,
  stateFilter,
  formFilter,
  strengthFilter,
  sectionRef,
}: {
  clubs: RankedClub[]
  stateFilter: string
  formFilter: string
  strengthFilter: string
  sectionRef: React.RefObject<HTMLDivElement | null>
}) {
  const [selected, setSelected] = useState<RankedClub | null>(null)
  const prefersReduced = useReducedMotion()

  const filtered = clubs.filter(c => {
    if (stateFilter !== 'All States' && c.state !== stateFilter) return false
    if (strengthFilter !== 'All Strengths') {
      const n = strengthFilter.split('★').length - 1
      if (c.leagueStrength !== n) return false
    }
    if (formFilter === 'WWWWW' && !c.form.every(r => r === 'W')) return false
    if (formFilter === 'W Last 5' && c.form.filter(r => r === 'W').length < 3) return false
    if (formFilter === 'L Last Game' && c.form[c.form.length - 1] !== 'L') return false
    return true
  })

  // Biggest movers
  const highestRiser = [...clubs].sort((a, b) => (b.previousRank - b.rank) - (a.previousRank - a.rank))[0]
  const biggestFall  = [...clubs].sort((a, b) => (a.previousRank - a.rank) - (b.previousRank - b.rank))[0]
  const longestStreak = [...clubs].sort((a, b) => b.form.filter(r => r === 'W').length - a.form.filter(r => r === 'W').length)[0]
  const bestAttack    = [...clubs].sort((a, b) => b.goalsFor - a.goalsFor)[0]
  const bestDefence   = [...clubs].sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0]

  return (
    <>
      <section id="top-10" ref={sectionRef} style={{ background: '#0d0d0d' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 lg:py-20">

          <motion.div
            initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease }}
            className="flex items-end justify-between gap-4 mb-10 flex-wrap"
          >
            <div>
              <p className="font-condensed font-bold tracking-[0.28em] text-[10px] uppercase mb-3" style={{ color: '#f4c14d' }}>
                Top 10 · {WEEK_LABEL}
              </p>
              <h2 className="font-display text-white leading-none" style={{ fontSize: 'clamp(2.5rem, 7vw, 6rem)' }}>
                THE <span style={{ color: '#ff2c91' }}>RANKINGS.</span>
              </h2>
            </div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)', maxWidth: '32ch' }}>
              Click any club for their full profile. Tap Share to copy the ranking link.
            </p>
          </motion.div>

          {/* Column headers — desktop */}
          <div className="hidden sm:flex items-center gap-4 px-6 mb-3" style={{ paddingLeft: '4.5rem' }}>
            <div style={{ minWidth: '2.2rem' }} />
            <div style={{ minWidth: '3rem' }} />
            <div className="flex-1">
              <span className="font-condensed font-bold text-[8px] tracking-[0.25em] uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>Club / League</span>
            </div>
            <div className="hidden sm:flex items-center gap-6 shrink-0">
              {['Record','Form','Strength','GF / GA'].map(h => (
                <span key={h} className="font-condensed font-bold text-[8px] tracking-[0.18em] uppercase hidden lg:block first:block" style={{ color: 'rgba(255,255,255,0.2)', minWidth: h === 'Form' ? '76px' : 'auto' }}>{h}</span>
              ))}
            </div>
            <span className="font-condensed font-bold text-[8px] tracking-[0.18em] uppercase shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }}>Rating</span>
            <div style={{ width: '2rem' }} />
          </div>

          {/* Club cards */}
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <p className="font-display text-white/20 text-2xl">No clubs match these filters.</p>
              </div>
            ) : (
              filtered.map((club, i) => (
                <RankingCard key={club.id} club={club} index={i} onSelect={setSelected} />
              ))
            )}
          </div>

          {/* Disclaimer */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4, ease }}
            className="flex items-start gap-2.5 mt-8 p-4 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Info size={13} style={{ color: 'rgba(255,255,255,0.3)', marginTop: '1px', flexShrink: 0 }} />
            <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>
              <strong style={{ color: 'rgba(255,255,255,0.5)' }}>CNCA Power Rankings</strong> are an editorial ranking — not an official Netball Australia or governing body ranking. Rankings update each Monday during the competitive season using publicly available results. Pilot data: NGFNL A Grade Netball, 2026 Season.
            </p>
          </motion.div>
        </div>

        {/* Biggest Movers strip */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
            <p className="font-condensed font-bold tracking-[0.28em] text-[10px] uppercase mb-6" style={{ color: '#f4c14d' }}>Biggest Movers This Week</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { label: 'Highest Riser',       club: highestRiser, icon: TrendingUp,   accent: '#22c55e', stat: `+${highestRiser.previousRank - highestRiser.rank} places` },
                { label: 'Biggest Fall',         club: biggestFall,  icon: TrendingDown, accent: '#ef4444', stat: `${biggestFall.previousRank - biggestFall.rank} places` },
                { label: 'Longest Win Streak',   club: longestStreak, icon: Zap,         accent: '#f4c14d', stat: `${longestStreak.form.filter(r => r === 'W').length} straight` },
                { label: 'Best Attack',          club: bestAttack,   icon: Target,       accent: '#ff2c91', stat: `${bestAttack.goalsFor} goals` },
                { label: 'Best Defence',         club: bestDefence,  icon: Shield,       accent: '#4dd9f4', stat: `${bestDefence.goalsAgainst} conceded` },
              ].map(({ label, club: c, icon: Icon, accent, stat }) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: prefersReduced ? 0 : 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, ease }}
                  className="p-4 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-3" style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}>
                    <Icon size={13} style={{ color: accent }} />
                  </div>
                  <p className="font-condensed font-bold text-[8px] tracking-[0.2em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>{label}</p>
                  <p className="font-display text-white leading-none mb-1" style={{ fontSize: '0.95rem' }}>{c.name}</p>
                  <p className="font-condensed font-bold text-[9px] tracking-[0.1em] uppercase" style={{ color: accent }}>{stat}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Club profile drawer */}
      <AnimatePresence>
        {selected && <ClubDrawer club={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEKLY ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────
function WeeklyAnalysisSection() {
  const prefersReduced = useReducedMotion()

  return (
    <section id="weekly-analysis" style={{ background: '#f5f4f0' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 lg:py-24">

        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease }}
          className="mb-12"
        >
          <p className="font-condensed font-bold tracking-[0.28em] text-[10px] uppercase mb-4" style={{ color: '#f4c14d' }}>
            Weekly Analysis · {WEEK_LABEL}
          </p>
          <h2 className="font-display leading-none" style={{ fontSize: 'clamp(2.5rem, 6vw, 5.5rem)', color: '#111111' }}>
            THE STORY<br /><span style={{ color: '#ff2c91' }}>THIS WEEK.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {WEEKLY_ANALYSIS.map(({ tag, headline, body, accent }, i) => (
            <motion.article
              key={headline}
              initial={{ opacity: 0, y: prefersReduced ? 0 : 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.6, delay: prefersReduced ? 0 : i * 0.1, ease }}
              className="flex flex-col p-7 lg:p-8 rounded-2xl"
              style={{ background: '#ffffff', border: '1px solid rgba(17,17,17,0.07)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}
            >
              <div className="w-8 h-1 rounded-full mb-5" style={{ background: accent }} />
              <span className="font-condensed font-bold text-[9px] tracking-[0.25em] uppercase mb-3 block" style={{ color: `${accent}cc` }}>{tag}</span>
              <h3 className="font-display leading-none mb-4" style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.7rem)', color: '#111111', lineHeight: 1.0 }}>
                {headline.toUpperCase()}
              </h3>
              <div className="h-px mb-4" style={{ background: 'rgba(17,17,17,0.07)' }} />
              <p className="text-sm leading-relaxed flex-1" style={{ color: 'rgba(17,17,17,0.55)' }}>{body}</p>
            </motion.article>
          ))}
        </div>

        {/* Future placeholder */}
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.35, ease }}
          className="mt-8 p-6 rounded-2xl flex items-center justify-between gap-4 flex-wrap"
          style={{ background: 'rgba(17,17,17,0.04)', border: '1px dashed rgba(17,17,17,0.1)' }}
        >
          <div>
            <p className="font-condensed font-bold text-[9px] tracking-[0.22em] uppercase mb-1" style={{ color: 'rgba(17,17,17,0.3)' }}>Coming Soon</p>
            <p className="font-display" style={{ fontSize: '1.1rem', color: 'rgba(17,17,17,0.4)' }}>Full editorial analysis every Monday — by the CNCA team.</p>
          </div>
          <Clock size={20} style={{ color: 'rgba(17,17,17,0.2)', flexShrink: 0 }} />
        </motion.div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// RANKING FORMULA
// ─────────────────────────────────────────────────────────────────────────────
function RankingFormula({ sectionRef }: { sectionRef: React.RefObject<HTMLDivElement | null> }) {
  const prefersReduced = useReducedMotion()

  return (
    <section id="methodology" ref={sectionRef} style={{ background: '#111111' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 lg:py-24">

        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.75, ease }}
          className="grid lg:grid-cols-[4fr,5fr] gap-12 lg:gap-20 items-start"
        >
          <div>
            <p className="font-condensed font-bold tracking-[0.28em] text-[10px] uppercase mb-5" style={{ color: '#f4c14d' }}>
              Rankings Methodology
            </p>
            <h2 className="font-display text-white leading-none mb-6" style={{ fontSize: 'clamp(2.2rem, 6vw, 5rem)' }}>
              HOW THE<br /><span style={{ color: '#ff2c91' }}>FORMULA WORKS.</span>
            </h2>
            <p className="leading-relaxed mb-5" style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.75 }}>
              CNCA Power Rankings are an editorial ranking — not an official Netball Australia or state body ranking. We use publicly available results and our own transparent algorithm to score and rank clubs across Australia every Monday.
            </p>
            <p className="leading-relaxed" style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.28)', lineHeight: 1.75 }}>
              No algorithm is perfect. Our goal is to spark honest debate, reward consistent performance and give every country netball club in Australia something to aspire to. Rankings are updated each Monday during the competitive season.
            </p>
          </div>

          <div className="space-y-3">
            {RANKING_FACTORS.map(({ label, weight, description, icon: Icon, accent }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: prefersReduced ? 0 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-10px' }}
                transition={{ duration: 0.5, delay: prefersReduced ? 0 : i * 0.05, ease }}
                className="p-4 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}>
                    <Icon size={12} style={{ color: accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-condensed font-bold text-[10px] tracking-[0.15em] uppercase text-white">{label}</span>
                      <span className="font-condensed font-bold text-[9px]" style={{ color: accent }}>{weight}%</span>
                    </div>
                    <PercentageBar value={weight} accent={accent} />
                  </div>
                </div>
                <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.25)', paddingLeft: '2.5rem' }}>{description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMING SOON
// ─────────────────────────────────────────────────────────────────────────────
function ComingSoonSection() {
  const prefersReduced = useReducedMotion()

  return (
    <section id="coming-soon" style={{ background: '#0d0d0d' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 lg:py-24">

        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease }}
          className="mb-12"
        >
          <p className="font-condensed font-bold tracking-[0.28em] text-[10px] uppercase mb-4" style={{ color: '#f4c14d' }}>
            Future Rankings
          </p>
          <h2 className="font-display text-white leading-none" style={{ fontSize: 'clamp(2.2rem, 6vw, 5rem)' }}>
            THIS IS JUST<br /><span style={{ color: '#ff2c91' }}>THE BEGINNING.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {COMING_SOON.map(({ title, desc, accent }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: prefersReduced ? 0 : 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10px' }}
              transition={{ duration: 0.5, delay: prefersReduced ? 0 : i * 0.07, ease }}
              className="relative p-7 rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px dashed rgba(255,255,255,0.08)',
              }}
            >
              <div className="w-8 h-1 rounded-full mb-5" style={{ background: `${accent}40` }} />
              <span className="font-condensed font-bold text-[8px] tracking-[0.25em] uppercase mb-2 block" style={{ color: 'rgba(255,255,255,0.2)' }}>Coming Soon</span>
              <h3 className="font-display text-white leading-none mb-3" style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.7rem)' }}>{title.toUpperCase()}</h3>
              <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.25)' }}>{desc}</p>
              <div className="absolute top-5 right-5 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Clock size={10} style={{ color: 'rgba(255,255,255,0.2)' }} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FINAL CTA
// ─────────────────────────────────────────────────────────────────────────────
function RankingsCTA() {
  const navigate = useNavigate()
  const prefersReduced = useReducedMotion()

  return (
    <section className="relative overflow-hidden" style={{ background: '#111111' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 70% at 50% 100%, rgba(255,44,145,0.09) 0%, transparent 60%)' }} />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-8 py-24 lg:py-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease }}
        >
          <p className="font-condensed font-bold tracking-[0.28em] text-[10px] uppercase mb-6" style={{ color: '#f4c14d' }}>Ready To Compete?</p>
          <h2 className="font-display text-white leading-[0.88] mb-5" style={{ fontSize: 'clamp(2.8rem, 8vw, 8rem)' }}>
            WANT TO BE<br /><span style={{ color: '#ff2c91' }}>ON THIS LIST?</span>
          </h2>
          <p className="mb-10" style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.35)', maxWidth: '40ch', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
            CNCA Power Rankings feature clubs from across Australia. Request your club's invitation to the 2027 national championship.
          </p>
          <button
            onClick={() => navigate('/')}
            className="font-bold rounded-full text-white text-sm tracking-wide inline-flex items-center gap-2 transition-all"
            style={{
              background: '#ff2c91',
              padding: '1rem 2.8rem',
              boxShadow: '0 8px 48px rgba(255,44,145,0.35)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#cc1f6e'
              e.currentTarget.style.boxShadow = '0 12px 60px rgba(255,44,145,0.5)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#ff2c91'
              e.currentTarget.style.boxShadow = '0 8px 48px rgba(255,44,145,0.35)'
            }}
          >
            Request Club Invitation <ArrowRight size={15} />
          </button>
          <p className="mt-5 font-condensed font-bold text-[9px] tracking-[0.28em] uppercase" style={{ color: 'rgba(255,255,255,0.15)' }}>
            Gold Coast · Queensland · October 2027
          </p>
        </motion.div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function PowerRankings() {
  const [rankings, setRankings]             = useState<RankedClub[]>([])
  const [isLoading, setIsLoading]           = useState(true)
  const [fetchError, setFetchError]         = useState<string | null>(null)
  const [stateFilter, setStateFilter]       = useState('All States')
  const [formFilter, setFormFilter]         = useState('All Form')
  const [strengthFilter, setStrengthFilter] = useState('All Strengths')

  const top10Ref  = useRef<HTMLDivElement>(null)
  const methodRef = useRef<HTMLDivElement>(null)

  const scrollToTop10  = useCallback(() => top10Ref.current?.scrollIntoView({ behavior: 'smooth' }), [])
  const scrollToMethod = useCallback(() => methodRef.current?.scrollIntoView({ behavior: 'smooth' }), [])

  useEffect(() => {
    fetch('/api/top10')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<{ data: ApiEntry[]; meta: { weekLabel: string; season: string } }>
      })
      .then(({ data, meta }) => {
        WEEK_LABEL = `${meta.weekLabel} · Season ${meta.season}`
        UPDATED    = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        setRankings(data.map(mapApiEntry))
      })
      .catch(err => setFetchError(String(err)))
      .finally(() => setIsLoading(false))
  }, [])

  const featuredClub = rankings[0]

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "CNCA National Power Rankings — Australia's Best Country Netball Clubs",
    "description": "The CNCA National Power Rankings rank Australia's strongest country netball clubs each week using a transparent performance formula. Updated every Monday during the competitive season.",
    "url": "https://cnca.com.au/power-rankings",
    "publisher": { "@type": "SportsOrganization", "name": "CNCA — Country Netball Championships Australia", "url": "https://cnca.com.au" },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://cnca.com.au" },
        { "@type": "ListItem", "position": 2, "name": "Power Rankings", "item": "https://cnca.com.au/power-rankings" },
      ]
    },
    "mainEntity": {
      "@type": "ItemList",
      "name": `CNCA National Power Rankings — ${WEEK_LABEL}`,
      "description": "Weekly editorial ranking of Australia's strongest country netball clubs.",
      "itemListElement": rankings.map(c => ({ "@type": "ListItem", "position": c.rank, "name": `${c.name} — Power Rating ${c.powerRating}` }))
    }
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }} />

      <Ticker />
      <Nav />

      <main id="power-rankings-main">
        <RankingsHero clubs={rankings} onScrollToTop10={scrollToTop10} onScrollToMethod={scrollToMethod} />

        {isLoading && (
          <div style={{ background: '#111111', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p className="font-condensed font-bold text-[11px] tracking-[0.28em] uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>Loading rankings...</p>
          </div>
        )}

        {fetchError && !isLoading && (
          <div style={{ background: '#111111', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p className="font-condensed font-bold text-[11px] tracking-[0.2em] uppercase" style={{ color: '#ef4444' }}>Unable to load rankings. Please try again later.</p>
          </div>
        )}

        {!isLoading && !fetchError && featuredClub && (
          <FeaturedClub club={featuredClub} />
        )}

        {!isLoading && !fetchError && rankings.length > 0 && (
          <>
            <FilterBar
              stateFilter={stateFilter} setStateFilter={setStateFilter}
              formFilter={formFilter} setFormFilter={setFormFilter}
              strengthFilter={strengthFilter} setStrengthFilter={setStrengthFilter}
              count={rankings.length}
            />
            <Top10Section
              clubs={rankings}
              stateFilter={stateFilter}
              formFilter={formFilter}
              strengthFilter={strengthFilter}
              sectionRef={top10Ref}
            />
          </>
        )}

        <WeeklyAnalysisSection />
        <RankingFormula sectionRef={methodRef} />
        <ComingSoonSection />
        <RankingsCTA />
      </main>

      <Footer />
    </>
  )
}
