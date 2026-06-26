const segments = [
  'GOLD COAST', '✦', 'NOVEMBER 2026', '✦', 'A GRADE PREMIERS', '✦',
  'INVITE ONLY', '✦', 'NATIONAL TITLE', '✦', 'GOLD COAST', '✦',
  'NOVEMBER 2026', '✦', 'A GRADE PREMIERS', '✦', 'INVITE ONLY', '✦', 'NATIONAL TITLE', '✦',
]

export default function Ticker() {
  return (
    <div className="mt-[68px] h-10 bg-[#ff2c91] overflow-hidden flex items-center select-none">
      <div className="marquee-track">
        {[...segments, ...segments].map((seg, i) => (
          <span
            key={i}
            className="text-white text-[10px] font-bold tracking-[0.25em] uppercase shrink-0 mx-5"
          >
            {seg}
          </span>
        ))}
      </div>
    </div>
  )
}
