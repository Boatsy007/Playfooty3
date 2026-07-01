import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

// CNCA 2027 opens Thursday 7 October 2027, 08:00 AEST (UTC+10)
const TARGET_MS = new Date('2027-10-07T08:00:00+10:00').getTime()

function getTimeLeft() {
  const diff = Math.max(0, TARGET_MS - Date.now())
  return {
    days:    Math.floor(diff / 86_400_000),
    hours:   Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
  }
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

interface FlipDigitProps {
  value: string
  label: string
  accent?: boolean
}

function FlipDigit({ value, label, accent }: FlipDigitProps) {
  const prev = useRef(value)
  const [flip, setFlip] = useState(false)
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    if (value !== prev.current && !prefersReduced) {
      setFlip(true)
      const id = setTimeout(() => {
        setFlip(false)
        prev.current = value
      }, 300)
      return () => clearTimeout(id)
    }
    prev.current = value
  }, [value, prefersReduced])

  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3">
      <div
        className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: accent ? '0 0 40px rgba(255,44,145,0.08)' : 'none',
          aspectRatio: '1 / 1.1',
        }}
      >
        {/* Top half sheen */}
        <div
          className="absolute inset-x-0 top-0 h-1/2 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.03), transparent)' }}
        />

        {/* Centre fold line */}
        <div
          className="absolute inset-x-0 pointer-events-none"
          style={{ top: '50%', height: '1px', background: 'rgba(0,0,0,0.4)', zIndex: 2 }}
        />

        {/* Number */}
        <AnimatePresence mode="wait">
          <motion.span
            key={value}
            initial={prefersReduced ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReduced ? {} : { opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex items-center justify-center font-display text-white tabular-nums select-none"
            style={{
              fontSize: 'clamp(2.2rem, 7vw, 5.5rem)',
              lineHeight: 1,
              color: accent ? '#ff2c91' : '#ffffff',
            }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>

      <span
        className="font-condensed font-bold tracking-[0.22em] text-[9px] sm:text-[10px] uppercase"
        style={{ color: 'rgba(255,255,255,0.28)' }}
      >
        {label}
      </span>
    </div>
  )
}

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function Countdown() {
  const [time, setTime] = useState(getTimeLeft)
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000)
    return () => clearInterval(id)
  }, [])

  const units = [
    { label: 'Days',    value: pad(time.days),    accent: false },
    { label: 'Hours',   value: pad(time.hours),   accent: false },
    { label: 'Minutes', value: pad(time.minutes), accent: false },
    { label: 'Seconds', value: pad(time.seconds), accent: true  },
  ]

  return (
    <section style={{ background: '#111111' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-16 lg:py-24">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease }}
          className="text-center mb-10 lg:mb-14"
        >
          <p className="font-condensed font-bold tracking-[0.28em] text-[10px] uppercase mb-4" style={{ color: '#f4c14d' }}>
            October 2027 &nbsp;·&nbsp; Gold Coast, Queensland
          </p>
          <h2 className="font-display text-white leading-none mb-3" style={{ fontSize: 'clamp(2.2rem, 6vw, 5rem)' }}>
            THE COUNTDOWN<br />IS <span style={{ color: '#ff2c91' }}>ON.</span>
          </h2>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.02em' }}>
            Australia's national country netball championship
          </p>
        </motion.div>

        {/* Flip digits */}
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15, ease }}
          className="grid grid-cols-4 gap-3 sm:gap-5 lg:gap-6 max-w-xl mx-auto"
        >
          {units.map(({ label, value, accent }) => (
            <FlipDigit key={label} label={label} value={value} accent={accent} />
          ))}
        </motion.div>

        {/* Separator / CTA nudge */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.35, ease }}
          className="flex items-center gap-4 mt-12 max-w-sm mx-auto"
        >
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
          <span className="font-condensed font-bold text-[9px] tracking-[0.3em] uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Will your club be there?
          </span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
        </motion.div>

      </div>
    </section>
  )
}
