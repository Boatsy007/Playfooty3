import { lazy, Suspense } from 'react'
import Nav from './components/layout/Nav'
import Ticker from './components/layout/Ticker'
import Footer from './components/layout/Footer'
import Hero from './components/sections/Hero'
import Stats from './components/sections/Stats'
import { ErrorBoundary } from './components/ui/ErrorBoundary'

// Below-fold — all lazy loaded for performance
const Countdown          = lazy(() => import('./components/sections/Countdown'))
const Statement          = lazy(() => import('./components/sections/Statement'))
const Journey            = lazy(() => import('./components/sections/Journey'))
const TheWeekend         = lazy(() => import('./components/sections/TheWeekend'))
const WhyTravel          = lazy(() => import('./components/sections/WhyTravel'))
const GoldCoast          = lazy(() => import('./components/sections/GoldCoast'))
const OneNationalChampion = lazy(() => import('./components/sections/OneNationalChampion'))
const NotCompeting       = lazy(() => import('./components/sections/NotCompeting'))
const Sponsors           = lazy(() => import('./components/sections/Sponsors'))
const FAQ                = lazy(() => import('./components/sections/FAQ'))
const Invitation         = lazy(() => import('./components/sections/Invitation'))
const NationalRankingsPreview = lazy(() => import('./components/sections/NationalRankingsPreview'))

const Blank = ({ h = 400 }: { h?: number }) => (
  <div style={{ minHeight: `${h}px`, background: 'inherit' }} aria-hidden />
)

export default function App() {
  return (
    <ErrorBoundary>
      <Nav />
      <main id="main-content">
        {/* Above fold — eager */}
        <Ticker />
        <Hero />

        {/* Countdown — dark, immediately below hero */}
        <Suspense fallback={<Blank h={320} />}>
          <Countdown />
        </Suspense>

        {/* National Rankings — Top 10 leaderboard preview (dark) */}
        <Suspense fallback={<Blank h={700} />}>
          <NationalRankingsPreview />
        </Suspense>

        {/* Numbers — light bg */}
        <Stats />

        {/* Statement — dark editorial break */}
        <Suspense fallback={<Blank h={280} />}>
          <Statement />
        </Suspense>

        {/* The Road to CNCA — dark cinematic narrative */}
        <Suspense fallback={<Blank h={900} />}>
          <Journey />
        </Suspense>

        {/* The Event Experience — dark full-bleed */}
        <Suspense fallback={<Blank h={600} />}>
          <TheWeekend />
        </Suspense>

        {/* Who Attends — light grid */}
        <Suspense fallback={<Blank h={500} />}>
          <WhyTravel />
        </Suspense>

        {/* Gold Coast Experience — light into dark */}
        <Suspense fallback={<Blank h={700} />}>
          <GoldCoast />
        </Suspense>

        {/* One National Champion — dark cinematic */}
        <Suspense fallback={<Blank h={600} />}>
          <OneNationalChampion />
        </Suspense>

        {/* Not Competing? Still Come. — dark */}
        <Suspense fallback={<Blank h={700} />}>
          <NotCompeting />
        </Suspense>

        {/* Partnership Opportunities — dark */}
        <Suspense fallback={<Blank h={700} />}>
          <Sponsors />
        </Suspense>

        {/* FAQ — light */}
        <Suspense fallback={<Blank h={600} />}>
          <FAQ />
        </Suspense>

        {/* Request Invitation — dark form */}
        <Suspense fallback={<Blank h={800} />}>
          <Invitation />
        </Suspense>
      </main>
      <Footer />
    </ErrorBoundary>
  )
}
