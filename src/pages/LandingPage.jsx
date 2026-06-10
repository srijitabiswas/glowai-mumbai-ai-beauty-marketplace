import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Play, ArrowRight, Star, MapPin, CheckCircle2,
  Sparkles, ChevronRight, Shield, Zap, Heart,
  Camera, Loader2, Check, AlertCircle, UploadCloud, Info, Bug,
  RefreshCw
} from 'lucide-react'
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision'
import {
  initFaceLandmarker,
  resetFaceLandmarker,
  detectLandmarks,
  classifyFaceShape,
} from '../services/faceAnalysisService'
import { analyzeSkin } from '../services/skinAnalysisService'
import {
  validateImageSource,
  validateLandmarkReadiness,
  IMAGE_VALIDATION_THRESHOLDS,
  HAIR_VISIBILITY_ERROR,
} from '../services/imageValidation'
import beautyScanAvatar from '../assets/beauty-scan-avatar.png'
import MainLayout     from '../layouts/MainLayout'
import DemoVideoModal from '../components/DemoVideoModal'
import SalonCard      from '../components/SalonCard'
import ExperienceCard from '../components/ExperienceCard'
import TestimonialCard from '../components/TestimonialCard'
import SectionHeader  from '../components/SectionHeader'
import { salons }      from '../data/salons'
import { experiences } from '../data/experiences'

// Show debug panel in dev mode or when explicitly enabled via env var
const DEBUG_ENABLED = import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true'

/* ---------- Animated Counter ---------- */
function Counter({ target, suffix = '' }) {
  const [count, setCount] = useState(0)
  const ref    = useRef(null)
  const inView = useInView(ref, { once: true })
  useEffect(() => {
    if (!inView) return
    const step = target / 60
    let current = 0
    const timer = setInterval(() => {
      current += step
      if (current >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(current))
    }, 24)
    return () => clearInterval(timer)
  }, [inView, target])
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}


/* ---------- Validation Check Config ---------- */
// All 7 checks must be true for the Capture button to activate.
const VALIDATION_CHECKS = [
  { key: 'facePresent',  passLabel: 'Face Detected',       failLabel: 'Position your face in the frame' },
  { key: 'oneFace',      passLabel: 'Single Face',          failLabel: 'Multiple faces detected. Only you should be in frame.' },
  { key: 'faceSize',     passLabel: 'Face Close Enough',    failLabel: 'Move closer to the camera' },
  { key: 'faceCentered', passLabel: 'Face Centred',         failLabel: 'Look directly at the camera' },
  { key: 'hairVisible',  passLabel: 'Hair Open & Visible',  failLabel: 'Wear hair down — tied/covered hair not accepted' },
  { key: 'lightingGood', passLabel: 'Good Lighting',        failLabel: 'Move to a brighter area' },
  { key: 'notBlurry',    passLabel: 'Image Sharp',          failLabel: 'Hold steady — image is blurry' },
]

/* ---------- analyzeCapture -----------------------------------------------
 * Runs face-shape + skin-tone analysis on the captured selfie.
 * Entirely client-side (MediaPipe + canvas math).
 * Never throws — errors produce null fields.
 * ---------------------------------------------------------------------- */
const MIN_CONFIDENCE = 60

async function analyzeCapture(imageDataUrl, hairWasVisible) {
  if (!imageDataUrl) {
    return {
      faceShape: null, faceShapeConfidence: 0,
      faceShapeReason: 'No image captured.',
      skinTone: null, skinUndertone: null, skinConfidence: 0,
      skinReason: 'No image captured.',
      hairVisible: hairWasVisible,
      landmarksDetected: false,
    }
  }

  // 1. Load image element
  const imgEl = await new Promise((resolve, reject) => {
    const el  = new window.Image()
    el.onload  = () => resolve(el)
    el.onerror = reject
    el.src     = imageDataUrl
  })

  // 2. Detect 478 facial landmarks
  let landmarks = null
  try {
    landmarks = await detectLandmarks(imgEl)
  } catch (err) {
    console.warn('[GlowAI] FaceLandmarker error:', err)
  }

  if (!landmarks) {
    return {
      faceShape: null, faceShapeConfidence: 0,
      faceShapeReason:
        'No facial landmarks detected. Please retake in good lighting with your face clearly visible.',
      skinTone: null, skinUndertone: null, skinConfidence: 0,
      skinReason: 'Skin analysis requires facial landmark detection.',
      hairVisible: hairWasVisible,
      landmarksDetected: false,
    }
  }

  // 3. Face shape classification
  const fsResult  = classifyFaceShape(landmarks)
  const faceShape = fsResult.confidence >= MIN_CONFIDENCE
    ? fsResult.technicalClassification
    : null

  // 4. Skin tone + undertone analysis
  let skinResult = {
    tone: null, undertone: null, confidence: 0,
    whyItWasDetected: 'Skin analysis unavailable.',
  }
  try {
    skinResult = analyzeSkin(imgEl, landmarks)
  } catch (err) {
    console.warn('[GlowAI] Skin analysis error:', err)
  }

  const skinTone      = skinResult.confidence >= MIN_CONFIDENCE ? skinResult.tone      : null
  const skinUndertone = skinResult.confidence >= MIN_CONFIDENCE ? skinResult.undertone : null

  return {
    faceShape,
    faceShapeConfidence: fsResult.confidence,
    faceShapeReason:     fsResult.whyItWasDetected,
    faceShapeMetrics:    fsResult.metrics,

    skinTone,
    skinUndertone,
    skinConfidence: skinResult.confidence,
    skinReason:     skinResult.whyItWasDetected,

    hairVisible: hairWasVisible,
    landmarksDetected: true,
  }
}

