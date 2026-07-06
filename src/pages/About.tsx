/**
 * About PlayFooty — mission and how the prototype rankings work. Editorial, static.
 */
import Nav from '../components/layout/Nav'
import Footer from '../components/layout/Footer'
import { Link } from 'react-router-dom'
import { useSeo } from '../lib/seo'

const TEXT = '#111111'
const PINK = '#d71920'
const MUTE = 'rgba(17,17,17,0.55)'

export default function About() {
  useSeo({
    title: 'About PlayFooty — Australia’s community football platform',
    description: 'PlayFooty is Australia’s community football platform: a prototype for rankings, league ladders, club profiles, results and local footy stories.',
    path: '/about',
  })

  return (
    <>
      <Nav />
      <main style={{ background: '#ffffff' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '56px 20px 90px' }}>
          <p className="font-condensed font-bold tracking-[0.28em] uppercase" style={{ fontSize: '0.72rem', color: PINK, marginBottom: 16 }}>
            About
          </p>
          <h1 className="font-display leading-none" style={{ fontSize: 'clamp(2.6rem, 6vw, 5rem)', color: TEXT, marginBottom: 24 }}>
            AUSTRALIA’S COMMUNITY<br /><span style={{ color: PINK }}>FOOTBALL PLATFORM</span>
          </h1>

          <div style={{ color: MUTE, fontSize: 16.5, lineHeight: 1.75, display: 'grid', gap: 18 }}>
            <p>
              PlayFooty exists to help answer one question clearly: <strong style={{ color: TEXT }}>what is happening across
              community football clubs and leagues in Australia?</strong>
            </p>
            <p>
              The prototype is built to integrate with official competition data where available, while also supporting manually managed league, ladder and result data when API access is not yet available.
            </p>
            <p>
              PlayFooty is designed for clubs, leagues, supporters and partners: rankings, results, ladders, fixtures, statistics and editorial coverage in one public sports-media experience.
            </p>
            <p>
              Rankings. Results. Ladders. Clubs. News. Built for local footy and ready for official competition feeds when they are available.
            </p>
          </div>

          <div style={{ marginTop: 36, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/rankings" className="btn-pink font-bold rounded-full" style={{ fontSize: '0.85rem', padding: '0.95rem 2.2rem', letterSpacing: '0.06em', textDecoration: 'none' }}>
              VIEW NATIONAL RANKINGS
            </Link>
            <Link to="/leagues" className="font-semibold rounded-full border-2" style={{ fontSize: '0.85rem', padding: '0.95rem 2rem', letterSpacing: '0.06em', borderColor: 'rgba(17,17,17,0.15)', color: MUTE, textDecoration: 'none' }}>
              BROWSE LEAGUES
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
