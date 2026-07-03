import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import './index.css'
import App from './App.tsx'
import ClubPackages from './pages/ClubPackages.tsx'
import PowerRankings from './pages/PowerRankings.tsx'
import Directory from './pages/Directory.tsx'
import FullRankings from './pages/FullRankings.tsx'
import TeamProfile from './pages/TeamProfile.tsx'
import LeagueProfile from './pages/LeagueProfile.tsx'
import Leagues from './pages/Leagues.tsx'
import Championship from './pages/Championship.tsx'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/club-packages" element={<ClubPackages />} />
        <Route path="/power-rankings" element={<PowerRankings />} />
        <Route path="/rankings" element={<FullRankings />} />
        <Route path="/team/:clubId" element={<TeamProfile />} />
        <Route path="/league/:leagueId" element={<LeagueProfile />} />
        <Route path="/leagues" element={<Leagues />} />
        <Route path="/championship" element={<Championship />} />
        <Route path="/directory" element={<Directory />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
