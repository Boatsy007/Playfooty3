import { memo } from 'react'
import { Globe } from 'lucide-react'

export default memo(function Footer() {
  return (
    <footer className="bg-[#1a1a1a] py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex items-baseline gap-1">
            <span className="font-display text-xl text-white/80 leading-none">GOT</span>
            <span className="font-display text-xl leading-none" style={{ color: '#ff2c91' }}>NETTY</span>
          </span>
          <div className="flex items-center gap-2 text-white/50 text-sm font-bold">
            <Globe size={14} className="text-[#ff2c91]" />
            gotnetty.com.au
          </div>
        </div>
        <p className="text-white/30 text-xs text-center">
          &copy; {new Date().getFullYear()} Got Netty — Australia's Home of Country Netball. All rights reserved.
        </p>
        <div className="flex gap-5">
          {['Privacy', 'Terms'].map(t => (
            <span key={t} className="text-xs text-white/30 hover:text-white/60 cursor-default transition-colors">{t}</span>
          ))}
        </div>
      </div>
    </footer>
  )
})
