/**
 * faceMeshService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * MediaPipe FaceLandmarker wrapper for client-side face shape analysis.
 * All computation runs in the browser via WebAssembly — no network calls
 * after the model is downloaded on first use.
 *
 * Key exports:
 *   initFaceLandmarker()       – async, singleton, safe to call multiple times
 *   detectLandmarks(imgEl)     – async, returns 478 landmarks or null
 *   classifyFaceShape(lm)      – sync, returns { shape, confidence, reason }
 */

import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

let _instance = null
let _initPromise = null

// ─────────────────────────────────────────────────────────────────────────────
// Initialisation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load the FaceLandmarker model (singleton – cached after first call).
 * Safe to call from multiple components; the promise is shared.
 *
 * @returns {Promise<FaceLandmarker>}
 */
export async function initFaceLandmarker() {
  if (_instance) return _instance
  if (_initPromise) return _initPromise

  _initPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(WASM_CDN)
    _instance = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL },
      outputFaceBlendshapes: false,
      runningMode: 'IMAGE',
      numFaces: 4,
    })
    return _instance
  })()

  return _initPromise
}

// ─────────────────────────────────────────────────────────────────────────────
// Landmark Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detect 478 facial landmarks from an HTMLImageElement (or HTMLCanvasElement).
 *
 * @param {HTMLImageElement|HTMLCanvasElement} imgEl - Fully loaded image.
 * @returns {Promise<Array<{x:number,y:number,z:number}>|null>}
 *   Array of 478 normalised [0,1] landmarks, or null if no face is found.
 */
