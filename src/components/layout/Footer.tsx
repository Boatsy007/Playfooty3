
import { Globe, Mail } from 'lucide-react'

export default function Footer() {
  const scrollTo = (id: string) =>
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <footer className="bg-navy overflow-hidden">
      <div className="h-[3px] bg-pink" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="lg:col-span-2">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-5">
              <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 50 C20 29 34 13 52 10 C40 15 32 31 32 50 C32 69 40 85 52 90 C34 87 20 71 20 50Z" fill="#ff2c91"/>
                <circle cx="60" cy="50" r="26" stroke="#ff2c91" strokeWidth="3" fill="none"/>
                <circle cx="60" cy="50" r="17" stroke="#ff2c91" strokeWidth="1.8" fill="none"/>
                <path d="M36 43 Q60 37 84 43" stroke="#ff2c91" strokeWidth="1.6" fill="none"/>
                <path d="M36 57 Q60 63 84 57" stroke="#ff2c91" strokeWidth="1.6" fill="none"/>
                <line x1="60" y1="24" x2="60" y2="76" stroke="#ff2c91" strokeWidth="1.6"/>
                <path d="M57 7 L58.4 11 L62.5 11 L59.2 13.4 L60.6 17.4 L57 15 L53.4 17.4 L54.8 13.4 L51.5 11 L55.6 11Z" fill="#f4c14d"/>
              </svg>
              <div className="leading-none">
                <div className="font-display text-3xl tracking-widest leading-none">
                  <span className="text-white">CN</span>
                  <span className="text-pink">CA</span>
                </div>
                <div className="text-[8px] font-bold tracking-[0.12em] uppercase text-white/35 mt-0.5">
                  Country Netball Championships Australia
                </div>
              </div>
            </div>
            <p className="text-white/40 text-sm leading-relaxed mb-5 max-w-xs">
              Australia's invitation-only A Grade country netball championship.<br />
              Gold Coast, Queensland · 5–8 November 2026.
            </p>
            <div className="space-y-2">
              {[
                { icon: Globe, text: 'clubnetball.com.au' },
                { icon: Mail, text: 'hello@clubnetball.com.au' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5 text-sm text-white/40 hover:text-white transition-colors cursor-default">
                  <Icon size={13} className="text-pink shrink-0" />
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <p className="text-xs font-bold tracking-[0.15em] uppercase text-white/30 mb-4">Championship</p>
            <div className="space-y-2.5">
              {['Experience', 'How It Works', 'A Grade Format', 'Major Prize', 'Request Invitation'].map(item => (
                <button
                  key={item}
                  onClick={() => scrollTo(item === 'Experience' ? '#experience' : item === 'How It Works' ? '#how-it-works' : item === 'Major Prize' ? '#prize' : '#register')}
                  className="block text-sm text-white/50 hover:text-white transition-colors"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold tracking-[0.15em] uppercase text-white/30 mb-4">Information</p>
            <div className="space-y-2.5">
              {['About CNCA', 'Accommodation Options', 'Bring The Whole Club', 'Contact Us', 'Media Enquiries'].map(item => (
                <span key={item} className="block text-sm text-white/50 cursor-default">{item}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">
            © 2026 Country Netball Championships Australia. All rights reserved.
          </p>
          <div className="flex gap-6">
            {['Privacy Policy', 'Terms & Conditions'].map(item => (
              <span key={item} className="text-xs text-white/30 hover:text-white/60 cursor-default transition-colors">{item}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
