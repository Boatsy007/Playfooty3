import { memo } from 'react'

const segments = [
  'NATIONAL CHAMPIONSHIP', '✦', 'A GRADE PREMIERS', '✦',
  'INVITATION ONLY', '✦', 'GOLD COAST 2027', '✦', 'ONE NATIONAL TITLE', '✦',
  'NATIONAL CHAMPIONSHIP', '✦', 'A GRADE PREMIERS', '✦',
  'INVITATION ONLY', '✦', 'GOLD COAST 2027', '✦', 'ONE NATIONAL TITLE', '✦',
]

export default memo(function Ticker() {
  return (
    <div className="h-10 bg-[#ff2c91] overflow-hidden flex items-center select-none">
      <div className="marquee-track">
        {[...segments, ...segments].map((seg, i) => (
          <span
            key={i}
            className="font-condensed font-bold text-white text-xs tracking-[0.25em] uppercase shrink-0 mx-5"
          >
            {seg}
          </span>
        ))}
      </div>
    </div>
  )
})
