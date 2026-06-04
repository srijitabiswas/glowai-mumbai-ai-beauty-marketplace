import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Upload, Check, ArrowRight, ArrowLeft, ChevronRight } from 'lucide-react'
import { useBeautyProfile } from '../context/BeautyProfileContext'
import MainLayout from '../layouts/MainLayout'

const STEPS = ['Profile Photo', 'Hair & Skin', 'Budget & Occasion']

const HAIR_TYPES   = ['Straight', 'Wavy', 'Curly', 'Coily']
const SKIN_CONCERNS = ['Dry', 'Oily', 'Combination', 'Sensitive', 'Normal']
const OCCASIONS    = ['Everyday', 'Party', 'Wedding', 'Corporate Event', 'Festival']

function SelectPill({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 rounded-full border font-inter text-sm transition-all duration-200 ${
        selected
          ? 'bg-glow-gold text-white border-glow-gold shadow-luxury'
          : 'bg-glow-surface border-glow-border text-glow-muted hover:border-glow-gold hover:text-glow-black'
      }`}
    >
      {selected && <Check size={13} className="inline mr-1.5" />}
      {label}
    </button>
  )
}

export default function BeautyProfileSetup() {
  const navigate = useNavigate()
  const { saveProfile } = useBeautyProfile()

  const [step, setStep]   = useState(0)
  const [form, setForm]   = useState({
    photo: null,
    photoPreview: null,
    hairType: '',
    skinConcern: '',
    budget: 3000,
    occasions: [],
    name: '',
  })

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }))

  const toggleOccasion = (occ) => {
    setForm((p) => ({
      ...p,
      occasions: p.occasions.includes(occ) ? p.occasions.filter((o) => o !== occ) : [...p.occasions, occ],
    }))
  }

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (file) {
      set('photo', file)
      set('photoPreview', URL.createObjectURL(file))
    }
  }

  const handleSubmit = () => {
    saveProfile(form)
    navigate('/analyzing')
  }

  const canNext =
    step === 0 ? true :
    step === 1 ? form.hairType && form.skinConcern :
    form.occasions.length > 0

  const slideVariants = {
    initial:  { opacity: 0, x: 30 },
    animate:  { opacity: 1, x: 0 },
    exit:     { opacity: 0, x: -30 },
  }

  return (
    <MainLayout>
      <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-2 text-glow-gold font-inter text-xs uppercase tracking-widest mb-4">
              <Sparkles size={12} /> AI Beauty Profile
            </span>
            <h1 className="font-playfair text-4xl font-medium text-glow-black mb-3">
              Create Your Beauty Profile
            </h1>
            <p className="font-inter text-sm text-glow-muted">
              Takes 2 minutes. Personalises everything.
            </p>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-3 mb-10">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center gap-3 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-inter font-semibold transition-all duration-300 ${
                  i < step ? 'bg-glow-gold text-white' :
                  i === step ? 'bg-glow-black text-white' :
                  'bg-glow-border text-glow-muted'
                }`}>
                  {i < step ? <Check size={13} /> : i + 1}
                </div>
                <span className={`font-inter text-xs hidden sm:block ${i === step ? 'text-glow-black font-medium' : 'text-glow-muted'}`}>
                  {label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px transition-all duration-500 ${i < step ? 'bg-glow-gold' : 'bg-glow-border'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Card */}
          <div className="card-luxury p-8">
            <AnimatePresence mode="wait">
              {/* Step 0: Photo */}
              {step === 0 && (
                <motion.div key="step0" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
                  <h2 className="font-playfair text-2xl font-semibold text-glow-black mb-2">Your Name & Photo</h2>
                  <p className="font-inter text-sm text-glow-muted mb-8">Help us personalise your experience.</p>

                  <div className="mb-6">
                    <label className="font-inter text-sm font-medium text-glow-black block mb-2">Your Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="w-full border border-glow-border rounded-xl px-4 py-3 font-inter text-sm text-glow-black bg-glow-surface outline-none focus:border-glow-gold transition-colors"
                    />
                  </div>

                  <label className="font-inter text-sm font-medium text-glow-black block mb-3">Upload Selfie <span className="text-glow-muted font-normal">(optional — helps with face shape analysis)</span></label>
                  <label className="block">
                    <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                    <div className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                      form.photoPreview ? 'border-glow-gold' : 'border-glow-border hover:border-glow-gold'
                    }`}>
                      {form.photoPreview ? (
                        <div className="flex flex-col items-center gap-3">
                          <img src={form.photoPreview} alt="preview" className="w-24 h-24 rounded-2xl object-cover shadow-card" />
                          <span className="font-inter text-sm text-glow-gold">Photo uploaded ✓ — tap to change</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 bg-glow-border rounded-full flex items-center justify-center">
                            <Upload size={20} className="text-glow-muted" />
                          </div>
                          <div>
                            <p className="font-inter text-sm font-medium text-glow-black">Tap to upload selfie</p>
                            <p className="font-inter text-xs text-glow-muted mt-0.5">JPG, PNG up to 10MB</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </label>
                </motion.div>
              )}

              {/* Step 1: Hair & Skin */}
              {step === 1 && (
                <motion.div key="step1" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
                  <h2 className="font-playfair text-2xl font-semibold text-glow-black mb-2">Hair & Skin Type</h2>
                  <p className="font-inter text-sm text-glow-muted mb-8">This helps us match you with the right treatments.</p>

                  <div className="mb-7">
                    <label className="font-inter text-sm font-semibold text-glow-black block mb-3">Hair Type</label>
                    <div className="flex flex-wrap gap-2.5">
                      {HAIR_TYPES.map((t) => (
                        <SelectPill key={t} label={t} selected={form.hairType === t} onClick={() => set('hairType', t)} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="font-inter text-sm font-semibold text-glow-black block mb-3">Primary Skin Concern</label>
                    <div className="flex flex-wrap gap-2.5">
                      {SKIN_CONCERNS.map((s) => (
                        <SelectPill key={s} label={s} selected={form.skinConcern === s} onClick={() => set('skinConcern', s)} />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Budget & Occasion */}
              {step === 2 && (
                <motion.div key="step2" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
                  <h2 className="font-playfair text-2xl font-semibold text-glow-black mb-2">Budget & Occasion</h2>
                  <p className="font-inter text-sm text-glow-muted mb-8">Tell us how you like to spend on beauty.</p>

                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                      <label className="font-inter text-sm font-semibold text-glow-black">Monthly Beauty Budget</label>
                      <span className="font-playfair text-lg font-semibold text-glow-gold">₹{form.budget.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min={500}
                      max={20000}
                      step={500}
                      value={form.budget}
                      onChange={(e) => set('budget', Number(e.target.value))}
                      className="w-full accent-glow-gold h-1.5 rounded-full cursor-pointer"
                    />
                    <div className="flex justify-between mt-1.5">
                      <span className="font-inter text-xs text-glow-muted">₹500</span>
                      <span className="font-inter text-xs text-glow-muted">₹20,000</span>
                    </div>
                  </div>

                  <div>
                    <label className="font-inter text-sm font-semibold text-glow-black block mb-3">Occasions <span className="text-glow-muted font-normal">(select all that apply)</span></label>
                    <div className="flex flex-wrap gap-2.5">
                      {OCCASIONS.map((o) => (
                        <SelectPill key={o} label={o} selected={form.occasions.includes(o)} onClick={() => toggleOccasion(o)} />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-glow-border">
              <button
                onClick={() => setStep((s) => s - 1)}
                disabled={step === 0}
                className={`flex items-center gap-2 font-inter text-sm transition-all duration-200 ${
                  step === 0 ? 'text-glow-border pointer-events-none' : 'text-glow-muted hover:text-glow-black'
                }`}
              >
                <ArrowLeft size={15} /> Back
              </button>

              {step < STEPS.length - 1 ? (
                <button
                  onClick={() => canNext && setStep((s) => s + 1)}
                  className={`btn-gold ${!canNext ? 'opacity-40 pointer-events-none' : ''}`}
                >
                  Continue <ArrowRight size={15} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!canNext}
                  className={`btn-gold text-base py-3.5 px-8 ${!canNext ? 'opacity-40 pointer-events-none' : ''}`}
                >
                  <Sparkles size={16} /> Analyse My Beauty Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}