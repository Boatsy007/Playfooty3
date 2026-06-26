import PageLoader from './components/layout/PageLoader'
import ScrollProgress from './components/ui/ScrollProgress'
import CustomCursor from './components/ui/CustomCursor'
import Nav from './components/layout/Nav'
import Footer from './components/layout/Footer'
import Hero from './components/sections/Hero'
import Experience from './components/sections/Experience'
import HowItWorks from './components/sections/HowItWorks'
import WhoItsFor from './components/sections/WhoItsFor'
import Schedule from './components/sections/Schedule'
import Accommodation from './components/sections/Accommodation'
import Prize from './components/sections/Prize'
import WhyClubs from './components/sections/WhyClubs'
import Invitation from './components/sections/Invitation'
import FinalCTA from './components/sections/FinalCTA'

export default function App() {
  return (
    <>
      <PageLoader />
      <ScrollProgress />
      <CustomCursor />
      <Nav />
      <main>
        <Hero />
        <Experience />
        <HowItWorks />
        <WhoItsFor />
        <Schedule />
        <Accommodation />
        <Prize />
        <WhyClubs />
        <Invitation />
        <FinalCTA />
      </main>
      <Footer />
    </>
  )
}
