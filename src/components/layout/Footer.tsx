import { Globe } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-[#1a1a1a] py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="52" cy="52" r="38" stroke="#ff2c91" strokeWidth="3" fill="none"/>
            <circle cx="52" cy="52" r="25" stroke="#ff2c91" strokeWidth="2" fill="none"/>
            <path d="M14 45 Q52 38 90 45" stroke="#ff2c91" strokeWidth="1.8" fill="none"/>
            <path d="M14 59 Q52 66 90 59" stroke="#ff2c91" strokeWidth="1.8" fill="none"/>
            <line x1="52" y1="14" x2="52" y2="90" stroke="#ff2c91" strokeWidth="1.8"/>
            <path d="M20 52 C20 30 34 14 52 10 C40 16 32 32 32 52 C32 72 40 88 52 94 C34 90 20 74 20 52Z" fill="#ff2c91"/>
          </svg>
          <div className="flex items-center gap-2 text-white/50 text-sm font-bold">
            <Globe size={14} className="text-[#ff2c91]" />
            clubnetball.com.au
          </div>
        </div>
        <p className="text-white/30 text-xs text-center">
          © 2026 Australian Club Netball Championships. All rights reserved.
        </p>
        <div className="flex gap-5">
          {['Privacy', 'Terms'].map(t => (
            <span key={t} className="text-xs text-white/30 hover:text-white/60 cursor-default transition-colors">{t}</span>
          ))}
        </div>
      </div>
    </footer>
  )
}
