import { memo } from 'react'

const segments = [
  'NATIONAL RANKINGS', '✦', 'LEAGUE LADDERS', '✦',
  'CLUB PROFILES', '✦', 'LOCAL FOOTY NEWS', '✦', 'BUILT FOR WEEKLY UPDATES', '✦',
  'NATIONAL RANKINGS', '✦', 'LEAGUE LADDERS', '✦',
  'CLUB PROFILES', '✦', 'LOCAL FOOTY NEWS', '✦', 'BUILT FOR WEEKLY UPDATES', '✦',
]

export default memo(function Ticker() {
  return (
    <div className="h-10 bg-[#d71920] overflow-hidden flex items-center select-none">
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
