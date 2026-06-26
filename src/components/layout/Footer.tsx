import { memo } from 'react'
import { Globe } from 'lucide-react'

export default memo(function Footer() {
  return (
    <footer className="bg-[#1a1a1a] py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/logo.webp" alt="CNCA" className="h-9 w-auto brightness-0 invert opacity-60" />
          <div className="flex items-center gap-2 text-white/50 text-sm font-bold">
            <Globe size={14} className="text-[#ff2c91]" />
            cnca.com.au
          </div>
        </div>
        <p className="text-white/30 text-xs text-center">
          &copy; 2026 Australian Club Netball Championships. All rights reserved.
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
