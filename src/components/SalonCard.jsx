import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Star, MapPin, CheckCircle2 } from 'lucide-react'

export default function SalonCard({ salon }) {
  const navigate = useNavigate()
  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      onClick={() => navigate(`/salons/${salon.id}`)}
      className="card-luxury overflow-hidden cursor-pointer group"
    >
      {/* Image */}
      <div className="relative h-52 overflow-hidden">
        <img src={salon.image} alt={salon.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-glow-black/40 to-transparent" />
        {salon.badge && (
          <span className="absolute top-3 left-3 bg-glow-gold text-white text-xs font-inter font-medium px-2.5 py-1 rounded-full">
            {salon.badge}
          </span>
        )}
        {salon.verified && (
          <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-xs font-inter px-2 py-1 rounded-full flex items-center gap-1">
            <CheckCircle2 size={11} className="text-glow-gold" /> Verified
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-1.5">
          <h3 className="font-playfair text-base font-semibold text-glow-black leading-snug">{salon.name}</h3>
          <span className="font-inter text-sm text-glow-muted ml-2 shrink-0">{salon.priceRange}</span>
        </div>

        <div className="flex items-center gap-1 mb-2.5">
          <MapPin size={12} className="text-glow-gold" />
          <span className="font-inter text-xs text-glow-muted">{salon.location}</span>
        </div>

        <div className="flex items-center gap-2 mb-3.5">
          <Star size={12} className="text-glow-gold fill-glow-gold" />
          <span className="font-inter text-sm font-semibold text-glow-black">{salon.rating}</span>
          <span className="font-inter text-xs text-glow-muted">({salon.reviewCount} reviews)</span>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {salon.specialties.slice(0, 3).map((s) => (
            <span key={s} className="text-xs font-inter bg-glow-border text-glow-muted px-2.5 py-0.5 rounded-full">{s}</span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-glow-border">
          <span className="font-inter text-xs text-glow-muted">From ₹{salon.priceFrom.toLocaleString()}</span>
          <button onClick={(e) => { e.stopPropagation(); navigate('/booking') }} className="btn-gold py-2 px-4 text-xs">Book Now</button>
        </div>
      </div>
    </motion.div>
  )
}