interface TickerProps {
  items?: string[]
  bg?: string
  textColor?: string
}

const defaults = [
  'PLAYFOOTY COMMUNITY FOOTBALL',
  'FUTURE SHOWCASE',
  'SENIOR CLUBS',
  'DATE TBC',
  'MANUAL LEAGUE READY',
  'RANKINGS RESULTS LADDERS',
]

export default function Ticker({ items = defaults, bg = '#d71920', textColor = '#ffffff' }: TickerProps) {
  const text = items.join('  ✦  ')
  return (
    <div className="overflow-hidden py-3.5 select-none" style={{ backgroundColor: bg }}>
      <div className="flex whitespace-nowrap animate-ticker">
        {[0, 1, 2].map(k => (
          <span key={k} className="font-display text-sm tracking-[0.16em] uppercase pr-20 shrink-0"
            style={{ color: textColor }}>
            {text}
          </span>
        ))}
      </div>
    </div>
  )
}