/* ---------- Interactive AI Beauty Analyzer -------------------------------- */
function InteractiveAIBeautyAnalyzer() {
  const navigate = useNavigate()

  // scanState: 'idle' | 'model_loading' | 'initializing' | 'detecting' | 'capturing' | 'analyzing' | 'results' | 'error'
  const [scanState, setScanState]     = useState('idle')
  const [errorMsg, setErrorMsg]       = useState('')
  const [modelError, setModelError]   = useState('')  // separate state for model-load errors
  const [capturedImage, setCapturedImage] = useState(null)
  const [analyzingStep, setAnalyzingStep] = useState(0)
  const [analysisResult, setAnalysisResult] = useState(null)

  // Per-check validation: null = pending, true = pass, false = fail
  const [validation, setValidation] = useState({
    facePresent:  null,
    oneFace:      null,
    faceSize:     null,
    faceCentered: null,
    hairVisible:  null,
    lightingGood: null,
    notBlurry:    null,
  })

  const [showDebug, setShowDebug]       = useState(false)
  const [uploadErrors, setUploadErrors] = useState([])

  // Debug telemetry panel data
  const [debugInfo, setDebugInfo] = useState({
    facesDetected: 0,
    faceCentered: false,
    faceSize: 0,
    brightnessScore: 0,
    blurScore: 0,
    hairVisible: false,
    hairDebug: {},
    validationPassed: false,
  })

  // Ref to record hair visibility at capture time (before camera stops)
  const hairWasVisibleRef = useRef(false)

  const videoRef    = useRef(null)
  const streamRef   = useRef(null)
  const detectorRef = useRef(null)
  const requestRef  = useRef(null)

  // ── MediaPipe FaceDetector initialisation ────────────────────────────────
  const initializeDetector = useCallback(async () => {
    // Reuse cached detector if already loaded
    if (detectorRef.current) return detectorRef.current

    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
    )
    const detector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
      },
      runningMode: 'VIDEO',
    })
    detectorRef.current = detector
    return detector
  }, [])

  const stopCamera = useCallback(() => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current)
      requestRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera])

  // ── Start scan ────────────────────────────────────────────────────────────
  const startScan = useCallback(async () => {
    setScanState('initializing')
    setErrorMsg('')
    setModelError('')
    setCapturedImage(null)
    setAnalysisResult(null)
    setUploadErrors([])
    setValidation({
      facePresent: null, oneFace: null, faceSize: null,
      faceCentered: null, hairVisible: null,
      lightingGood: null, notBlurry: null,
    })

    try {
      // Request camera first so the user sees the permission prompt early
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
      })
      streamRef.current = stream

      // Preload the FaceLandmarker model in the background (warm for analysis)
      initFaceLandmarker().catch(err => {
        console.warn('[GlowAI] FaceLandmarker background preload failed:', err)
      })

      // Load the FaceDetector model (used only for live validation)
      setScanState('model_loading')
      let detector
      try {
        detector = await initializeDetector()
      } catch (modelErr) {
        console.error('[GlowAI] FaceDetector model load failed:', modelErr)
        stopCamera()
        setModelError(
          'Could not load the face detection model. ' +
          'Please check your internet connection and try again.'
        )
        setScanState('error')
        return
      }

      setScanState('detecting')

      // Small delay to let the video element mount and the browser assign srcObject
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(e => console.error('[GlowAI] Video play error:', e))
          startValidationLoop(detector)
        }
      }, 150)

    } catch (err) {
      console.error('[GlowAI] Camera/init error:', err)
      const isPermission =
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
      setErrorMsg(
        isPermission
          ? 'Camera access denied. Please enable camera permissions in your browser settings, then try again.'
          : 'Could not access your camera. Please ensure it is connected and not in use by another app.'
      )
      setScanState('error')
    }
  }, [initializeDetector, stopCamera])

  // ── Real-time validation loop ─────────────────────────────────────────────
  const startValidationLoop = useCallback((detector) => {
    const tick = () => {
      const video = videoRef.current
      if (!video || video.readyState < 2) {
        // Video not ready yet — keep waiting
        requestRef.current = requestAnimationFrame(tick)
        return
      }

      const vw = video.videoWidth  || 640
      const vh = video.videoHeight || 640

      const result = validateImageSource(video, detector, vw, vh)

      const {
        facesDetected,
        faceCentered,
        faceSize,
        brightnessScore,
        blurScore,
        hairVisible,
      } = result

      const oneFace    = facesDetected === 1
      const faceSizeOk =
        faceSize >= IMAGE_VALIDATION_THRESHOLDS.faceHeightMin * 100 &&
        faceSize <= IMAGE_VALIDATION_THRESHOLDS.faceHeightMax * 100
      const lightingGood = brightnessScore > IMAGE_VALIDATION_THRESHOLDS.brightnessMin
      const notBlurry    = blurScore       > IMAGE_VALIDATION_THRESHOLDS.blurMin

      setValidation({
        facePresent:  facesDetected >= 1,
        oneFace,
        faceSize:     faceSizeOk,
        faceCentered,
        hairVisible,
        lightingGood,
        notBlurry,
      })

      setDebugInfo({
        facesDetected,
        faceCentered,
        faceSize,
        brightnessScore: parseFloat(brightnessScore.toFixed(1)),
        blurScore:       parseFloat(blurScore.toFixed(3)),
        hairVisible,
        hairDebug: result.hairDebug || {},
        validationPassed: result.validationPassed,
      })

      requestRef.current = requestAnimationFrame(tick)
    }
    requestRef.current = requestAnimationFrame(tick)
  }, [])

  // ── Capture selfie ────────────────────────────────────────────────────────
  const capturePhoto = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    const c   = document.createElement('canvas')
    c.width   = video.videoWidth  || 640
    c.height  = video.videoHeight || 640
    const ctx = c.getContext('2d')

    // Un-mirror the CSS-flipped video feed so MediaPipe landmarks map correctly
    ctx.translate(c.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0)

    // Snapshot hair visibility state before stopping the camera
    hairWasVisibleRef.current = validation.hairVisible === true

    setCapturedImage(c.toDataURL('image/jpeg', 0.85))
    stopCamera()
    setScanState('capturing')
    setTimeout(() => setScanState('analyzing'), 900)
  }, [validation.hairVisible, stopCamera])

  // ── Analyzing ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (scanState !== 'analyzing') return
    setAnalyzingStep(0)

    let active       = true
    let timerDone    = false
    let analysisDone = false

    const tryTransition = () => {
      if (timerDone && analysisDone && active) setScanState('results')
    }

    // Visual step pacing (min 4.5 s so the animation feels intentional)
    const t1 = setTimeout(() => { if (active) setAnalyzingStep(1) }, 1100)
    const t2 = setTimeout(() => { if (active) setAnalyzingStep(2) }, 2200)
    const t3 = setTimeout(() => { if (active) setAnalyzingStep(3) }, 3300)
    const t4 = setTimeout(() => { timerDone = true; tryTransition() }, 4500)

    // Real AI analysis
    ;(async () => {
      try {
        const result = await analyzeCapture(capturedImage, hairWasVisibleRef.current)
        if (!active) return
        setAnalysisResult(result)
      } catch (err) {
        console.error('[GlowAI] analyzeCapture error:', err)
        if (active) {
          setAnalysisResult({ error: true, hairVisible: hairWasVisibleRef.current })
        }
      } finally {
        analysisDone = true
        tryTransition()
      }
    })()

    return () => {
      active = false
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4)
    }
  }, [scanState, capturedImage])

  // ── Photo upload fallback ─────────────────────────────────────────────────
  const handlePhotoFallback = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset file input so the same file can be re-selected
    e.target.value = ''

    const objectUrl = URL.createObjectURL(file)

    let imgEl
    try {
      imgEl = await new Promise((resolve, reject) => {
        const el = new window.Image()
        el.crossOrigin = 'anonymous'
        el.onload  = () => resolve(el)
        el.onerror = () => reject(new Error('Image failed to load'))
        el.src = objectUrl
      })
    } catch {
      setUploadErrors(['Could not read the image file. Please try a different photo.'])
      URL.revokeObjectURL(objectUrl)
      return
    }

    // Run landmark detection so we can validate before proceeding
    let landmarks = null
    try {
      landmarks = await detectLandmarks(imgEl)
    } catch (err) {
      console.warn('[GlowAI] Upload landmark detection failed:', err)
    }

    const readiness = validateLandmarkReadiness(imgEl, landmarks)
    if (!readiness.validationPassed) {
      setUploadErrors(readiness.errors)
      URL.revokeObjectURL(objectUrl)
      return
    }

    setUploadErrors([])
    hairWasVisibleRef.current = true
    setCapturedImage(objectUrl)
    setScanState('analyzing')
  }, [])

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetScan = useCallback(() => {
    stopCamera()
    setScanState('idle')
    setCapturedImage(null)
    setErrorMsg('')
    setModelError('')
    setAnalysisResult(null)
    setUploadErrors([])
    hairWasVisibleRef.current = false
    setValidation({
      facePresent: null, oneFace: null, faceSize: null,
      faceCentered: null, hairVisible: null,
      lightingGood: null, notBlurry: null,
    })
  }, [stopCamera])

  // ── Retry model + scan after a model-load failure ─────────────────────────
  const retryWithModelReset = useCallback(() => {
    detectorRef.current = null   // force FaceDetector re-init
    resetFaceLandmarker()        // force FaceLandmarker re-init
    resetScan()
  }, [resetScan])

  // Capture button activates only when every check is green
  const allValid = VALIDATION_CHECKS.every(({ key }) => validation[key] === true)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      className="bg-glow-black border border-glow-gold/20 rounded-3xl p-6 shadow-luxury-lg w-full max-w-sm mx-auto lg:mx-0 relative overflow-hidden"
    >
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-glow-gold/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-glow-rose/10 rounded-full blur-2xl pointer-events-none" />

      {/* ── IDLE ───────────────────────────────────────────────────────── */}
      {scanState === 'idle' && (
        <div className="flex flex-col items-center text-center py-4">
          <div className="relative w-44 h-44 rounded-full overflow-hidden border-2 border-glow-gold/30 mb-6 bg-neutral-900 shadow-[0_12px_32px_rgba(0,0,0,0.18)]">
            <img src={beautyScanAvatar} alt="Guided beauty avatar" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            <Sparkles size={18} className="absolute right-10 top-10 text-glow-gold" />
            <Sparkles size={12} className="absolute left-11 bottom-12 text-glow-hover-gold" />
          </div>
          <span className="text-glow-gold text-xs font-inter uppercase tracking-widest mb-2 flex items-center gap-1.5 justify-center">
            <Sparkles size={11} /> AI Beauty Consultant
          </span>
          <h3 className="font-playfair text-white text-xl font-medium mb-3 drop-shadow-[0_0_18px_rgba(0,0,0,0.36)]">Guided Beauty Scan</h3>
          <p className="font-inter text-xs text-white/90 mb-6 max-w-xs leading-relaxed drop-shadow-[0_0_14px_rgba(0,0,0,0.2)]">
            Our AI guides you to a clear selfie, then delivers personalised beauty, grooming, and styling recommendations.
          </p>
          <button
            onClick={startScan}
            className="btn-gold text-xs py-2.5 px-6 shadow-luxury w-full flex items-center justify-center gap-1.5"
          >
            <Camera size={14} /> Start AI Beauty Scan
          </button>
        </div>
      )}

      {/* ── MODEL LOADING ──────────────────────────────────────────────── */}
      {scanState === 'model_loading' && (
        <div className="flex flex-col items-center py-10 text-center">
          <Loader2 size={36} className="text-glow-gold animate-spin mb-6" />
          <span className="font-inter text-xs text-glow-gold uppercase tracking-wider font-semibold mb-2">
            Loading AI Models…
          </span>
          <p className="font-inter text-[11px] text-white/50 max-w-[200px] leading-relaxed">
            Downloading face detection model on first use. This may take a moment.
          </p>
        </div>
      )}

      {/* ── INITIALIZING ───────────────────────────────────────────────── */}
      {scanState === 'initializing' && (
        <div className="flex flex-col items-center py-10 text-center">
          <Loader2 size={36} className="text-glow-gold animate-spin mb-6" />
          <span className="font-inter text-xs text-glow-gold uppercase tracking-wider font-semibold mb-2">
            Initialising AI Scan…
          </span>
          <p className="font-inter text-[11px] text-white/50 max-w-[200px] leading-relaxed">
            Requesting camera access and loading beauty models…
          </p>
        </div>
      )}

      {/* ── DETECTING — live validation HUD ────────────────────────────── */}
      {scanState === 'detecting' && (
        <div className="flex flex-col items-center py-2 text-center">
          {/* Circular camera preview */}
          <div
            className={`relative w-40 h-40 rounded-full overflow-hidden border-2 mb-4 bg-neutral-950 transition-all duration-500 ${
              allValid
                ? 'border-glow-hover-gold shadow-[0_0_22px_rgba(212,175,106,0.35)]'
                : 'border-glow-gold shadow-[0_0_14px_rgba(201,168,106,0.25)]'
            }`}
          >
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            {/* Guide oval */}
            <div className="absolute inset-0 border-2 border-dashed border-white/25 rounded-full m-3 pointer-events-none" />
            {/* All-clear overlay */}
            <AnimatePresence>
              {allValid && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-glow-gold/15 flex items-center justify-center"
                >
                  <div className="w-11 h-11 bg-glow-deep-gold rounded-full flex items-center justify-center shadow-lg">
                    <Check size={18} className="text-glow-black" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Validation HUD */}
          <div className="w-full space-y-1 mb-4">
            {VALIDATION_CHECKS.map(({ key, passLabel, failLabel }) => {
              const state = validation[key]
              return (
                <motion.div
                  key={key}
                  layout
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors duration-300 ${
                    state === true  ? 'bg-glow-gold/10'   :
                    state === false ? 'bg-amber-500/8'    :
                    'bg-white/8'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                      state === true  ? 'bg-glow-deep-gold' :
                      state === false ? 'bg-amber-500'      :
                      'bg-white/10'
                    }`}
                  >
                    {state === true  && <Check size={9} className="text-glow-black" />}
                    {state === false && <span className="text-white text-[8px] font-bold leading-none">✕</span>}
                    {(state === null || state === undefined) && (
                      <Loader2 size={8} className="text-white/40 animate-spin" />
                    )}
                  </div>
                  <span
                    className={`font-inter text-[11px] text-left leading-tight ${
                      state === true  ? 'text-glow-hover-gold' :
                      state === false ? 'text-amber-400'       :
                      'text-white/60'
                    }`}
                  >
                    {state === false ? failLabel : passLabel}
                  </span>
                </motion.div>
              )
            })}
          </div>

          {/* Capture button */}
          <button
            id="beauty-scan-capture-btn"
            onClick={capturePhoto}
            disabled={!allValid}
            className={`w-full text-xs py-2.5 px-6 rounded-full font-inter font-semibold flex items-center justify-center gap-2 transition-all duration-500 ${
              allValid
                ? 'bg-glow-deep-gold text-glow-black shadow-[0_0_22px_rgba(212,175,106,0.35)] hover:bg-glow-hover-gold active:scale-95 cursor-pointer'
                : 'bg-white/5 text-white/20 cursor-not-allowed'
            }`}
          >
            <Camera size={13} />
            {allValid ? '✓ Capture Selfie' : 'Checking selfie quality…'}
          </button>

          {/* Debug telemetry panel */}
          {DEBUG_ENABLED && (
            <button
              onClick={() => setShowDebug(v => !v)}
              className="mt-3 flex items-center gap-1.5 text-[9px] font-inter text-white/55 hover:text-white/80 transition-colors mx-auto"
            >
              <Bug size={9} />{showDebug ? 'Hide' : 'Show'} debug telemetry
            </button>
          )}

          {DEBUG_ENABLED && showDebug && (
            <div className="mt-2 w-full bg-black/40 border border-white/10 rounded-xl p-3 text-left font-mono text-[9px] text-white/70">
              <div className="text-[10px] font-semibold text-glow-gold border-b border-white/10 pb-1 mb-2 flex items-center justify-between">
                <span>🎛️ Real-Time Telemetry</span>
                <span className={`w-2 h-2 rounded-full ${debugInfo.validationPassed ? 'bg-glow-gold' : 'bg-amber-500 animate-pulse'}`} />
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* ── CAPTURING — freeze frame ────────────────────────────────────── */}
      {scanState === 'capturing' && (
        <div className="flex flex-col items-center py-6 text-center">
          <div className="relative w-40 h-40 rounded-full overflow-hidden border-2 border-glow-hover-gold mb-5 shadow-[0_0_22px_rgba(212,175,106,0.35)]">
            {capturedImage && (
              <img src={capturedImage} alt="Captured selfie" className="w-full h-full object-cover" />
            )}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-glow-gold/15 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                className="w-12 h-12 bg-glow-deep-gold rounded-full flex items-center justify-center shadow-xl"
              >
                <Check size={22} className="text-glow-black" />
              </motion.div>
            </motion.div>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5 mb-4">
            {['✓ Face Detected', '✓ Hair Visible', '✓ Good Lighting'].map((label) => (
              <span
                key={label}
                className="font-inter text-[10px] text-glow-hover-gold bg-glow-gold/10 border border-glow-gold/20 px-2 py-0.5 rounded-full"
              >
                {label}
              </span>
            ))}
          </div>
          <p className="font-inter text-[11px] text-white/70">Initialising analysis...</p>
        </div>
      )}

      {/* ── ANALYZING ──────────────────────────────────────────────────── */}
      {scanState === 'analyzing' && (
        <div className="flex flex-col items-center py-3 text-center">
          <div className="relative w-40 h-40 rounded-full overflow-hidden border-2 border-glow-gold mb-5 bg-neutral-950">
            {capturedImage ? (
              <img src={capturedImage} alt="Analysing face" className="w-full h-full object-cover opacity-55" />
            ) : (
              <div className="w-full h-full bg-[radial-gradient(circle_at_50%_20%,rgba(228,196,136,0.28),transparent_34%),linear-gradient(160deg,#1f1f22,#0f0f10_68%)] opacity-80" />
            )}
            {/* Scan sweep */}
            <motion.div
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute left-0 right-0 h-0.5 bg-glow-gold shadow-[0_0_10px_rgba(201,168,106,0.8)] z-10"
            />
            {/* Landmark dots */}
            <div className="absolute top-[32%] left-[30%] w-1.5 h-1.5 bg-glow-gold rounded-full animate-ping" />
            <div className="absolute top-[32%] right-[30%] w-1.5 h-1.5 bg-glow-gold rounded-full animate-ping" />
            <div className="absolute top-[50%] left-[50%] -translate-x-1/2 w-1.5 h-1.5 bg-glow-rose rounded-full animate-ping" />
            <div className="absolute bottom-[30%] left-[50%] -translate-x-1/2 w-1.5 h-1.5 bg-glow-gold rounded-full animate-ping" />
          </div>

          <span className="font-inter text-xs text-glow-gold uppercase tracking-wider font-semibold mb-1">
            Analysing Your Features…
          </span>
          <p className="font-inter text-[11px] text-white/50 mb-4">
            Running AI beauty analysis
          </p>

          {/* 4-step progress */}
          <div className="w-full space-y-2">
            {[
              'Mapping face shape & symmetry',
              'Analysing hair type & texture',
              'Reading skin undertone',
              'Surfacing celebrity style matches',
            ].map((label, i) => {
              const state = i < analyzingStep ? 'done' : i === analyzingStep ? 'active' : 'pending'
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2.5 transition-opacity duration-300 ${state === 'pending' ? 'opacity-25' : 'opacity-100'}`}
                >
                  <div
                    className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center transition-all duration-500 ${
                      state === 'done'   ? 'bg-glow-gold'                       :
                      state === 'active' ? 'border-2 border-glow-gold bg-transparent' :
                      'border border-white/20 bg-transparent'
                    }`}
                  >
                    {state === 'done'   && <Check size={9} className="text-white" />}
                    {state === 'active' && (
                      <motion.div
                        animate={{ scale: [1, 1.4, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="w-1.5 h-1.5 bg-glow-gold rounded-full"
                      />
                    )}
                  </div>
                  <span
                    className={`font-inter text-[11px] text-left ${
                      state === 'done'   ? 'text-glow-gold' :
                      state === 'active' ? 'text-white'     :
                      'text-white/65'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── ERROR ──────────────────────────────────────────────────────── */}
      {scanState === 'error' && (
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-4">
            <AlertCircle size={22} className="text-red-500" />
          </div>

          <span className="text-red-500 text-xs font-inter uppercase tracking-widest mb-2 font-semibold">
            {modelError ? 'Model Load Failed' : 'Camera Access Denied'}
          </span>

          <p className="font-inter text-xs text-white/60 mb-4 max-w-xs leading-relaxed">
            {modelError || errorMsg || 'Camera permissions were denied. Please check your browser settings or upload a photo.'}
          </p>

          {/* Upload validation errors */}
          {uploadErrors.length > 0 && (
            <div className="w-full bg-amber-500/8 border border-amber-500/20 rounded-xl px-3 py-2.5 mb-4 text-left">
              <p className="font-inter text-[10px] text-amber-400 font-semibold mb-1.5">📸 Photo validation failed:</p>
              {uploadErrors.map((err, i) => (
                <p key={i} className="font-inter text-[10px] text-amber-300/80 leading-relaxed">• {err}</p>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2.5 w-full">
            <label className="btn-outline-gold text-xs py-2.5 px-4 cursor-pointer flex items-center justify-center gap-1.5 border-white/20 hover:border-glow-gold text-white/90">
              <UploadCloud size={14} /> Upload Photo Instead
              <input type="file" accept="image/*" onChange={handlePhotoFallback} className="hidden" />
            </label>
            {modelError ? (
              <button onClick={retryWithModelReset} className="btn-gold text-xs py-2.5 px-6 shadow-luxury w-full flex items-center justify-center gap-1.5">
                <RefreshCw size={13} /> Retry
              </button>
            ) : (
              <button onClick={startScan} className="btn-gold text-xs py-2.5 px-6 shadow-luxury w-full">
                Retry Camera Scan
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── RESULTS ────────────────────────────────────────────────────── */}
      {scanState === 'results' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-col"
        >
          {/* Profile header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-glow-gold/30 shrink-0">
              {capturedImage ? (
                <img src={capturedImage} alt="Your selfie" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-glow-gold/15 flex items-center justify-center">
                  <Sparkles size={14} className="text-glow-gold" />
                </div>
              )}
            </div>
            <div>
              <p className="font-playfair text-white text-sm font-semibold leading-tight">Analysis Complete</p>
              <p className="font-inter text-[10px] text-glow-gold">GlowAI Match Engine</p>
            </div>
            {(analysisResult?.faceShape || analysisResult?.skinTone) ? (
              <span className="ml-auto shrink-0 text-[9px] font-inter text-glow-gold bg-glow-gold/15 px-2 py-0.5 rounded-full border border-glow-gold/30">
                Verified
              </span>
            ) : (
              <span className="ml-auto shrink-0 text-[9px] font-inter text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                Low Confidence
              </span>
            )}
          </div>

          {/* Analysis results */}
          <div className="space-y-1.5 mb-4">
            {/* Face Shape */}
            <div className="flex items-start justify-between border-b border-white/5 pb-2">
              <span className="font-inter text-[11px] text-white/70 pt-0.5">Face Shape</span>
              <div className="text-right">
                <span className={`font-inter text-[11px] font-semibold ${
                  analysisResult?.faceShape ? 'text-glow-gold' : 'text-white/65'
                }`}>
                  {analysisResult?.faceShape ?? 'Unable to determine'}
                </span>
                <p className="font-inter text-[9px] text-white/60 leading-tight mt-0.5">
                  {analysisResult?.faceShape
                    ? `${analysisResult.faceShapeConfidence}% confidence`
                    : 'Retake selfie for better results'}
                </p>
              </div>
            </div>

            {/* Skin Tone */}
            <div className="flex items-start justify-between border-b border-white/5 pb-2">
              <span className="font-inter text-[11px] text-white/70 pt-0.5">Skin Tone</span>
              <div className="text-right">
                <span className={`font-inter text-[11px] font-semibold ${
                  analysisResult?.skinTone ? 'text-white' : 'text-white/65'
                }`}>
                  {analysisResult?.skinTone
                    ? `${analysisResult.skinTone} · ${analysisResult.skinUndertone}`
                    : 'Unable to determine'}
                </span>
                <p className="font-inter text-[9px] text-white/60 leading-tight mt-0.5">
                  {analysisResult?.skinTone
                    ? `${analysisResult.skinConfidence}% confidence · ${analysisResult.skinUndertone} undertone`
                    : 'Needs clearer lighting'}
                </p>
              </div>
            </div>

            {/* Hair */}
            <div className="flex items-start justify-between pb-1">
              <span className="font-inter text-[11px] text-white/70 pt-0.5">Hair Analysis</span>
              <div className="text-right">
                <span className="font-inter text-[11px] font-semibold text-white/65">
                  {analysisResult?.hairVisible ? 'Pending full scan' : 'Hair not visible'}
                </span>
                <p className="font-inter text-[9px] text-white/60 leading-tight mt-0.5">
                  {analysisResult?.hairVisible
                    ? 'Complete profile for hair analysis'
                    : 'Open hair for accurate analysis'}
                </p>
              </div>
            </div>
          </div>

          {/* Face shape explanation */}
          {analysisResult?.faceShape && analysisResult?.faceShapeReason && (
            <div className="bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 mb-4">
              <p className="font-inter text-[9px] text-glow-gold mb-1 flex items-center gap-1">
                <Info size={8} /> Why this face shape?
              </p>
              <p className="font-inter text-[10px] text-white/70 leading-relaxed">
                {analysisResult.faceShapeReason}
              </p>
            </div>
          )}

          {/* Skin explanation */}
          {analysisResult?.skinTone && analysisResult?.skinReason && (
            <div className="bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 mb-4">
              <p className="font-inter text-[9px] text-glow-gold mb-1 flex items-center gap-1">
                <Info size={8} /> Why this skin reading?
              </p>
              <p className="font-inter text-[10px] text-white/70 leading-relaxed">
                {analysisResult.skinReason}
              </p>
            </div>
          )}

          {/* No landmarks warning */}
          {analysisResult && !analysisResult.landmarksDetected && (
            <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl px-3 py-2.5 mb-4">
              <p className="font-inter text-[10px] text-amber-400 leading-relaxed">
                ⚠ Landmark detection failed. For best results, ensure your face is fully visible, well-lit, and the camera is at eye level.
              </p>
            </div>
          )}

          {/* Next step prompt */}
          <div className="bg-glow-gold/8 border border-glow-gold/20 rounded-xl px-3 py-2.5 mb-4">
            <p className="font-inter text-[9px] text-glow-gold mb-0.5 flex items-center gap-1">
              <Sparkles size={8} /> Ready for full analysis
            </p>
            <p className="font-inter text-[9px] text-white/70 leading-relaxed">
              Complete your profile to receive character-inspired looks, style recommendations, and curated salon matches.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={resetScan}
              className="btn-outline-gold flex-1 text-xs py-2 px-3 border-white/20 text-white/70 hover:text-white"
            >
              Rescan
            </button>
            <button
              onClick={() => navigate('/profile-setup')}
              className="btn-gold flex-1 text-xs py-2 px-3 gap-1 shadow-luxury"
            >
              Analyse Yours <ArrowRight size={11} />
            </button>
          </div>

          {/* Post-analysis debug panel */}
          {DEBUG_ENABLED && (
            <button
              onClick={() => setShowDebug(v => !v)}
              className="mt-3 flex items-center gap-1.5 text-[9px] font-inter text-white/55 hover:text-white/80 transition-colors mx-auto"
            >
              <Bug size={9} />{showDebug ? 'Hide' : 'Show'} analysis debug
            </button>
          )}

          {DEBUG_ENABLED && showDebug && analysisResult && (
            <div className="mt-2 w-full bg-black/50 border border-white/10 rounded-xl p-3 text-left font-mono text-[9px] text-white/70 overflow-auto max-h-48">
              <p className="text-[10px] font-semibold text-glow-gold mb-2">🔬 Analysis Result</p>
              <pre className="whitespace-pre-wrap">
                {JSON.stringify({
                  faceShape: analysisResult.faceShape,
                  faceShapeConfidence: analysisResult.faceShapeConfidence,
                  faceShapeReason: analysisResult.faceShapeReason,
                  skinTone: analysisResult.skinTone,
                  skinUndertone: analysisResult.skinUndertone,
                  skinConfidence: analysisResult.skinConfidence,
                  hairVisible: analysisResult.hairVisible,
                  landmarksDetected: analysisResult.landmarksDetected,
                }, null, 2)}
              </pre>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}

/* ---------- Static data for page sections --------------------------------- */

const TESTIMONIALS = [
  {
    name: 'Aisha Kapoor',
    role: 'Fashion Consultant, Vogue India',
    avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=80&q=80',
    review: 'GlowAI matched me with Luxe Studio Bandra instantly. The AI understood my aesthetic better than I could articulate myself. Absolute game-changer for Mumbai.',
  },
  {
    name: 'Sneha Reddy',
    role: 'Entrepreneur & Beauty Enthusiast',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&q=80',
    review: 'The bridal planner alone is worth everything. A 90-day beauty timeline, perfectly personalised to my skin and style. My wedding day look was flawless.',
  },
  {
    name: 'Mira Shah',
    role: 'Marketing Director',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&q=80',
    review: 'I used the budget optimizer and saved ₹3,200 on my monthly beauty routine without compromising on quality. Smart, effortless, luxurious.',
  },
]

const HOW_STEPS = [
  {
    step: '01',
    icon: <Heart size={22} />,
    title: 'Create Style Profile',
    desc: 'Share your grooming goals, skin concerns, style preferences, and budget in under 2 minutes.',
  },
  {
    step: '02',
    icon: <Zap size={22} />,
    title: 'Receive AI Recommendations',
    desc: 'Our AI analyses your profile and surfaces salons, treatments, and experiences curated for you.',
  },
  {
    step: '03',
    icon: <Shield size={22} />,
    title: 'Book Your Experience',
    desc: 'Confirm your appointment instantly with verified professionals and premium salons across Mumbai.',
  },
]

const TRUST = [
  { value: 25000, suffix: '+', label: 'Beauty Consultations' },
  { value: 4.9,   suffix: '★', label: 'Average Rating',       isFloat: true },
  { value: 150,   suffix: '+', label: 'Verified Professionals' },
  { value: 50,    suffix: '+', label: 'Premium Salon Partners' },
]

/* ---------- Page ---------------------------------------------------------- */
export default function LandingPage() {
  const navigate = useNavigate()
  const [showDemo, setShowDemo] = useState(false)

  const fadeUp = {
    hidden:  { opacity: 0, y: 30 },
    visible: (i = 0) => ({
      opacity: 1, y: 0,
      transition: { delay: i * 0.12, duration: 0.6, ease: 'easeOut' },
    }),
  }

  return (
    <MainLayout>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="min-h-screen flex items-center pt-20 pb-16 px-4 sm:px-6 lg:px-8 bg-glow-bg overflow-hidden luxury-ambient">
        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div className="order-2 lg:order-1">
              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
                <span className="inline-flex items-center gap-2 bg-white/65 backdrop-blur-md border border-glow-gold/25 text-glow-deep-gold font-inter text-xs px-4 py-2 rounded-full mb-6">
                  <Sparkles size={13} /> Mumbai's AI Style Concierge
                </span>
              </motion.div>

              <motion.h1
                initial="hidden" animate="visible" variants={fadeUp} custom={1}
                className="font-playfair text-5xl sm:text-6xl lg:text-7xl font-medium text-glow-black leading-[1.08] mb-6"
              >
                Style,
                <br />
                <span className="italic text-glow-gold">Grooming</span>
                <br />
                For You
              </motion.h1>

              <motion.p
                initial="hidden" animate="visible" variants={fadeUp} custom={2}
                className="font-inter text-base sm:text-lg text-glow-muted leading-relaxed mb-8 max-w-md"
              >
                Discover salons, stylists, grooming experts, bridal artists, and self-care experiences — all personalised to your style, preferences, and budget across Mumbai.
              </motion.p>

              <motion.div
                initial="hidden" animate="visible" variants={fadeUp} custom={3}
                className="flex flex-wrap gap-4"
              >
                <button onClick={() => navigate('/profile-setup')} className="btn-gold text-base py-4 px-8">
                  Create My Style Profile <ArrowRight size={17} />
                </button>
                <button onClick={() => setShowDemo(true)} className="btn-outline-gold text-base py-4 px-8 group">
                  <div className="w-8 h-8 bg-glow-gold/12 rounded-full flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <Play size={14} className="text-glow-gold transition-colors" />
                  </div>
                  Watch Demo
                </button>
              </motion.div>
            </div>

            {/* Right */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
              className="order-1 lg:order-2 flex justify-center lg:justify-end"
            >
              <InteractiveAIBeautyAnalyzer />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Trust Metrics ────────────────────────────────── */}
      <section className="py-14 bg-glow-black border-y border-glow-gold/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {TRUST.map((item) => (
              <div key={item.label} className="text-center lg:border-r lg:border-glow-gold/16 last:border-r-0">
                <p className="font-playfair text-3xl sm:text-4xl font-medium text-glow-gold mb-1">
                  {item.isFloat
                    ? <span>{item.value}{item.suffix}</span>
                    : <><Counter target={item.value} />{item.suffix}</>
                  }
                </p>
                <p className="font-inter text-xs text-white/50 uppercase tracking-wider">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Experiences ─────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 luxury-ambient">
        <div className="max-w-7xl mx-auto relative z-10">
          <SectionHeader
            badge="Curated For You"
            title="Featured Style Experiences"
            subtitle="Handpicked beauty, grooming, and self-care experiences personalised for every style identity."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {experiences.slice(0, 3).map((exp, i) => (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <ExperienceCard experience={exp} />
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-10">
            <button onClick={() => navigate('/experiences')} className="btn-outline-gold">
              View All Experiences <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-glow-champagne border-y border-glow-border">
        <div className="max-w-7xl mx-auto">
          <SectionHeader
            badge="Simple & Effortless"
            title="How GlowAI Works"
            subtitle="Three elegant steps to your perfect beauty experience."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-px bg-gradient-to-r from-glow-border via-glow-gold to-glow-border" />
            {HOW_STEPS.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="text-center relative"
              >
                <div className="w-14 h-14 bg-glow-surface border border-glow-gold/20 rounded-2xl flex items-center justify-center text-glow-gold mx-auto mb-5 shadow-luxury">
                  {step.icon}
                </div>
                <span className="font-inter text-xs text-glow-gold uppercase tracking-widest mb-2 block">{step.step}</span>
                <h3 className="font-playfair text-xl font-semibold text-glow-black mb-3">{step.title}</h3>
                <p className="font-inter text-sm text-glow-muted leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Popular Salons ───────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <SectionHeader
            badge="Mumbai's Finest"
            title="Popular Salons"
            subtitle="Verified premium salons curated for excellence, consistency, and luxury experience."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {salons.slice(0, 6).map((salon, i) => (
              <motion.div
                key={salon.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
              >
                <SalonCard salon={salon} />
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-10">
            <button onClick={() => navigate('/salons')} className="btn-outline-gold">
              Explore All Salons <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-glow-champagne border-y border-glow-border">
        <div className="max-w-7xl mx-auto">
          <SectionHeader
            badge="Client Stories"
            title="Loved By Mumbai's Best"
            subtitle="Discover how GlowAI is transforming style, grooming, and self-care experiences across Mumbai."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
              >
                <TestimonialCard testimonial={t} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────── */}
      <section className="py-28 px-4 sm:px-6 lg:px-8 relative overflow-hidden luxury-ambient bg-glow-black">
        <div className="absolute top-0 right-0 w-96 h-96 bg-glow-gold/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-glow-rose/8 rounded-full blur-3xl" />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 text-glow-gold font-inter text-xs uppercase tracking-widest mb-6">
              <Sparkles size={13} /> Your Journey Starts Here
            </span>
            <h2 className="font-playfair text-4xl sm:text-5xl font-medium text-white leading-tight mb-6">
              Your Next Style Experience
              <br />
              <span className="italic text-glow-gold">Starts Here</span>
            </h2>
            <p className="font-inter text-base text-white/55 leading-relaxed mb-10 max-w-lg mx-auto">
              Join 25,000+ clients who have discovered their perfect style match with GlowAI. Personalised, premium, and entirely yours.
            </p>
            <button onClick={() => navigate('/profile-setup')} className="btn-gold text-base py-4 px-10 shadow-luxury-lg">
              Create My Style Profile <ArrowRight size={17} />
            </button>
          </motion.div>
        </div>
      </section>

      <DemoVideoModal isOpen={showDemo} onClose={() => setShowDemo(false)} />
    </MainLayout>
  )
}