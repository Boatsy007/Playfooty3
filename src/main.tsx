import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import ClubPackages from './pages/ClubPackages.tsx'
import PowerRankings from './pages/PowerRankings.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/club-packages" element={<ClubPackages />} />
        <Route path="/power-rankings" element={<PowerRankings />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
