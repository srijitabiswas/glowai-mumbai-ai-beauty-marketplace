import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Check } from 'lucide-react'
import { useBeautyProfile } from '../context/BeautyProfileContext'
import { analyzeBeautyProfile } from '../services/aiService'

const STEPS = [
  'Analysing your preferences',
  'Understanding beauty goals',
  'Matching Mumbai salons',
  'Creating personalised recommendations',
]

export default function AIAnalysis() {
  const navigate = useNavigate()
  const { profile, saveAnalysis } = useBeautyProfile()
  const [current, setCurrent]     = useState(0)
  const [done, setDone]           = useState(false)

  useEffect(() => {
    if (!profile) { navigate('/profile-setup'); return }

    const run = async () => {
      for (let i = 0; i < STEPS.length; i++) {
        await new Promise((r) => setTimeout(r, 750))
        setCurrent(i + 1)
      }
      const result = await analyzeBeautyProfile(profile)
      saveAnalysis(result)
      setDone(true)
      setTimeout(() => navigate('/dashboard'), 900)
    }
    run()
  }, [])

  return (
    <div className="min-h-screen bg-glow-black flex flex-col items-center justify-center px-4" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(201,168,106,0.12) 0%, #1A1A1A 60%)' }}>
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-2 mb-16"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-glow-gold to-glow-rose rounded-full flex items-center justify-center">
          <Sparkles size={18} className="text-white" />
        </div>
        <span className="font-playfair text-2xl font-semibold text-white">GlowAI</span>
      </motion.div>

      {/* Pulse ring */}
      <div className="relative mb-14">
        <motion.div
          animate={{ scale: [1, 1.18, 1], opacity: [0.35, 0.12, 0.35] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 m-auto w-28 h-28 rounded-full bg-glow-gold"
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="w-20 h-20 relative"
        >
          <div className="w-20 h-20 rounded-full border-2 border-glow-gold/30 border-t-glow-gold" />
        </motion.div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles size={22} className="text-glow-gold" />
        </div>
      </div>

      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-playfair text-3xl font-medium text-white mb-3 text-center"
      >
        Crafting Your Profile
      </motion.h2>
      <p className="font-inter text-sm text-white/45 mb-12 text-center max-w-sm">
        Our AI is analysing your preferences to build your personalised beauty concierge experience.
      </p>

      {/* Steps */}
      <div className="space-y-4 w-full max-w-sm">
        {STEPS.map((step, i) => {
          const state = i < current ? 'done' : i === current ? 'active' : 'pending'
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: state === 'pending' ? 0.35 : 1, x: 0 }}
              transition={{ delay: i * 0.15, duration: 0.4 }}
              className="flex items-center gap-4"
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                state === 'done'   ? 'bg-glow-gold' :
                state === 'active' ? 'border-2 border-glow-gold bg-transparent' :
                'border border-white/20 bg-transparent'
              }`}>
                {state === 'done' && <Check size={13} className="text-white" />}
                {state === 'active' && (
                  <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="w-2 h-2 bg-glow-gold rounded-full" />
                )}
              </div>
              <span className={`font-inter text-sm ${state === 'done' ? 'text-glow-gold' : state === 'active' ? 'text-white' : 'text-white/35'}`}>
                {step}
              </span>
            </motion.div>
          )
        })}
      </div>

      {done && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-playfair text-sm italic text-glow-gold mt-10"
        >
          Your beauty concierge is ready ✦
        </motion.p>
      )}
    </div>
  )
}