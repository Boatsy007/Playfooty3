import { lazy, Suspense } from 'react'
import Nav from './components/layout/Nav'
import Ticker from './components/layout/Ticker'
import Footer from './components/layout/Footer'
import Hero from './components/sections/Hero'
import Stats from './components/sections/Stats'
import { ErrorBoundary } from './components/ui/ErrorBoundary'

// Lazy load everything below the fold
const Experience = lazy(() => import('./components/sections/Experience'))
const HowItWorks = lazy(() => import('./components/sections/HowItWorks'))
const Prize = lazy(() => import('./components/sections/Prize'))
const Invitation = lazy(() => import('./components/sections/Invitation'))

// Minimal height fallbacks prevent layout shift during chunk load
const SectionFallback = ({ h = 400 }: { h?: number }) => (
  <div style={{ minHeight: `${h}px`, background: 'transparent' }} />
)

export default function App() {
  return (
    <ErrorBoundary>
      <Nav />
      <main>
        <Ticker />
        <Hero />
        <Stats />
        <Suspense fallback={<SectionFallback h={600} />}>
          <Experience />
        </Suspense>
        <Suspense fallback={<SectionFallback h={500} />}>
          <HowItWorks />
        </Suspense>
        <Suspense fallback={<SectionFallback h={400} />}>
          <Prize />
        </Suspense>
        <Suspense fallback={<SectionFallback h={600} />}>
          <Invitation />
        </Suspense>
      </main>
      <Footer />
    </ErrorBoundary>
  )
}
