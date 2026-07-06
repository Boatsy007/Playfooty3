import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]
const headline = ["AUSTRALIA'S HOME OF", 'Community Football']

export default function Hero() {
  const navigate = useNavigate()

  return (
    <section className="relative overflow-hidden flex flex-col" style={{ minHeight: 'calc(100svh - 108px)' }}>

      {/* Full-bleed photo */}
      <img
        src="/hero-photo.webp"
        alt="PlayFooty — Australia's home of Community Football"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: '65% center' }}
      />

      {/* Overlays */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.9) 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(13,13,13,0.95) 0%, rgba(13,13,13,0.55) 55%, transparent 85%)' }} />

      {/* Content — bottom anchored */}
      <div className="relative z-10 flex flex-col justify-end flex-1 px-6 sm:px-10 lg:px-16 pb-14 lg:pb-20 max-w-5xl">

        {/* Kicker */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease }}
          className="font-condensed font-bold tracking-[0.28em] uppercase mb-7"
          style={{ fontSize: '0.75rem', color: '#f4c14d' }}
        >
          Rankings &nbsp;•&nbsp; Ladders &nbsp;•&nbsp; Clubs &nbsp;•&nbsp; News
        </motion.p>

        {/* Headline */}
        <div className="mb-8">
          {headline.map((line, i) => (
            <div key={line} className="overflow-hidden">
              <motion.span
                initial={{ y: '105%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 0.75, delay: 0.2 + i * 0.1, ease }}
                className="block font-display leading-[0.88]"
                style={{
                  fontSize: 'clamp(2.6rem, 8vw, 8.5rem)',
                  color: i === 0 ? '#ffffff' : '#ff2c91',
                }}
              >
                {line}
              </motion.span>
            </div>
          ))}
        </div>

        {/* Subtext */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.45, ease }}
          className="mb-10 space-y-2"
        >
          <p className="font-semibold text-white" style={{ fontSize: 'clamp(0.95rem, 1.8vw, 1.1rem)' }}>
            National rankings, league ladders, club profiles, statistics and Community Football news from across Australia.
          </p>
          <p className="font-semibold" style={{ fontSize: 'clamp(0.85rem, 1.5vw, 0.95rem)', color: 'rgba(255,255,255,0.38)' }}>
            Who are the best Community Football clubs in the nation? Settled every week.
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.58, ease }}
          className="flex flex-wrap gap-3"
        >
          <motion.button
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/rankings')}
            className="btn-pink font-bold rounded-full"
            style={{ fontSize: '0.85rem', padding: '1rem 2.6rem', letterSpacing: '0.08em' }}
          >
            VIEW NATIONAL RANKINGS
          </motion.button>
          <motion.button
            whileHover={{ borderColor: '#ff2c91', color: '#ff2c91', y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/leagues')}
            className="font-semibold rounded-full border-2 transition-all duration-200"
            style={{ fontSize: '0.85rem', padding: '1rem 2.2rem', letterSpacing: '0.08em', borderColor: 'rgba(255,255,255,0.22)', color: 'rgba(255,255,255,0.6)' }}
          >
            BROWSE LEAGUES
          </motion.button>
        </motion.div>

      </div>
    </section>
  )
}
