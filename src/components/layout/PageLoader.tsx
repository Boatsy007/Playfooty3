import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

export default function PageLoader() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2200)
    return () => clearTimeout(t)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] } }}
          className="fixed inset-0 z-[9000] flex flex-col items-center justify-center bg-navy overflow-hidden"
          style={{ background: '#081a3d' }}
        >
          {/* Pink sweep line */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-1 bg-pink-grad"
            initial={{ scaleX: 0, transformOrigin: 'left' }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] as [number,number,number,number], delay: 0.1 }}
          />

          {/* Logo reveal */}
          <div className="relative flex flex-col items-center gap-4">
            {/* Netball SVG icon */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] }}
              className="relative"
            >
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="31" stroke="#ff2c91" strokeWidth="2.5" />
                <circle cx="32" cy="32" r="19" stroke="#ff2c91" strokeWidth="1.5" />
                <path d="M12 22 Q32 12 52 22" stroke="#ff2c91" strokeWidth="1.5" fill="none" />
                <path d="M12 42 Q32 52 52 42" stroke="#ff2c91" strokeWidth="1.5" fill="none" />
                <line x1="32" y1="1" x2="32" y2="63" stroke="#ff2c91" strokeWidth="1.5" />
                <path d="M8 12 Q22 22 8 38" stroke="#ff2c91" strokeWidth="1.5" fill="none" />
                <path d="M56 12 Q42 22 56 38" stroke="#ff2c91" strokeWidth="1.5" fill="none" />
              </svg>
              {/* Gold star */}
              <motion.div
                className="absolute -top-2 -right-2"
                animate={{ rotate: [0, 15, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <path d="M8 0 L9.5 5.5 L15 8 L9.5 10.5 L8 16 L6.5 10.5 L1 8 L6.5 5.5 Z" fill="#f4c14d" />
                </svg>
              </motion.div>
            </motion.div>

            {/* CNCA wordmark */}
            <div className="overflow-hidden">
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number,number,number,number], delay: 0.3 }}
                className="flex items-baseline gap-0"
              >
                <span className="font-display text-6xl text-white tracking-wider">CN</span>
                <span className="font-display text-6xl tracking-wider" style={{ color: '#ff2c91' }}>CA</span>
              </motion.div>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="text-xs font-bold tracking-[0.25em] uppercase text-white/50"
            >
              Country Netball Championships Australia
            </motion.p>

            {/* Progress bar */}
            <motion.div className="w-48 h-0.5 bg-white/10 rounded-full mt-4 overflow-hidden">
              <motion.div
                className="h-full bg-pink-grad rounded-full"
                initial={{ scaleX: 0, transformOrigin: 'left' }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] as [number,number,number,number], delay: 0.2 }}
              />
            </motion.div>
          </div>

          {/* Bottom bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="absolute bottom-8 left-0 right-0 flex justify-center"
          >
            <span className="text-xs text-white/30 tracking-widest uppercase">
              Gold Coast · October 2027
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
