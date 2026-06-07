export function computeBrightness(ctx, w, h) {
  const data = ctx.getImageData(0, 0, w, h).data
  let sum = 0, count = 0
  for (let i = 0; i < data.length; i += 16) {
    sum += (data[i] + data[i + 1] + data[i + 2]) / 3
    count++
  }
  return count > 0 ? sum / count : 0
}

export function computeBlurScore(ctx, w, h) {
  const data = ctx.getImageData(0, 0, w, h).data
  let lapSum = 0, count = 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const center = (data[(y * w + x) * 4] + data[(y * w + x) * 4 + 1] + data[(y * w + x) * 4 + 2]) / 3
      const top    = (data[((y - 1) * w + x) * 4] + data[((y - 1) * w + x) * 4 + 1] + data[((y - 1) * w + x) * 4 + 2]) / 3
      const bottom = (data[((y + 1) * w + x) * 4] + data[((y + 1) * w + x) * 4 + 1] + data[((y + 1) * w + x) * 4 + 2]) / 3
      const left   = (data[(y * w + x - 1) * 4] + data[(y * w + x - 1) * 4 + 1] + data[(y * w + x - 1) * 4 + 2]) / 3
      const right  = (data[(y * w + x + 1) * 4] + data[(y * w + x + 1) * 4 + 1] + data[(y * w + x + 1) * 4 + 2]) / 3
      lapSum += Math.abs(-4 * center + top + bottom + left + right)
      count++
    }
  }
  return count > 0 ? lapSum / count : 0
}

/**
 * Validates an image source (video frame or image element) against standard criteria.
 * @param {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement} element 
 * @param {FaceDetector} detector 
 * @param {number} width 
 * @param {number} height 
 */
export function validateImageSource(element, detector, width, height) {
  const offscreen = document.createElement('canvas')
  offscreen.width = 48
  offscreen.height = 48
  const offCtx = offscreen.getContext('2d', { willReadFrequently: true })
  
  offCtx.drawImage(element, 0, 0, 48, 48)
  const brightness = computeBrightness(offCtx, 48, 48)
  const blurScore = computeBlurScore(offCtx, 48, 48)

  let facesDetected = 0
  let faceCentered = false
  let faceSize = 0
  let hairVisibility = false
  let facePresent = false
  const errors = []

  try {
    const timestamp = performance.now()
    const result = detector.detectForVideo(element, timestamp)
    
    facesDetected = result?.detections?.length || 0
    if (facesDetected > 0) {
      facePresent = true
      const box = result.detections[0].boundingBox
      const cx = (box.originX + box.width / 2) / width
      const cy = (box.originY + box.height / 2) / height
      const topY = box.originY / height

      faceCentered =
        cx > IMAGE_VALIDATION_THRESHOLDS.centerXMin &&
        cx < IMAGE_VALIDATION_THRESHOLDS.centerXMax &&
        cy > IMAGE_VALIDATION_THRESHOLDS.centerYMin &&
        cy < IMAGE_VALIDATION_THRESHOLDS.centerYMax
      
      // Hair visibility: require hair to be visible at the top of the frame
      hairVisibility = topY > IMAGE_VALIDATION_THRESHOLDS.hairTopMin

      // 3. Face size check: box height relative to frame height.
      faceSize = parseFloat(((box.height / height) * 100).toFixed(1))
    }
  } catch (err) {
    console.error('[validateImageSource] Detection error:', err)
  }

  const lightingGood = brightness > IMAGE_VALIDATION_THRESHOLDS.brightnessMin
  const notBlurry = blurScore > IMAGE_VALIDATION_THRESHOLDS.blurMin

  if (facesDetected === 0) {
    errors.push('No face detected.')
  } else if (facesDetected > 1) {
    errors.push('Multiple faces detected. Please upload a photo containing only yourself.')
  }

  if (facesDetected === 1) {
    if (!faceCentered) {
      errors.push('Face not centered. Please face the camera directly.')
    }
    if (faceSize < IMAGE_VALIDATION_THRESHOLDS.faceHeightMin * 100) {
      errors.push('Face too small. Move closer to the camera and retake your selfie.')
    }
    if (faceSize > IMAGE_VALIDATION_THRESHOLDS.faceHeightMax * 100) {
      errors.push('Image crop is too tight. Keep your full head and both sides visible.')
    }
    if (!hairVisibility) {
      errors.push(HAIR_VISIBILITY_ERROR)
    }
  }

  if (!lightingGood) {
    errors.push('Low lighting detected. Move to a brighter area.')
  }
  if (!notBlurry) {
    errors.push('Image is blurry. Hold steady and retake your selfie.')
  }

  const validationPassed = errors.length === 0

  return {
    facesDetected,
    faceCentered: facePresent && faceCentered,
    faceSize,
    brightnessScore: parseFloat(brightness.toFixed(1)),
    blurScore: parseFloat(blurScore.toFixed(2)),
    hairVisibility: facePresent && hairVisibility,
    validationPassed,
    errors
  }
}

