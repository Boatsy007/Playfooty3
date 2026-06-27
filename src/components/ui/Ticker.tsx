interface TickerProps {
  items?: string[]
  bg?: string
  textColor?: string
}

const defaults = [
  'COUNTRY NETBALL CHAMPIONSHIPS AUSTRALIA',
  'GOLD COAST 2027',
  'A GRADE PREMIERS ONLY',
  'INVITATION ONLY',
  'OCTOBER 2027',
  'ONE NATIONAL TITLE',
]

export default function Ticker({ items = defaults, bg = '#ff2c91', textColor = '#ffffff' }: TickerProps) {
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
