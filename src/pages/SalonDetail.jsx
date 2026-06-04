import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Star, MapPin, CheckCircle2, Clock, ArrowLeft, Calendar } from 'lucide-react'
import MainLayout from '../layouts/MainLayout'
import { salons } from '../data/salons'

const REVIEWS = [
  { name: 'Sneha R.', rating: 5, date: 'May 2025', text: 'Absolutely stunning experience. The bridal package was worth every rupee. Ananya is an artist.' },
  { name: 'Priya M.', rating: 5, date: 'April 2025', text: 'Best haircut of my life. The consultation was thorough, the result was perfect.' },
  { name: 'Aisha K.', rating: 4, date: 'March 2025', text: 'Premium ambience, skilled staff. Slightly long wait but the result was incredible.' },
]

export default function SalonDetail() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const salon      = salons.find((s) => s.id === parseInt(id))
  const [slot, setSlot]         = useState(null)
  const [activeImg, setActiveImg] = useState(0)

  if (!salon) return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="font-playfair text-2xl text-glow-muted">Salon not found.</p>
          <button onClick={() => navigate('/salons')} className="btn-gold mt-5">Back to Salons</button>
        </div>
      </div>
    </MainLayout>
  )

  return (
    <MainLayout>
      <div className="pt-20 pb-20 min-h-screen">
        {/* Hero Image */}
        <div className="relative h-72 sm:h-96 overflow-hidden">
          <img src={salon.gallery[activeImg]} alt={salon.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-glow-black/60 to-transparent" />
          <button onClick={() => navigate('/salons')} className="absolute top-6 left-6 bg-white/90 backdrop-blur-sm rounded-full p-2 hover:bg-white transition-colors">
            <ArrowLeft size={18} className="text-glow-black" />
          </button>
          {salon.badge && (
            <span className="absolute top-6 right-6 bg-glow-gold text-white text-sm font-inter font-medium px-4 py-1.5 rounded-full">
              {salon.badge}
            </span>
          )}
          <div className="absolute bottom-6 left-6 right-6">
            <h1 className="font-playfair text-3xl sm:text-4xl font-semibold text-white mb-1">{salon.name}</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <MapPin size={14} className="text-glow-gold" />
                <span className="font-inter text-sm text-white/80">{salon.location}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star size={14} className="text-glow-gold fill-glow-gold" />
                <span className="font-inter text-sm text-white font-semibold">{salon.rating}</span>
                <span className="font-inter text-sm text-white/60">({salon.reviewCount})</span>
              </div>
              {salon.verified && (
                <span className="flex items-center gap-1 text-xs font-inter text-glow-gold">
                  <CheckCircle2 size={13} /> Verified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Thumbnail Gallery */}
        <div className="bg-glow-black px-4 sm:px-8 py-4">
          <div className="max-w-7xl mx-auto flex gap-3 overflow-x-auto">
            {salon.gallery.map((img, i) => (
              <button key={i} onClick={() => setActiveImg(i)} className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${activeImg === i ? 'border-glow-gold' : 'border-transparent opacity-60'}`}>
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid lg:grid-cols-3 gap-10">
            {/* Left */}
            <div className="lg:col-span-2 space-y-10">
              {/* About */}
              <div>
                <h2 className="font-playfair text-2xl font-semibold text-glow-black mb-3">About</h2>
                <p className="font-inter text-sm text-glow-muted leading-relaxed">{salon.description}</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {salon.tags.map((tag) => (
                    <span key={tag} className="font-inter text-xs bg-glow-gold/10 text-glow-gold border border-glow-gold/30 px-3 py-1 rounded-full">{tag}</span>
                  ))}
                </div>
              </div>

              {/* Services */}
              <div>
                <h2 className="font-playfair text-2xl font-semibold text-glow-black mb-5">Services & Pricing</h2>
                <div className="space-y-3">
                  {salon.services.map((svc, i) => (
                    <motion.div key={i} whileHover={{ x: 4 }} className="card-luxury p-4 flex items-center justify-between cursor-default">
                      <div>
                        <p className="font-inter text-sm font-semibold text-glow-black">{svc.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Clock size={11} className="text-glow-muted" />
                          <span className="font-inter text-xs text-glow-muted">{svc.duration}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-playfair text-base font-semibold text-glow-gold">₹{svc.price.toLocaleString()}</p>
                        <button onClick={() => navigate('/booking')} className="font-inter text-xs text-glow-muted hover:text-glow-gold transition-colors mt-0.5">Book →</button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Reviews */}
              <div>
                <h2 className="font-playfair text-2xl font-semibold text-glow-black mb-5">Client Reviews</h2>
                <div className="space-y-4">
                  {REVIEWS.map((rev, i) => (
                    <div key={i} className="card-luxury p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-glow-gold to-glow-rose flex items-center justify-center text-white text-xs font-semibold">
                            {rev.name[0]}
                          </div>
                          <span className="font-inter text-sm font-semibold text-glow-black">{rev.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {[...Array(rev.rating)].map((_, j) => <Star key={j} size={12} className="text-glow-gold fill-glow-gold" />)}
                          <span className="font-inter text-xs text-glow-muted ml-1">{rev.date}</span>
                        </div>
                      </div>
                      <p className="font-inter text-sm text-glow-muted leading-relaxed italic">"{rev.text}"</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Booking Panel */}
            <div className="lg:col-span-1">
              <div className="card-luxury p-6 sticky top-24">
                <h3 className="font-playfair text-xl font-semibold text-glow-black mb-1">Book Appointment</h3>
                <p className="font-inter text-xs text-glow-muted mb-5">Select a time slot to get started.</p>

                <div className="mb-5">
                  <p className="font-inter text-xs font-semibold text-glow-black uppercase tracking-wider mb-3">Available Today</p>
                  <div className="grid grid-cols-2 gap-2">
                    {salon.slots.map((s) => (
                      <button key={s} onClick={() => setSlot(s)} className={`py-2.5 px-3 rounded-xl border font-inter text-xs font-medium transition-all duration-200 ${slot === s ? 'bg-glow-gold text-white border-glow-gold' : 'border-glow-border text-glow-muted hover:border-glow-gold'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-t border-glow-border mb-4">
                  <span className="font-inter text-sm text-glow-muted">Starting from</span>
                  <span className="font-playfair text-xl font-semibold text-glow-gold">₹{salon.priceFrom.toLocaleString()}</span>
                </div>

                <button
                  onClick={() => navigate('/booking')}
                  className={`btn-gold w-full text-sm py-3.5 ${!slot ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <Calendar size={15} /> Confirm Appointment
                </button>

                <p className="font-inter text-xs text-glow-muted text-center mt-3">No cancellation fee within 2 hours</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}