import ScrollProgress from './components/ui/ScrollProgress'
import CustomCursor from './components/ui/CustomCursor'
import Nav from './components/layout/Nav'
import Footer from './components/layout/Footer'
import Hero from './components/sections/Hero'
import Ticker from './components/ui/Ticker'
import Experience from './components/sections/Experience'
import HowItWorks from './components/sections/HowItWorks'
import BringTheClub from './components/sections/BringTheClub'
import Prize from './components/sections/Prize'
import Invitation from './components/sections/Invitation'

export default function App() {
  return (
    <>
      <CustomCursor />
      <ScrollProgress />
      <Nav />
      <main>
        <Hero />
        <Ticker />
        <Experience />
        <HowItWorks />
        <BringTheClub />
        <Prize />
        <Invitation />
      </main>
      <Footer />
    </>
  )
}
