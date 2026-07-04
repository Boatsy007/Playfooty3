import { lazy, Suspense } from 'react'
import Nav from './components/layout/Nav'
import Ticker from './components/layout/Ticker'
import Footer from './components/layout/Footer'
import HomeHero from './components/home/HomeHero'
import { useHomeData } from './components/home/useHomeData'
import { ErrorBoundary } from './components/ui/ErrorBoundary'

// Below-fold sections are lazy so the masthead and leaderboard paint first.
const TopTen        = lazy(() => import('./components/home/TopTen'))
const Movers        = lazy(() => import('./components/home/Movers'))
const Featured      = lazy(() => import('./components/home/Featured'))
const LatestLeagues = lazy(() => import('./components/home/LatestLeagues'))
const HomeNews      = lazy(() => import('./components/home/HomeNews'))
const StatCards     = lazy(() => import('./components/home/StatCards'))
const HomeSearch    = lazy(() => import('./components/home/HomeSearch'))
const AboutStrip    = lazy(() => import('./components/home/AboutStrip'))

const Blank = ({ h = 420 }: { h?: number }) => (
  <div style={{ minHeight: `${h}px` }} aria-hidden />
)

/**
 * Got Netty homepage. Flows like a sports publication:
 * masthead, the national Top 10, the week's movers, spotlight league + club,
 * freshest leagues, news, statistics, search, and the closing statement.
 * One data pass (rankings + leagues) feeds every section.
 */
export default function App() {
  const home = useHomeData()

  return (
    <ErrorBoundary>
      <Nav />
      <main id="main-content">
        <Ticker />
        <HomeHero weekLabel={home.weekLabel} />

        <Suspense fallback={<Blank h={760} />}>
          <TopTen entries={home.entries} weekLabel={home.weekLabel} generatedAt={home.generatedAt} loading={home.loading} />
        </Suspense>

        <Suspense fallback={<Blank h={420} />}>
          <Movers risers={home.risers} fallers={home.fallers} loading={home.loading} />
        </Suspense>

        <Suspense fallback={<Blank h={480} />}>
          <Featured league={home.strongestLeague} club={home.featuredClub} />
        </Suspense>

        <Suspense fallback={<Blank h={320} />}>
          <LatestLeagues leagues={home.recentLeagues} loading={home.loading} />
        </Suspense>

        <Suspense fallback={<Blank h={560} />}>
          <HomeNews />
        </Suspense>

        <Suspense fallback={<Blank h={460} />}>
          <StatCards
            entries={home.entries} leagues={home.leagues}
            strongestLeague={home.strongestLeague} biggestClimber={home.biggestClimber}
            bestForm={home.bestForm} recentLeagues={home.recentLeagues}
            weekLabel={home.weekLabel} loading={home.loading}
          />
        </Suspense>

        <Suspense fallback={<Blank h={300} />}>
          <HomeSearch entries={home.entries} leagues={home.leagues} />
        </Suspense>

        <Suspense fallback={<Blank h={300} />}>
          <AboutStrip />
        </Suspense>
      </main>
      <Footer />
    </ErrorBoundary>
  )
}
