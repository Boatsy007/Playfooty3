import { Drawer } from 'vaul'
import { Calendar, MapPin, Lock, Trophy, Music, Utensils, Camera, Award, Users, Tv } from 'lucide-react'

const lineup = [
  { icon: Trophy,  cat: 'COMPETE',   label: 'National Championship',      color: '#ff2c91' },
  { icon: Users,   cat: 'SOCIAL',    label: 'Opening Function',           color: '#f4c14d' },
  { icon: Music,   cat: 'SOUNDS',    label: 'Live Entertainment',         color: '#4dd9f4' },
  { icon: Award,   cat: 'CELEBRATE', label: 'Awards Presentation',        color: '#ff2c91' },
  { icon: Utensils,cat: 'EAT',       label: 'Food Trucks & Festival Zone',color: '#f4c14d' },
  { icon: MapPin,  cat: 'EXPLORE',   label: 'Gold Coast Experiences',     color: '#4dd9f4' },
  { icon: Camera,  cat: 'CAPTURED',  label: 'Professional Photography',   color: '#ff2c91' },
  { icon: Tv,      cat: 'LIVE',      label: 'Livestream Coverage',        color: '#f4c14d' },
  { icon: MapPin,  cat: 'TRAVEL',    label: 'Club Travel Packages',       color: '#4dd9f4' },
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function WhatsOnDrawer({ open, onClose }: Props) {
  return (
    <Drawer.Root open={open} onOpenChange={v => !v && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-50 outline-none"
          style={{ maxHeight: '92svh' }}
        >
          <div className="rounded-t-3xl overflow-hidden flex flex-col" style={{ background: '#111111', maxHeight: '92svh' }}>

            {/* Handle */}
            <div className="flex justify-center pt-4 pb-2 shrink-0">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
            </div>

            {/* Header */}
            <div className="px-6 pt-2 pb-5 shrink-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <Drawer.Title className="font-display text-white leading-none mb-1" style={{ fontSize: '2.2rem' }}>
                THE WEEKEND
              </Drawer.Title>
              <p className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: '#ff2c91' }}>
                Gold Coast · 5–8 November 2026
              </p>
            </div>

            {/* Lineup */}
            <div className="overflow-y-auto flex-1 px-6 py-4">
              {lineup.map(({ icon: Icon, cat, label, color }, i) => (
                <div
                  key={label}
                  className="flex items-center justify-between py-4 border-b"
                  style={{ borderColor: 'rgba(255,255,255,0.07)', animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                      <Icon size={16} style={{ color }} />
                    </div>
                    <span className="font-display text-white leading-none" style={{ fontSize: '1.4rem' }}>
                      {label.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold tracking-[0.2em] uppercase px-2.5 py-1 rounded-full shrink-0 ml-3"
                    style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
                    {cat}
                  </span>
                </div>
              ))}

              {/* Info block */}
              <div className="mt-5 mb-2 rounded-2xl p-5" style={{ background: 'rgba(255,44,145,0.08)', border: '1px solid rgba(255,44,145,0.2)' }}>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    { icon: Calendar, text: '5–8 Nov 2026' },
                    { icon: MapPin,   text: 'Gold Coast, QLD' },
                    { icon: Lock,     text: 'Invite Only' },
                    { icon: Trophy,   text: 'A Grade Premiers' },
                  ].map(({ icon: I, text }) => (
                    <span key={text} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)' }}>
                      <I size={10} />
                      {text}
                    </span>
                  ))}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  A Grade premiers from across Australia competing for the national title. Gold Coast, 5–8 November 2026.
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="px-6 py-5 shrink-0 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <button
                onClick={() => {
                  onClose()
                  setTimeout(() => document.querySelector('#invitation')?.scrollIntoView({ behavior: 'smooth' }), 300)
                }}
                className="btn-pink w-full py-4 rounded-2xl font-bold text-sm"
              >
                Request an Invitation
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
