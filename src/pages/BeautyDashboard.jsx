import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, ArrowRight, Star, MapPin, Heart,
  ShoppingBag, Home, Crown, Calculator, Calendar,
  CheckCircle2, Zap, User,
} from 'lucide-react'
import MainLayout from '../layouts/MainLayout'
import { useBeautyProfile } from '../context/BeautyProfileContext'
import { salons } from '../data/salons'

const QUICK_ACTIONS = [
  { icon: <MapPin size={20} />,      label: 'Explore Salons',       href: '/salons',      color: 'from-glow-gold to-amber-400' },
  { icon: <Crown size={20} />,       label: 'Plan My Wedding',      href: '/bridal',      color: 'from-glow-rose to-pink-300' },
  { icon: <Home size={20} />,        label: 'At-Home Services',     href: '/at-home',     color: 'from-emerald-400 to-teal-400' },
  { icon: <Calculator size={20} />,  label: 'Optimise My Budget',   href: '/budget',      color: 'from-purple-400 to-violet-400' },
  { icon: <Star size={20} />,        label: 'Premium Experiences',  href: '/experiences', color: 'from-blue-400 to-cyan-400' },
]

const BEAUTY_TIPS = [
  'Use a silk pillowcase to reduce overnight hair breakage and frizz.',
  'Apply SPF 50 every morning — Mumbai humidity amplifies UV damage.',
  'Double-cleanse at night to remove pollution and makeup thoroughly.',
  'Stay hydrated: Mumbai heat dehydrates skin faster than you realise.',
]

export default function BeautyDashboard() {
  const navigate = useNavigate()
  const { profile, analysis } = useBeautyProfile()

  const userName = profile?.name || 'Your'
  const topSalons = (analysis?.salonMatches || [1, 4, 2]).map((id) => salons.find((s) => s.id === id)).filter(Boolean)

  const profileData = [
    { label: 'Face Shape',     value: analysis?.faceShape || 'Oval' },
    { label: 'Skin Tone',      value: analysis?.skinTone  || 'Medium Warm' },
    { label: 'Hair Type',      value: profile?.hairType   || 'Wavy' },
    { label: 'Skin Concern',   value: profile?.skinConcern || 'Combination' },
    { label: 'Budget Type',    value: analysis?.budgetCategory || 'Mid-Range' },
  ]

  return (
    <MainLayout>
      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* ── Welcome ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-10">
            <span className="inline-flex items-center gap-2 text-glow-gold font-inter text-xs uppercase tracking-widest mb-3">
              <Sparkles size={12} /> Your Beauty Concierge
            </span>
            <h1 className="font-playfair text-4xl font-medium text-glow-black mb-2">
              Welcome back,{' '}
              <span className="italic text-glow-gold">{userName}</span>
            </h1>
            <p className="font-inter text-sm text-glow-muted">
              Here's your personalised beauty dashboard — curated just for you.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* ── Left Column ── */}
            <div className="lg:col-span-1 space-y-6">
              {/* Profile Card */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-glow-black rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-glow-gold to-glow-rose overflow-hidden">
                    {profile?.photoPreview
                      ? <img src={profile.photoPreview} alt="profile" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><User size={22} className="text-white" /></div>
                    }
                  </div>
                  <div>
                    <p className="font-playfair text-white text-sm font-semibold">{userName}</p>
                    <p className="font-inter text-xs text-glow-gold">Beauty Profile Active</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {profileData.map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-2 border-b border-white/8 last:border-0">
                      <span className="font-inter text-xs text-white/45">{row.label}</span>
                      <span className="font-inter text-xs font-medium text-white capitalize">{row.value}</span>
                    </div>
                  ))}
                </div>

                <button onClick={() => navigate('/profile-setup')} className="btn-outline-gold w-full mt-5 text-sm py-2.5">
                  Update Profile
                </button>
              </motion.div>

              {/* Beauty Tips */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-luxury p-6">
                <h3 className="font-playfair text-base font-semibold text-glow-black mb-4 flex items-center gap-2">
                  <Zap size={15} className="text-glow-gold" /> AI Beauty Tips
                </h3>
                <div className="space-y-3">
                  {(analysis?.beautyTips || BEAUTY_TIPS).map((tip, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 size={13} className="text-glow-gold shrink-0 mt-0.5" />
                      <p className="font-inter text-xs text-glow-muted leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* ── Right Column ── */}
            <div className="lg:col-span-2 space-y-8">
              {/* Quick Actions */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <h2 className="font-playfair text-xl font-semibold text-glow-black mb-4">Your Beauty Modules</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {QUICK_ACTIONS.map((action, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate(action.href)}
                      className="card-luxury p-5 text-left group hover:shadow-luxury"
                    >
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform duration-200`}>
                        {action.icon}
                      </div>
                      <p className="font-inter text-sm font-medium text-glow-black leading-snug">{action.label}</p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Recommended Hairstyles */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-luxury p-6">
                <h2 className="font-playfair text-xl font-semibold text-glow-black mb-4">Recommended for You</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <p className="font-inter text-xs uppercase tracking-widest text-glow-gold mb-3">Hairstyles</p>
                    <div className="space-y-2">
                      {(analysis?.hairstyles || ['Soft Layers', 'Beach Waves', 'Textured Lob']).map((style) => (
                        <div key={style} className="flex items-center gap-2.5 p-2.5 bg-glow-bg rounded-xl">
                          <div className="w-1.5 h-1.5 bg-glow-gold rounded-full" />
                          <span className="font-inter text-sm text-glow-black">{style}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-inter text-xs uppercase tracking-widest text-glow-gold mb-3">Treatments</p>
                    <div className="space-y-2">
                      {(analysis?.treatments || ['Hydrating Facial', 'Moisture Boost', 'Oil Infusion Mask']).map((t) => (
                        <div key={t} className="flex items-center gap-2.5 p-2.5 bg-glow-bg rounded-xl">
                          <div className="w-1.5 h-1.5 bg-glow-rose rounded-full" />
                          <span className="font-inter text-sm text-glow-black">{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Top Salon Matches */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-playfair text-xl font-semibold text-glow-black">Your Matched Salons</h2>
                  <button onClick={() => navigate('/salons')} className="font-inter text-xs text-glow-gold flex items-center gap-1 hover:gap-2 transition-all">
                    View all <ArrowRight size={13} />
                  </button>
                </div>
                <div className="space-y-3">
                  {topSalons.map((salon, i) => (
                    <motion.div
                      key={salon.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.08 }}
                      onClick={() => navigate(`/salons/${salon.id}`)}
                      className="card-luxury p-4 flex items-center gap-4 cursor-pointer hover:shadow-luxury"
                    >
                      <img src={salon.image} alt={salon.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <p className="font-playfair text-sm font-semibold text-glow-black truncate">{salon.name}</p>
                          <span className="font-inter text-xs font-semibold text-glow-gold ml-2 shrink-0">
                            {98 - i * 3}% match
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <MapPin size={10} className="text-glow-muted" />
                          <span className="font-inter text-xs text-glow-muted">{salon.location}</span>
                          <Star size={10} className="text-glow-gold fill-glow-gold ml-1" />
                          <span className="font-inter text-xs text-glow-black font-medium">{salon.rating}</span>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); navigate('/booking') }} className="btn-gold py-2 px-4 text-xs shrink-0">
                        Book
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}