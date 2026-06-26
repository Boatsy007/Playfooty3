import Nav from './components/layout/Nav'
import Ticker from './components/layout/Ticker'
import Footer from './components/layout/Footer'
import Hero from './components/sections/Hero'
import Stats from './components/sections/Stats'
import Experience from './components/sections/Experience'
import HowItWorks from './components/sections/HowItWorks'
import Prize from './components/sections/Prize'
import Invitation from './components/sections/Invitation'

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Ticker />
        <Hero />
        <Stats />
        <Experience />
        <HowItWorks />
        <Prize />
        <Invitation />
      </main>
      <Footer />
    </>
  )
}
