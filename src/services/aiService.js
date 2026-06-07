import { detectLandmarks, classifyFaceShape } from './faceAnalysisService'
import { analyzeSkin } from './skinAnalysisService'
import { analyzeHair } from './hairAnalysisService'
import { generateRecommendations } from './recommendationEngine'
import { validateLandmarkReadiness } from './imageValidation'

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

// Helper to load an image from a blob URL
const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export class AnalysisValidationError extends Error {
  constructor(errors) {
    super(errors.join(' '))
    this.name = 'AnalysisValidationError'
    this.errors = errors
  }
}

export const analyzeBeautyProfile = async (profile) => {
  try {
    let faceShape = null
    let skinAnalysis = null
    let hairAnalysis = null
    
    let imgEl = null
    let landmarks = null

    // Load image and detect landmarks if a photo is provided
    if (profile.photoPreview) {
      imgEl = await loadImage(profile.photoPreview)
      landmarks = await detectLandmarks(imgEl)
    }

    const readiness = validateLandmarkReadiness(imgEl, landmarks)
    if (!readiness.validationPassed) {
      throw new AnalysisValidationError(readiness.errors)
    }

    if (landmarks) {
      faceShape = classifyFaceShape(landmarks)
      skinAnalysis = analyzeSkin(imgEl, landmarks)
      hairAnalysis = analyzeHair(imgEl, landmarks)
    } else {
      // Fallbacks if no face is detected
      faceShape = {
        technicalClassification: null,
        confidence: 0,
        plainEnglishMeaning: '',
        whyItWasDetected: 'No face detected in the image. Please retake photo directly facing the camera.',
      }
      skinAnalysis = {
        technicalClassification: null,
        confidence: 0,
        plainEnglishMeaning: '',
        whyItWasDetected: 'Insufficient data for skin analysis.',
      }
      hairAnalysis = {
        technicalClassification: null,
        confidence: 0,
        plainEnglishMeaning: '',
        whyItWasDetected: 'Unable to analyze hair characteristics accurately. Please ensure your hair is fully visible and retake the selfie.',
      }
    }

    const styleProfile = profile.styleProfile || "Gender-Neutral Styles"

    // If API Mode is active, outsource scoring logic to the backend server
    if (import.meta.env.VITE_STORAGE_PROVIDER === 'api') {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
      const response = await fetch(`${API_BASE}/api/analysis/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faceShape, skinAnalysis, hairAnalysis, profile })
      })
      const finalAnalysis = await response.json()
      if (!response.ok) {
        throw new Error(finalAnalysis.error || 'Server-side analysis failed')
      }
      return finalAnalysis
    }

    const recommendations = generateRecommendations(
      { faceShape, skinAnalysis, hairAnalysis }, 
      profile
    )

    const finalAnalysis = {
      faceShape,
      skinAnalysis,
      hairAnalysis,
      styleProfile,
      confidenceScores: {
        face: faceShape.confidence,
        skin: skinAnalysis.confidence,
        hair: hairAnalysis.confidence,
      },
      explanations: {
        face: faceShape.plainEnglishMeaning,
        skin: skinAnalysis.plainEnglishMeaning,
        hair: hairAnalysis.plainEnglishMeaning,
      },
      recommendations,
      treatments:
        profile.skinConcern === 'Dry'       ? ['Hydrating Facial', 'Moisture Boost', 'Oil Infusion Mask'] :
        profile.skinConcern === 'Oily'      ? ['Deep Cleansing Facial', 'Clay Mask', 'Sebum Control'] :
        profile.skinConcern === 'Sensitive' ? ['Calming Facial', 'Aloe Treatment', 'Gentle Exfoliation'] :
                                              ['Balancing Facial', 'Niacinamide Treatment', 'Combination Care'],
      beautyTips: [
        'Use a silk pillowcase to reduce hair breakage overnight',
        'Apply SPF 50 every morning — even on Mumbai monsoon days',
        'Double-cleanse at night to remove humidity and pollution',
      ],
      salonMatches: [1, 4, 2],
      budgetCategory: profile.budgetRange || 'Premium',
    }

    // Auto-save analysis if user is logged in
    import('./storageService').then(async ({ getCurrentUser, saveAnalysis }) => {
      const user = await getCurrentUser()
      if (user) {
        await saveAnalysis(user.id, finalAnalysis, profile)
      }
    }).catch(err => console.error('Failed to auto-save analysis:', err))

    return finalAnalysis
  } catch (err) {
    console.error("Analysis failed:", err)
    throw err
  }
}

export const generateBridalTimeline = async (weddingDate, budget, style) => {
  await delay(2000)
  const bridalStyle = style || 'Personal bridal style'
  return {
    timeline: [
      {
        phase: '3 Months Before', icon: '✦',
        tasks: [
          { task: `Book bridal makeup artist experienced in ${bridalStyle}`, priority: 'High',   done: false },
          { task: 'Start pre-bridal skincare routine',   priority: 'High',   done: false },
          { task: 'Hair consultation & treatment plan',  priority: 'Medium', done: false },
          { task: 'Begin mehndi artist search',          priority: 'Medium', done: false },
        ],
      },
      {
        phase: '2 Months Before', icon: '✦',
        tasks: [
          { task: 'Bridal makeup trial session',       priority: 'High',   done: false },
          { task: 'Deep conditioning hair treatment',  priority: 'High',   done: false },
          { task: 'Eyebrow shaping & tinting',         priority: 'Medium', done: false },
          { task: `Finalise ${bridalStyle} references, jewellery balance, and draping direction`, priority: 'High', done: false },
        ],
      },
      {
        phase: '1 Month Before', icon: '✦',
        tasks: [
          { task: 'Pre-bridal facial series (3 sessions)', priority: 'High',   done: false },
          { task: 'Book nail artist for bridal nails',     priority: 'High',   done: false },
          { task: `Final ${bridalStyle} makeup and hair rehearsal`, priority: 'High', done: false },
          { task: 'Body polishing treatment',              priority: 'Medium', done: false },
        ],
      },
      {
        phase: 'Wedding Week', icon: '♦',
        tasks: [
          { task: 'Final skin brightening facial', priority: 'High', done: false },
          { task: 'Bridal mehendi appointment',   priority: 'High', done: false },
          { task: 'Hair treatment & trim',        priority: 'High', done: false },
          { task: 'Manicure & Pedicure',          priority: 'High', done: false },
        ],
      },
    ],
    estimatedBudget: budget,
    style: bridalStyle,
  }
}

export const optimizeBudget = async (budget, location, services) => {
  await delay(1600)
  return [
    {
      name: 'Essential Glow',
      salon: 'Aura Salon Powai', salonId: 3,
      services: services.slice(0, 2),
      originalPrice: Math.round(budget * 1.2),
      optimizedPrice: Math.round(budget * 0.82),
      savings: Math.round(budget * 0.38),
      valueScore: 92, rating: 4.7, bestFor: 'Everyday Beauty',
    },
    {
      name: 'Premium Experience',
      salon: 'Luxe Studio Bandra', salonId: 1,
      services,
      originalPrice: Math.round(budget * 1.5),
      optimizedPrice: Math.round(budget * 0.94),
      savings: Math.round(budget * 0.56),
      valueScore: 97, rating: 4.9, bestFor: 'Special Occasion',
    },
    {
      name: 'Luxury Splurge',
      salon: 'The Glam Room Juhu', salonId: 4,
      services: [...services, 'Luxury Add-On'],
      originalPrice: Math.round(budget * 2),
      optimizedPrice: Math.round(budget * 1.1),
      savings: Math.round(budget * 0.9),
      valueScore: 89, rating: 4.9, bestFor: 'Premium Indulgence',
    },
  ]
}
