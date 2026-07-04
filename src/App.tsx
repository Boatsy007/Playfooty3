import { lazy, Suspense } from 'react'
import Nav from './components/layout/Nav'
import Ticker from './components/layout/Ticker'
import Footer from './components/layout/Footer'
import Hero from './components/sections/Hero'
import Stats from './components/sections/Stats'
import { ErrorBoundary } from './components/ui/ErrorBoundary'

// Below-fold — lazy loaded for performance
const NationalRankingsPreview = lazy(() => import('./components/sections/NationalRankingsPreview'))

const Blank = ({ h = 400 }: { h?: number }) => (
  <div style={{ minHeight: `${h}px`, background: 'inherit' }} aria-hidden />
)

/**
 * Got Netty homepage — rankings-first. Hero (positioning + CTAs), the national
 * Top 10 leaderboard, and the platform-coverage stats band. The V1 event
 * sections are retired from the page (components remain in the repo for reuse).
 */
export default function App() {
  return (
    <ErrorBoundary>
      <Nav />
      <main id="main-content">
        {/* Above fold — eager */}
        <Ticker />
        <Hero />

        {/* National Rankings — Top 10 leaderboard preview */}
        <Suspense fallback={<Blank h={700} />}>
          <NationalRankingsPreview />
        </Suspense>

        {/* Coverage — one national picture */}
        <Stats />
      </main>
      <Footer />
    </ErrorBoundary>
  )
}
