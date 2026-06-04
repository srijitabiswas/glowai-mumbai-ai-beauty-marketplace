import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, SlidersHorizontal, Star, X } from 'lucide-react'
import MainLayout from '../layouts/MainLayout'
import SalonCard  from '../components/SalonCard'
import SectionHeader from '../components/SectionHeader'
import { salons } from '../data/salons'

const AREAS   = ['All', 'Bandra', 'Andheri', 'Powai', 'Juhu', 'Lower Parel', 'South Mumbai']
const RATINGS = ['All', '4.9+', '4.7+', '4.5+']
const BUDGETS = ['All', 'Under ₹1,500', '₹1,500–₹3,000', 'Above ₹3,000']

export default function SalonMarketplace() {
  const [query,  setQuery]  = useState('')
  const [area,   setArea]   = useState('All')
  const [rating, setRating] = useState('All')
  const [budget, setBudget] = useState('All')

  const filtered = salons.filter((s) => {
    const qMatch = s.name.toLowerCase().includes(query.toLowerCase()) || s.location.toLowerCase().includes(query.toLowerCase())
    const aMatch = area === 'All' || s.area === area
    const rMatch = rating === 'All' || s.rating >= parseFloat(rating)
    const bMatch = budget === 'All' ||
      (budget === 'Under ₹1,500' && s.priceFrom < 1500) ||
      (budget === '₹1,500–₹3,000' && s.priceFrom >= 1500 && s.priceFrom <= 3000) ||
      (budget === 'Above ₹3,000' && s.priceFrom > 3000)
    return qMatch && aMatch && rMatch && bMatch
  })

  return (
    <MainLayout>
      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <SectionHeader
            badge="150+ Verified"
            title="Mumbai Salon Marketplace"
            subtitle="Discover and book from Mumbai's finest curated salons — filtered for your preferences."
          />

          {/* Search */}
          <div className="relative mb-6">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-glow-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by salon name or area…"
              className="w-full pl-11 pr-4 py-3.5 border border-glow-border rounded-full font-inter text-sm text-glow-black bg-glow-surface outline-none focus:border-glow-gold transition-colors shadow-card"
            />
            {query && <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2"><X size={14} className="text-glow-muted" /></button>}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-8">
            {/* Area */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="font-inter text-xs text-glow-muted uppercase tracking-wider">Area:</span>
              {AREAS.map((a) => (
                <button key={a} onClick={() => setArea(a)} className={`px-3.5 py-1.5 rounded-full border font-inter text-xs transition-all duration-200 ${area === a ? 'bg-glow-gold text-white border-glow-gold' : 'bg-glow-surface border-glow-border text-glow-muted hover:border-glow-gold'}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
            <p className="font-inter text-sm text-glow-muted">
              Showing <span className="font-semibold text-glow-black">{filtered.length}</span> salons
            </p>
            <div className="flex items-center gap-2">
              <span className="font-inter text-xs text-glow-muted">Rating:</span>
              {RATINGS.map((r) => (
                <button key={r} onClick={() => setRating(r)} className={`px-3 py-1 rounded-full border font-inter text-xs transition-all duration-200 ${rating === r ? 'bg-glow-gold text-white border-glow-gold' : 'bg-glow-surface border-glow-border text-glow-muted hover:border-glow-gold'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((salon, i) => (
                <motion.div key={salon.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <SalonCard salon={salon} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="font-playfair text-xl text-glow-muted">No salons found for those filters.</p>
              <button onClick={() => { setQuery(''); setArea('All'); setRating('All') }} className="btn-gold mt-5">Clear Filters</button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}