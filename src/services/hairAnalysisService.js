/**
 * hairAnalysisService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Analyzes hair characteristics using simple image heuristics.
 * Examines the region above the forehead (based on the TOP_HEAD MediaPipe landmark).
 */

import { HAIR_VISIBILITY_ERROR, IMAGE_VALIDATION_THRESHOLDS, getImageQuality, getLandmarkGeometry, hasLandmarkHairVisibility } from './imageValidation'

export function analyzeHair(imgEl, landmarks) {
  // We need TOP_HEAD (10) and maybe side forehead landmarks (21, 251) to estimate the hair region
  if (!imgEl || !landmarks || landmarks.length < 346) {
    return getFallback()
  }

  const topHead = landmarks[10]
  if (!topHead) return getFallback()
  const geometry = getLandmarkGeometry(landmarks)
  if (!hasLandmarkHairVisibility(geometry)) return getFallback()

  const quality = getImageQuality(imgEl)
  if (
    quality.brightness < IMAGE_VALIDATION_THRESHOLDS.brightnessMin ||
    quality.blurScore < IMAGE_VALIDATION_THRESHOLDS.blurMin
  ) {
    return getFallback()
  }

  const imgW = imgEl.naturalWidth || imgEl.width || 640
  const imgH = imgEl.naturalHeight || imgEl.height || 640

  const canvas = document.createElement('canvas')
  // For performance, we can scale down the image or just sample a small region
  canvas.width = imgW
  canvas.height = imgH
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(imgEl, 0, 0, imgW, imgH)

  // Define a bounding box above the forehead to sample hair
  const hX = Math.max(0, topHead.x * imgW - 48)
  const hY = Math.max(0, topHead.y * imgH - 92)
  const hW = 80
  const hH = Math.min(imgH - hY, 50)

  if (hY <= 0 || hW <= 0 || hH <= 0 || hY < imgH * 0.04) {
    return getFallback()
  }

  const imgData = ctx.getImageData(hX, hY, hW, hH)
  const data = imgData.data

  let totalLuma = 0
  const lumas = []
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    // Calculate relative luminance
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    lumas.push(luma)
    totalLuma += luma
  }

  const avgLuma = totalLuma / lumas.length
  const darkPixels = lumas.filter(luma => luma < 90).length
  const hairCoverage = darkPixels / lumas.length
  const leftCoverage = sampleDarkCoverage(ctx, Math.max(0, geometry.minX * imgW - 20), Math.max(0, geometry.minY * imgH), 32, Math.min(imgH - geometry.minY * imgH, 90))
  const rightCoverage = sampleDarkCoverage(ctx, Math.min(imgW - 32, geometry.maxX * imgW - 12), Math.max(0, geometry.minY * imgH), 32, Math.min(imgH - geometry.minY * imgH, 90))
  const sideHairCoverage = Math.max(leftCoverage, rightCoverage)
  
  // Calculate variance to guess texture
  let varianceSum = 0
  for (let i = 0; i < lumas.length; i++) {
    varianceSum += Math.pow(lumas[i] - avgLuma, 2)
  }
  const variance = varianceSum / lumas.length

  // High variance usually means shadows/highlights from curls or waves
  // Low variance means straight hair
  
  let type = ''
  let confidence = 0
  let plainEnglishMeaning = ''
  let whyItWasDetected = ''

  if (
    hairCoverage < IMAGE_VALIDATION_THRESHOLDS.hairCoverageMin ||
    sideHairCoverage < IMAGE_VALIDATION_THRESHOLDS.sideHairCoverageMin ||
    variance < 180
  ) {
    return getFallback()
  }

  // Heuristic thresholds (highly simplified for client-side demo)
  if (variance > 1800 && hairCoverage > 0.24) {
    type = 'Type 3A–3C' // Curly
    confidence = Math.min(65 + (variance - 1500) / 100, 89)
    plainEnglishMeaning = 'Your hair appears to have a curly pattern with distinct definition.'
    whyItWasDetected = `High texture variance (${Math.round(variance)}) detected in the region above the forehead, indicating curls and volume.`
  } else if (variance > 950) {
    type = 'Type 2A–2C' // Wavy
    confidence = Math.min(70 + (variance - 800) / 50, 86)
    plainEnglishMeaning = 'Your hair shows visible loose S-pattern waves.'
    whyItWasDetected = `Moderate texture variance (${Math.round(variance)}) detected, typical of wavy hair.`
  } else if (variance > 180) {
    type = 'Type 1A–1C' // Straight
    confidence = Math.min(75 + (800 - variance) / 20, 92)
    plainEnglishMeaning = 'Your hair appears mostly straight with minimal wave pattern.'
    whyItWasDetected = `Low texture variance (${Math.round(variance)}) detected, indicating smooth, straight hair.`
  } else {
    // Too uniform, might be background or overexposed
    return getFallback()
  }

  // Ensure confidence meets threshold
  if (confidence < IMAGE_VALIDATION_THRESHOLDS.hairConfidenceMin) {
    return getFallback()
  }

  return {
    technicalClassification: type,
    confidence: Math.round(confidence),
    plainEnglishMeaning,
    whyItWasDetected,
    metrics: {
      hairCoverage: Number(hairCoverage.toFixed(2)),
      sideHairCoverage: Number(sideHairCoverage.toFixed(2)),
      brightness: Number(quality.brightness.toFixed(1)),
      blurScore: Number(quality.blurScore.toFixed(2)),
    }
  }
}

function sampleDarkCoverage(ctx, x, y, w, h) {
  if (w <= 0 || h <= 0) return 0
  const safeX = Math.max(0, Math.floor(x))
  const safeY = Math.max(0, Math.floor(y))
  const safeW = Math.max(1, Math.floor(Math.min(w, ctx.canvas.width - safeX)))
  const safeH = Math.max(1, Math.floor(Math.min(h, ctx.canvas.height - safeY)))
  const data = ctx.getImageData(safeX, safeY, safeW, safeH).data
  let dark = 0
  let total = 0
  for (let i = 0; i < data.length; i += 4) {
    const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
    if (luma < 90) dark++
    total++
  }
  return total ? dark / total : 0
}

function getFallback() {
  return {
    technicalClassification: null,
    confidence: 0,
    plainEnglishMeaning: '',
    whyItWasDetected: HAIR_VISIBILITY_ERROR
  }
}
