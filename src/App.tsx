import Nav from './components/layout/Nav'
import Footer from './components/layout/Footer'
import Hero from './components/sections/Hero'
import MoreThanTournament from './components/sections/MoreThanTournament'
import BringTheClub from './components/sections/BringTheClub'
import HowItWorks from './components/sections/HowItWorks'
import Schedule from './components/sections/Schedule'
import TravelExperience from './components/sections/TravelExperience'
import Testimonials from './components/sections/Testimonials'
import Grant from './components/sections/Grant'
import RequestInvitation from './components/sections/RequestInvitation'
import FinalCTA from './components/sections/FinalCTA'

export default function App() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      <Nav />
      <main>
        <Hero />
        <MoreThanTournament />
        <BringTheClub />
        <HowItWorks />
        <Schedule />
        <TravelExperience />
        <Testimonials />
        <Grant />
        <RequestInvitation />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
