/**
 * About PlayFooty — mission and how the rankings work. Editorial, static.
 */
import Nav from '../components/layout/Nav'
import Footer from '../components/layout/Footer'
import { Link } from 'react-router-dom'
import { useSeo } from '../lib/seo'

const TEXT = '#111111'
const PINK = '#ff2c91'
const MUTE = 'rgba(17,17,17,0.55)'

export default function About() {
  useSeo({
    title: 'About PlayFooty — Australia\'s Home of Community Football',
    description: 'PlayFooty is Australia\'s home of Community Football: the definitive national rankings, league ladders, club profiles and news for country and regional football.',
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
            AUSTRALIA'S HOME OF<br /><span style={{ color: PINK }}>Community Football</span>
          </h1>

          <div style={{ color: MUTE, fontSize: 16.5, lineHeight: 1.75, display: 'grid', gap: 18 }}>
            <p>
              PlayFooty exists to answer one question better than anyone else: <strong style={{ color: TEXT }}>who are the
              best Community Football clubs and leagues in Australia?</strong>
            </p>
            <p>
              Every week of the season we collect A Grade results and ladders from country and regional leagues across
              the nation — football leagues, regional associations, every state and territory — and rank every
              club on one national ladder.
            </p>
            <p>
              Rankings are never based on ladder position alone. Each club's power rating weighs its win record,
              percentage, attacking and defensive numbers, recent form, consistency and the strength of the league it
              plays in — and each league's strength is itself calculated from how its clubs rate nationally. Every rating
              comes with its reasoning, so you can always see <em>why</em> a club sits where it does.
            </p>
            <p>
              Rankings. Ladders. Clubs. News. Updated every week — so every Monday morning, Community Football knows where
              it stands.
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
