/**
 * Championship — bright championship/event style. Explains: Top 32 qualify,
 * rankings from ladder data, Gold Coast host, wildcards, and the winner's star
 * (delivered as a premium dark feature block).
 */
import { Link } from 'react-router-dom'
import { Trophy, Star, MapPin, ListOrdered, Ticket, RefreshCw } from 'lucide-react'
import RankingsNav from '../components/rankings/RankingsNav'
import Footer from '../components/layout/Footer'
import { useSeo } from '../lib/seo'
import { PAGE, PAGE_ALT, TEXT, LINE, GOLD_DK, PINK, MUTE, DARK, Eyebrow } from '../components/rankings/bits'

const PILLARS = [
  { icon: ListOrdered, title: 'Top 32 Qualify', body: 'The 32 highest-ranked country netball A Grade teams in Australia earn a place at the national Championship. Where you sit on the national leaderboard is where you stand for qualification.' },
  { icon: RefreshCw, title: 'Ranked From Real Ladder Data', body: 'Rankings are built from live league ladder data — wins, losses, goals and percentage — weighted by the strength of the competition each team plays in. As ladders move, so do the rankings.' },
  { icon: MapPin, title: 'Hosted On The Gold Coast', body: 'Qualified teams travel to the Gold Coast to compete for the national title — the definitive meeting of the country’s strongest netball clubs on one court.' },
  { icon: Ticket, title: 'Wildcard Spots', body: 'If a qualified team declines its place, the spot opens to the next eligible team — a wildcard into the Championship for clubs on the edge of the cut-off.' },
]

export default function Championship() {
  useSeo({
    title: 'The Country Netball Championship — Top 32 on the Gold Coast | CNCA',
    description: 'How the CNCA Championship works: the top 32 country netball A Grade teams qualify from the national rankings and compete on the Gold Coast. Rankings update from live ladder data; wildcards open when teams decline; the winner earns a star above their crest.',
    path: '/championship',
    jsonLd: { '@context': 'https://schema.org', '@type': 'SportsEvent', sport: 'Netball', name: 'CNCA Country Netball Championship', location: { '@type': 'Place', name: 'Gold Coast, Australia' }, description: 'National championship for the top 32 country netball A Grade teams in Australia.' },
  })

  return (
    <div style={{ background: PAGE, minHeight: '100vh' }}>
      <RankingsNav />

      {/* Hero */}
      <section style={{ position: 'relative', overflow: 'hidden', background: PAGE_ALT, borderBottom: `1px solid ${LINE}` }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(760px 380px at 50% -10%, rgba(244,193,77,0.22), transparent 60%), radial-gradient(600px 300px at 12% 0%, rgba(255,44,145,0.10), transparent 60%)' }} />
        <div style={{ position: 'relative', maxWidth: 900, margin: '0 auto', padding: '56px 20px 52px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex' }}><Eyebrow accent={GOLD_DK}>The National Championship</Eyebrow></div>
          <h1 className="font-display" style={{ fontSize: 'clamp(3rem,10vw,7rem)', color: TEXT, lineHeight: 0.86, margin: '16px 0 16px' }}>
            32 TEAMS.<br /><span style={{ color: PINK }}>ONE NATIONAL TITLE.</span>
          </h1>
          <p style={{ color: MUTE, fontSize: 17, lineHeight: 1.6, maxWidth: 600, margin: '0 auto 26px' }}>
            The best country netball clubs in Australia, ranked from real ladder data and brought together
            on the Gold Coast to decide a single national champion.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/rankings" className="btn-pink" style={{ padding: '15px 30px', fontSize: 14, letterSpacing: '0.04em' }}>View the Rankings</Link>
            <Link to="/" className="font-condensed" style={{ padding: '15px 30px', borderRadius: 999, border: `1px solid ${TEXT}`, color: TEXT, textDecoration: 'none', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: 13 }}>The Event</Link>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section style={{ maxWidth: 980, margin: '0 auto', padding: '20px 20px 30px' }}>
        {PILLARS.map((p, i) => (
          <div key={p.title} style={{ display: 'flex', gap: 22, alignItems: 'flex-start', padding: '30px 0', borderBottom: `1px solid ${LINE}` }}>
            <div className="font-display" style={{ fontSize: 40, color: 'rgba(17,17,17,0.14)', minWidth: 54, lineHeight: 1 }}>{String(i + 1).padStart(2, '0')}</div>
            <div style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0, display: 'grid', placeItems: 'center', background: PAGE_ALT, border: `1px solid ${LINE}` }}>
              <p.icon size={22} color={PINK} />
            </div>
            <div>
              <h2 className="font-display" style={{ fontSize: 30, color: TEXT, margin: '0 0 8px', lineHeight: 1 }}>{p.title.toUpperCase()}</h2>
              <p style={{ color: MUTE, fontSize: 15.5, lineHeight: 1.65, margin: 0 }}>{p.body}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Champion feature block — premium dark */}
      <section style={{ background: DARK, padding: '70px 20px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <Trophy size={40} color="#f4c14d" style={{ margin: '0 auto 16px' }} />
          <div className="font-condensed" style={{ color: '#f4c14d', fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase', fontSize: 11, marginBottom: 10 }}>The Champion’s Mark</div>
          <h2 className="font-display" style={{ fontSize: 'clamp(2.4rem,6vw,4rem)', color: '#fff', margin: '0 0 12px', lineHeight: 0.9 }}>WEAR THE STAR</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, lineHeight: 1.6, maxWidth: 520, margin: '0 auto 24px' }}>
            Win the Championship and your club carries a <Star size={15} color="#f4c14d" fill="#f4c14d" style={{ verticalAlign: '-2px' }} /> star above its crest — the mark of a national title, for good.
          </p>
          <Link to="/rankings" className="btn-pink" style={{ padding: '15px 30px', fontSize: 14, letterSpacing: '0.04em' }}>See Who’s Qualifying</Link>
        </div>
      </section>
      <Footer />
    </div>
  )
}
