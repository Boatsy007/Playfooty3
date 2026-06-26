import { Globe, Mail } from 'lucide-react'

export default function Footer() {
  const scrollTo = (id: string) =>
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <footer className="relative overflow-hidden" style={{ background: '#040e22' }}>
      <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #ff2c91, #cc1f6e, #ff2c91)' }} />

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(255,44,145,0.06) 0%, transparent 70%)' }} />

      <div className="relative z-10 max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr,1fr,1fr] gap-12 mb-14">

          <div>
            <div className="flex items-center gap-3 mb-6">
              <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 50 C20 29 34 13 52 10 C40 15 32 31 32 50 C32 69 40 85 52 90 C34 87 20 71 20 50Z" fill="#ff2c91"/>
                <circle cx="60" cy="50" r="26" stroke="#ff2c91" strokeWidth="2.5" fill="none"/>
                <circle cx="60" cy="50" r="17" stroke="#ff2c91" strokeWidth="1.6" fill="none"/>
                <path d="M36 43 Q60 37 84 43" stroke="#ff2c91" strokeWidth="1.5" fill="none"/>
                <path d="M36 57 Q60 63 84 57" stroke="#ff2c91" strokeWidth="1.5" fill="none"/>
                <line x1="60" y1="24" x2="60" y2="76" stroke="#ff2c91" strokeWidth="1.5"/>
                <path d="M57 7 L58.4 11 L62.5 11 L59.2 13.4 L60.6 17.4 L57 15 L53.4 17.4 L54.8 13.4 L51.5 11 L55.6 11Z" fill="#f4c14d"/>
              </svg>
              <div className="leading-none">
                <div className="font-display text-[27px] tracking-widest leading-none">
                  <span className="text-white">CN</span>
                  <span style={{ color: '#ff2c91' }}>CA</span>
                </div>
                <div className="text-[7px] font-bold tracking-[0.13em] uppercase mt-0.5 text-white/35">
                  Country Netball Championships Australia
                </div>
              </div>
            </div>

            <p className="text-white/35 text-sm leading-relaxed mb-6 max-w-xs">
              Australia's invitation-only A Grade country netball championship.
              Gold Coast, Queensland · 5–8 November 2026.
            </p>

            <div className="space-y-2.5">
              {[
                { icon: Globe, text: 'clubnetball.com.au' },
                { icon: Mail, text: 'hello@clubnetball.com.au' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5 text-sm text-white/35 hover:text-white/70 transition-colors cursor-default">
                  <Icon size={13} style={{ color: '#ff2c91', flexShrink: 0 }} />
                  {text}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/25 mb-5">Championship</p>
            <div className="space-y-3">
              {[
                { label: 'The Experience', href: '#experience' },
                { label: 'How It Works', href: '#how-it-works' },
                { label: 'Bring The Club', href: '#bring-the-club' },
                { label: 'Major Prize', href: '#prize' },
                { label: 'Request Invitation', href: '#register' },
              ].map(({ label, href }) => (
                <button key={label} onClick={() => scrollTo(href)}
                  className="block text-sm text-white/40 hover:text-white transition-colors duration-200">
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/25 mb-5">Information</p>
            <div className="space-y-3">
              {['About CNCA', 'Accommodation Options', 'Contact Us', 'Media Enquiries'].map(item => (
                <span key={item} className="block text-sm text-white/40 cursor-default">{item}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t mb-8" style={{ borderColor: 'rgba(255,255,255,0.07)' }} />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/25">
            © 2026 Country Netball Championships Australia. All rights reserved.
          </p>
          <div className="flex gap-6">
            {['Privacy Policy', 'Terms & Conditions'].map(item => (
              <span key={item} className="text-xs text-white/25 hover:text-white/50 cursor-default transition-colors">{item}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
