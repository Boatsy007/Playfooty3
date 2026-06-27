import { lazy, Suspense } from 'react'
import Nav from './components/layout/Nav'
import Ticker from './components/layout/Ticker'
import Footer from './components/layout/Footer'
import Hero from './components/sections/Hero'
import Stats from './components/sections/Stats'
import { ErrorBoundary } from './components/ui/ErrorBoundary'

const TheWeekend          = lazy(() => import('./components/sections/TheWeekend'))
const Invitation          = lazy(() => import('./components/sections/Invitation'))
const Statement           = lazy(() => import('./components/sections/Statement'))
const WhoAttends          = lazy(() => import('./components/sections/WhoAttends'))
const OneNationalChampion = lazy(() => import('./components/sections/OneNationalChampion'))

const Blank = ({ h = 400 }: { h?: number }) => (
  <div style={{ minHeight: `${h}px` }} />
)

export default function App() {
  return (
    <ErrorBoundary>
      <Nav />
      <main>
        <Ticker />
        <Hero />
        <Stats />
        <Suspense fallback={<Blank h={600} />}>
          <TheWeekend />
        </Suspense>
        <Suspense fallback={<Blank h={600} />}>
          <Invitation />
        </Suspense>
        <Suspense fallback={<Blank h={400} />}>
          <Statement />
        </Suspense>
        <Suspense fallback={<Blank h={500} />}>
          <WhoAttends />
        </Suspense>
        <Suspense fallback={<Blank h={500} />}>
          <OneNationalChampion />
        </Suspense>
      </main>
      <Footer />
    </ErrorBoundary>
  )
}