export function validateLandmarkReadiness(imgEl, landmarks) {
  const errors = []
  const quality = imgEl ? getImageQuality(imgEl) : { brightness: 0, blurScore: 0 }

  if (!imgEl) {
    errors.push('No selfie found. Please upload a clear selfie before continuing.')
    return { validationPassed: false, errors, quality }
  }

  if (!landmarks?.length) {
    errors.push('Face not detected. Please upload a front-facing selfie with your face clearly visible.')
  }

  if (quality.brightness < IMAGE_VALIDATION_THRESHOLDS.brightnessMin) {
    errors.push('Lighting insufficient. Move to a brighter area and retake your selfie.')
  }

  if (quality.blurScore < IMAGE_VALIDATION_THRESHOLDS.blurMin) {
    errors.push('Image is blurry. Hold steady and retake your selfie.')
  }

  const geometry = landmarks?.length ? getLandmarkGeometry(landmarks) : null
  if (geometry) {
    const { minX, maxX, minY, faceWidth, faceHeight, cx, cy, topHead } = geometry

    if (
      cx < IMAGE_VALIDATION_THRESHOLDS.centerXMin ||
      cx > IMAGE_VALIDATION_THRESHOLDS.centerXMax ||
      cy < IMAGE_VALIDATION_THRESHOLDS.centerYMin ||
      cy > IMAGE_VALIDATION_THRESHOLDS.centerYMax
    ) {
      errors.push('Face not centered. Please face the camera directly.')
    }

    if (faceHeight < IMAGE_VALIDATION_THRESHOLDS.faceHeightMin) {
      errors.push('Face too far away. Move closer and retake your selfie.')
    }

    if (
      faceHeight > IMAGE_VALIDATION_THRESHOLDS.faceHeightMax ||
      minX < IMAGE_VALIDATION_THRESHOLDS.cropSideMin ||
      maxX > 1 - IMAGE_VALIDATION_THRESHOLDS.cropSideMin ||
      minY < IMAGE_VALIDATION_THRESHOLDS.cropTopMin
    ) {
      errors.push('Image crop is too tight. Keep your full head and both sides visible.')
    }

    if (!hasLandmarkHairVisibility(geometry)) {
      errors.push(HAIR_VISIBILITY_ERROR)
    }
  }

  return {
    validationPassed: errors.length === 0,
    errors,
    quality,
    geometry,
  }
}

export function getImageQuality(imgEl) {
  const width = imgEl.naturalWidth || imgEl.width || 640
  const height = imgEl.naturalHeight || imgEl.height || 640
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(imgEl, 0, 0, 64, 64)
  return {
    width,
    height,
    brightness: computeBrightness(ctx, 64, 64),
    blurScore: computeBlurScore(ctx, 64, 64),
  }
}

export function getLandmarkGeometry(landmarks) {
  const xs = landmarks.map(point => point.x).filter(Number.isFinite)
  const ys = landmarks.map(point => point.y).filter(Number.isFinite)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const faceWidth = maxX - minX
  const faceHeight = maxY - minY
  return {
    minX,
    maxX,
    minY,
    maxY,
    faceWidth,
    faceHeight,
    cx: minX + faceWidth / 2,
    cy: minY + faceHeight / 2,
    topHead: landmarks[10],
  }
}

export function hasLandmarkHairVisibility(geometry) {
  if (!geometry) return false
  return Boolean(
    geometry.topHead &&
    geometry.topHead.y >= IMAGE_VALIDATION_THRESHOLDS.hairTopMin &&
    geometry.minY >= IMAGE_VALIDATION_THRESHOLDS.landmarkTopMin &&
    geometry.faceWidth >= IMAGE_VALIDATION_THRESHOLDS.hairWidthMin &&
    geometry.minX >= IMAGE_VALIDATION_THRESHOLDS.cropSideMin &&
    geometry.maxX <= 1 - IMAGE_VALIDATION_THRESHOLDS.cropSideMin
  )
}
export const IMAGE_VALIDATION_THRESHOLDS = {
  brightnessMin: 40,
  blurMin: 1.5,
  centerXMin: 0.3,
  centerXMax: 0.7,
  centerYMin: 0.2,
  centerYMax: 0.8,
  faceHeightMin: 0.2,
  faceHeightMax: 0.85,
  cropSideMin: 0.05,
  cropTopMin: 0.03,
  hairTopMin: 0.1,
  landmarkTopMin: 0.05,
  hairWidthMin: 0.15,
  hairCoverageMin: 0.12,
  sideHairCoverageMin: 0.05,
  hairConfidenceMin: 50,
}

export const HAIR_VISIBILITY_ERROR = 'Hair is not sufficiently visible.\n\nPlease keep your hair open and fully visible before continuing.'
