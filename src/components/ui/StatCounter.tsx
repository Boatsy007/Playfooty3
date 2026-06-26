import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

interface StatCounterProps {
  value: number
  suffix?: string
  prefix?: string
  label: string
  duration?: number
  light?: boolean
}

export default function StatCounter({ value, suffix = '', prefix = '', label, duration = 2000, light = false }: StatCounterProps) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  useEffect(() => {
    if (!isInView) return
    const start = Date.now()
    const end = start + duration
    const timer = setInterval(() => {
      const now = Date.now()
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * value))
      if (now >= end) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [isInView, value, duration])

  return (
    <div ref={ref} className="text-center">
      <div className={`text-3xl md:text-4xl font-extrabold leading-none ${light ? 'text-white' : 'text-navy-700'}`}>
        {prefix}{count}{suffix}
      </div>
      <div className={`text-xs font-semibold tracking-widest uppercase mt-1.5 ${light ? 'text-white/70' : 'text-navy-400'}`}>
        {label}
      </div>
    </div>
  )
}
