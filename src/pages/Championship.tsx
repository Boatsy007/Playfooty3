/**
 * Championship — explains the concept: Top 32 qualify, rankings from ladder data,
 * hosted on the Gold Coast, wildcard spots, and the champion's star.
 */
import { Link } from 'react-router-dom'
import { Trophy, Star, MapPin, ListOrdered, Ticket, RefreshCw } from 'lucide-react'
import Nav from '../components/layout/Nav'
import Footer from '../components/layout/Footer'
import { useSeo } from '../lib/seo'
import { INK, PANEL, PANEL_2, LINE, GOLD, PINK, CYAN, MUTE, Label } from '../components/rankings/bits'
import GlobalSearch from '../components/rankings/GlobalSearch'

const PILLARS = [
  { icon: ListOrdered, accent: GOLD, title: 'Top 32 Qualify', body: 'The 32 highest-ranked country netball A Grade teams in Australia earn a place at the national Championship. Where you sit on the national leaderboard is where you stand for qualification.' },
  { icon: RefreshCw, accent: CYAN, title: 'Ranked From Real Ladder Data', body: 'Rankings are built from live league ladder data — wins, losses, goals and percentage — weighted by the strength of the competition each team plays in. As ladders move, so do the rankings.' },
  { icon: MapPin, accent: PINK, title: 'Hosted On The Gold Coast', body: 'Qualified teams travel to the Gold Coast to compete for the national title — the definitive meeting of the country’s strongest netball clubs on one court.' },
  { icon: Ticket, accent: GOLD, title: 'Wildcard Spots', body: 'If a qualified team declines its place, the spot opens to the next eligible team — a wildcard into the Championship for clubs on the edge of the cut-off.' },
  { icon: Star, accent: GOLD, title: 'A Star Above The Crest', body: 'The Championship winner earns a star displayed above their club logo — a permanent mark of a national title, carried into every future season.' },
]

export default function Championship() {
  useSeo({
    title: 'The Country Netball Championship — Top 32 on the Gold Coast | CNCA',
    description: 'How the CNCA Championship works: the top 32 country netball A Grade teams qualify from the national rankings and compete on the Gold Coast. Rankings update from live ladder data; wildcards open when teams decline; the winner earns a star above their crest.',
    path: '/championship',
    jsonLd: {
      '@context': 'https://schema.org', '@type': 'SportsEvent', sport: 'Netball',
      name: 'CNCA Country Netball Championship',
      location: { '@type': 'Place', name: 'Gold Coast, Australia' },
      description: 'National championship for the top 32 country netball A Grade teams in Australia.',
    },
  })

  return (
    <div style={{ background: INK, minHeight: '100vh' }}>
      <Nav />
      <GlobalSearch />
      <main>
        {/* Hero */}
        <section style={{ position: 'relative', padding: '150px 20px 80px', textAlign: 'center', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(1000px 500px at 50% -10%, rgba(244,193,77,0.14), transparent 60%)` }} />
          <div style={{ position: 'relative', maxWidth: 820, margin: '0 auto' }}>
            <Label>The National Championship</Label>
            <h1 className="font-display" style={{ fontSize: 'clamp(3rem,9vw,7rem)', color: '#fff', lineHeight: 0.88, margin: '14px 0 16px' }}>
              32 TEAMS.<br /><span style={{ color: GOLD }}>ONE NATIONAL TITLE.</span>
            </h1>
            <p style={{ color: MUTE, fontSize: 17, lineHeight: 1.6, maxWidth: 620, margin: '0 auto 26px' }}>
              The best country netball clubs in Australia, ranked from real ladder data and brought together
              on the Gold Coast to decide a single national champion.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/rankings" className="btn-pink" style={{ padding: '14px 28px', fontSize: 14, letterSpacing: '0.04em' }}>View the Rankings</Link>
              <Link to="/" className="font-condensed" style={{ padding: '14px 28px', borderRadius: 999, border: `1px solid ${LINE}`, color: '#fff', textDecoration: 'none', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: 13 }}>The Event</Link>
            </div>
          </div>
        </section>

        {/* Pillars */}
        <section style={{ maxWidth: 1000, margin: '0 auto', padding: '10px 20px 70px', display: 'grid', gap: 14 }}>
          {PILLARS.map((p, i) => (
            <div key={p.title} style={{ display: 'flex', gap: 20, alignItems: 'flex-start', background: i === 0 ? PANEL_2 : PANEL, border: `1px solid ${LINE}`, borderRadius: 18, padding: '26px 26px' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.04)', border: `1px solid ${LINE}` }}>
                <p.icon size={24} color={p.accent} />
              </div>
              <div>
                <h2 className="font-display" style={{ fontSize: 30, color: '#fff', margin: '2px 0 8px', letterSpacing: '0.01em' }}>{p.title}</h2>
                <p style={{ color: MUTE, fontSize: 15.5, lineHeight: 1.65, margin: 0 }}>{p.body}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Champion band */}
        <section style={{ textAlign: 'center', padding: '10px 20px 90px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '44px 30px', borderRadius: 24, border: `1px solid rgba(244,193,77,0.35)`, background: 'linear-gradient(180deg, rgba(244,193,77,0.08), transparent)' }}>
            <Trophy size={40} color={GOLD} style={{ margin: '0 auto 14px' }} />
            <h2 className="font-display" style={{ fontSize: 'clamp(2rem,5vw,3.2rem)', color: '#fff', margin: '0 0 10px' }}>WEAR THE STAR</h2>
            <p style={{ color: MUTE, fontSize: 16, lineHeight: 1.6, maxWidth: 520, margin: '0 auto' }}>
              Win the Championship and your club carries a star above its crest — the mark of a national title, for good.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
