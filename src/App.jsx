import { Routes, Route } from 'react-router-dom'
import { BeautyProfileProvider } from './context/BeautyProfileContext'
import LandingPage        from './pages/LandingPage'
import BeautyProfileSetup from './pages/BeautyProfileSetup'
import AIAnalysis         from './pages/AIAnalysis'
import BeautyDashboard    from './pages/BeautyDashboard'
import SalonMarketplace   from './pages/SalonMarketplace'
import SalonDetail        from './pages/SalonDetail'
import BudgetOptimizer    from './pages/BudgetOptimizer'
import BridalPlanner      from './pages/BridalPlanner'
import AtHomeServices     from './pages/AtHomeServices'
import PremiumExperiences from './pages/PremiumExperiences'
import BookingPage        from './pages/BookingPage'
import BookingConfirmation from './pages/BookingConfirmation'

export default function App() {
  return (
    <BeautyProfileProvider>
      <Routes>
        <Route path="/"                  element={<LandingPage />} />
        <Route path="/profile-setup"     element={<BeautyProfileSetup />} />
        <Route path="/analyzing"         element={<AIAnalysis />} />
        <Route path="/dashboard"         element={<BeautyDashboard />} />
        <Route path="/salons"            element={<SalonMarketplace />} />
        <Route path="/salons/:id"        element={<SalonDetail />} />
        <Route path="/budget"            element={<BudgetOptimizer />} />
        <Route path="/bridal"            element={<BridalPlanner />} />
        <Route path="/at-home"           element={<AtHomeServices />} />
        <Route path="/experiences"       element={<PremiumExperiences />} />
        <Route path="/booking"           element={<BookingPage />} />
        <Route path="/booking/confirmed" element={<BookingConfirmation />} />
      </Routes>
    </BeautyProfileProvider>
  )
}