export async function detectLandmarks(imgEl) {
  const landmarker = await initFaceLandmarker()
  const result = landmarker.detect(imgEl)
  return result?.faceLandmarks?.[0] ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// Landmark index constants (MediaPipe 478-point Face Mesh topology)
// ─────────────────────────────────────────────────────────────────────────────
const LM = {
  TOP_HEAD:         10,  // Forehead top (between hairline & brow)
  CHIN:            152,  // Lowest point of chin
  LEFT_CHEEK_OUT:  234,  // Outer left cheek / temple
  RIGHT_CHEEK_OUT: 454,  // Outer right cheek / temple
  LEFT_CHEEK:      116,  // Left cheekbone prominence
  RIGHT_CHEEK:     345,  // Right cheekbone prominence
  LEFT_JAW:        172,  // Left mandible angle
  RIGHT_JAW:       397,  // Right mandible angle
  LEFT_FOREHEAD:    21,  // Left lateral forehead
  RIGHT_FOREHEAD:  251,  // Right lateral forehead
}

function dist2D(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

// ─────────────────────────────────────────────────────────────────────────────
// Face Shape Classification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classify face shape from 478 MediaPipe landmarks using facial geometry ratios.
 *
 * Measurements used:
 *   - Face Length      : distance from TOP_HEAD → CHIN
 *   - Forehead Width   : distance from LEFT_FOREHEAD → RIGHT_FOREHEAD
 *   - Cheekbone Width  : distance from LEFT_CHEEK → RIGHT_CHEEK (wider of two cheek measures)
 *   - Jaw Width        : distance from LEFT_JAW → RIGHT_JAW
 *
 * Classification rules:
 *   Oblong   : length/width ratio > 1.50
 *   Square   : ratio < 1.05, jawWidth ≈ cheekWidth (>87%)
 *   Round    : ratio < 1.05, softer jaw (<87% of cheeks)
 *   Heart    : forehead > 106% of cheeks AND jaw < 76% of cheeks
 *   Diamond  : forehead < 86% of cheeks AND jaw < 80% of cheeks
 *   Triangle : jaw > 102% of cheeks AND forehead < 88% of cheeks
 *   Oval     : default (elongated but not oblong, balanced widths)
 *
 * @param {Array<{x:number,y:number,z:number}>} lm - Normalised landmark array.
 * @returns {{ shape: string, confidence: number, reason: string }}
 */
export function classifyFaceShape(lm) {
  if (!lm || lm.length < 455) {
    return { shape: null, confidence: 0, reason: 'Insufficient landmark data.' }
  }

  const topHead       = lm[LM.TOP_HEAD]
  const chin          = lm[LM.CHIN]
  const leftCheekOut  = lm[LM.LEFT_CHEEK_OUT]
  const rightCheekOut = lm[LM.RIGHT_CHEEK_OUT]
  const leftCheek     = lm[LM.LEFT_CHEEK]
  const rightCheek    = lm[LM.RIGHT_CHEEK]
  const leftJaw       = lm[LM.LEFT_JAW]
  const rightJaw      = lm[LM.RIGHT_JAW]
  const leftFhd       = lm[LM.LEFT_FOREHEAD]
  const rightFhd      = lm[LM.RIGHT_FOREHEAD]

  // Core measurements (normalised to [0,1] space)
  const faceLength    = dist2D(topHead, chin)
  const foreheadWidth = dist2D(leftFhd, rightFhd)
  const cheekWidthA   = dist2D(leftCheek, rightCheek)
  const cheekWidthB   = dist2D(leftCheekOut, rightCheekOut)
  const jawWidth      = dist2D(leftJaw, rightJaw)

  const maxWidth = Math.max(cheekWidthA, cheekWidthB)
  if (maxWidth === 0) {
    return { shape: null, confidence: 0, reason: 'Could not compute face width from landmarks.' }
  }

  // Derived ratios
  const ratio              = faceLength / maxWidth        // length-to-width
  const jawVsCheek         = jawWidth / maxWidth          // jaw as fraction of max width
  const foreheadVsCheek    = foreheadWidth / maxWidth     // forehead as fraction of max width

  let shape = null
  let confidence = 0
  let plainEnglishMeaning = ''
  let whyItWasDetected = ''

  if (ratio > 1.50) {
    // ── Oblong ──────────────────────────────────────────────────────────────
    shape = 'Oblong'
    confidence = Math.min(75 + Math.round((ratio - 1.50) * 40), 93)
    plainEnglishMeaning = 'Your face is noticeably longer than it is wide, with fairly straight sides.'
    whyItWasDetected = `Length-to-width ratio is ${ratio.toFixed(2)}, with consistent width across forehead, cheeks, and jaw.`
  } else if (ratio < 1.05) {
    if (jawVsCheek > 0.87) {
      // ── Square ────────────────────────────────────────────────────────────
      shape = 'Square'
      confidence = Math.min(76 + Math.round((1 - ratio) * 25), 92)
      plainEnglishMeaning = 'Your face is nearly as wide as it is long with a strong, angular jawline.'
      whyItWasDetected = `Face ratio is ${ratio.toFixed(2)}, and jaw width is ${Math.round(jawVsCheek * 100)}% of cheek width.`
    } else {
      // ── Round ─────────────────────────────────────────────────────────────
      shape = 'Round'
      confidence = Math.min(78 + Math.round((1 - ratio) * 25), 93)
      plainEnglishMeaning = 'Your face has soft, curved lines with the width and length being almost equal.'
      whyItWasDetected = `Face ratio is ${ratio.toFixed(2)}, with a gently rounded jawline (${Math.round(jawVsCheek * 100)}% of cheeks).`
    }
  } else if (foreheadVsCheek > 1.06 && jawVsCheek < 0.76) {
    // ── Heart ───────────────────────────────────────────────────────────────
    shape = 'Heart'
    confidence = Math.min(76 + Math.round((foreheadVsCheek - 1.06) * 50), 92)
    plainEnglishMeaning = 'Your forehead is the widest part of your face, tapering down to a narrow chin.'
    whyItWasDetected = `Forehead is ${Math.round(foreheadVsCheek * 100)}% of cheek width, and jaw is narrow at ${Math.round(jawVsCheek * 100)}%.`
  } else if (foreheadVsCheek < 0.86 && jawVsCheek < 0.80) {
    // ── Diamond ─────────────────────────────────────────────────────────────
    shape = 'Diamond'
    confidence = Math.min(74 + Math.round((0.86 - foreheadVsCheek) * 60), 91)
    plainEnglishMeaning = 'Your cheekbones are high and the widest part of your face, with a narrower forehead and jaw.'
    whyItWasDetected = `Cheekbones are widest, with forehead at ${Math.round(foreheadVsCheek * 100)}% and jaw at ${Math.round(jawVsCheek * 100)}% of width.`
  } else if (jawVsCheek > 1.02 && foreheadVsCheek < 0.88) {
    // ── Triangle ────────────────────────────────────────────────────────────
    shape = 'Triangle'
    confidence = Math.min(72 + Math.round((jawVsCheek - 1.02) * 40), 90)
    plainEnglishMeaning = 'Your jawline is the widest part of your face, narrowing upwards to the forehead.'
    whyItWasDetected = `Jawline (${Math.round(jawVsCheek * 100)}% of cheek width) is wider than both cheekbones and forehead.`
  } else if (ratio >= 1.05 && ratio <= 1.50 && jawVsCheek >= 0.70 && jawVsCheek <= 0.90) {
    // ── Oval (Calculated, not default) ──────────────────────────────────────
    shape = 'Oval'
    const deviation = Math.abs(ratio - 1.35) / 0.35
    confidence = Math.min(Math.round(68 + (1 - deviation) * 22), 91)
    plainEnglishMeaning = 'Your face is slightly longer than it is wide, with gently rounded proportions.'
    whyItWasDetected = `Balanced ratio of ${ratio.toFixed(2)}, cheekbones are widest point, and jaw is tapered (${Math.round(jawVsCheek * 100)}%).`
  } else if (jawVsCheek > 0.90) {
     // ── Rectangle ────────────────────────────────────────────────────────────
     shape = 'Rectangle'
     confidence = Math.min(72 + Math.round((jawVsCheek - 0.90) * 40), 90)
     plainEnglishMeaning = 'Your face is longer than it is wide, with a strong, broad jawline.'
     whyItWasDetected = `Face ratio is ${ratio.toFixed(2)}, and strong jaw width (${Math.round(jawVsCheek * 100)}% of cheeks).`
  } else {
    // ── Unrecognised ────────────────────────────────────────────────────────
    return {
      technicalClassification: null,
      confidence: 0,
      plainEnglishMeaning: '',
      whyItWasDetected: 'Face proportions do not strongly match standard shapes. Please retake photo directly facing the camera.',
      metrics: { ratio, jawVsCheek, foreheadVsCheek }
    }
  }

  return {
    technicalClassification: shape,
    confidence: Math.max(confidence, 52),
    plainEnglishMeaning,
    whyItWasDetected,
    metrics: { ratio, jawVsCheek, foreheadVsCheek },
  }
}
