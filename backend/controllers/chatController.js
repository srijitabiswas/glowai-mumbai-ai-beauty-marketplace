import { OpenAI } from 'openai'
import { config, isProduction } from '../config/env.js'
import { db } from '../models/inMemoryDb.js'
import { fetchGooglePlacesSalons, geocodeAddress } from '../services/googlePlacesService.js'
import { rankSalons } from '../services/salonMatchingEngine.js'
import { salons as localSalons } from '../data/salons.js'

const SERVICE_ALIASES = [
  { intent: 'waxing', terms: ['wax', 'waxing', 'full body waxing', 'body wax', 'underarm'] },
  { intent: 'threading', terms: ['threading', 'eyebrow', 'brows', 'hd brows'] },
  { intent: 'facial', terms: ['facial', 'cleanup', 'clean-up', 'skin glow', 'glass skin', 'hydrafacial'] },
  { intent: 'hair', terms: ['hair', 'haircut', 'cut', 'blow dry', 'spa', 'keratin', 'cysteine', 'balayage', 'color'] },
  { intent: 'makeup', terms: ['makeup', 'makeover', 'bridal', 'reception', 'wedding', 'party'] },
  { intent: 'nails', terms: ['nail', 'manicure', 'pedicure', 'gel polish'] },
  { intent: 'massage', terms: ['massage', 'spa', 'aromatherapy'] }
]

const AFFORDABLE_SERVICES = [
  { salonName: 'Glow Essential Bandra', location: 'Bandra West', area: 'Bandra', rating: 4.4, reviewCount: 86, service: 'Underarm Waxing', price: 250, duration: '20 min', specialties: ['Waxing', 'Threading', 'Clean-up'], tags: ['Budget Friendly', 'Express Services'], coordinates: { lat: 19.0588, lng: 72.8324 } },
  { salonName: 'Velvet Beauty Andheri', location: 'Andheri West', area: 'Andheri', rating: 4.8, reviewCount: 218, service: 'Eyebrow Design', price: 500, duration: '30 min', specialties: ['Threading', 'Skin Treatments', 'Nail Art'], tags: ['Celebrity Choice', 'Express Services'], coordinates: { lat: 19.1206, lng: 72.8275 } },
  { salonName: 'Blossom Beauty Mulund', location: 'Mulund West', area: 'Powai', rating: 4.5, reviewCount: 120, service: 'Fruit Clean-up Facial', price: 800, duration: '45 min', specialties: ['Threading', 'Hair Styling', 'Facials'], tags: ['Affordable', 'Friendly'], coordinates: { lat: 19.1725, lng: 72.9563 } },
  { salonName: 'Radiance Parlour Worli', location: 'Worli', area: 'Lower Parel', rating: 4.5, reviewCount: 95, service: 'Half Arms Waxing', price: 450, duration: '30 min', specialties: ['Facials', 'Waxing', 'Manicure'], tags: ['Clean', 'Budget Friendly'], coordinates: { lat: 19.0088, lng: 72.8172 } },
  { salonName: 'Urban Fringe Santa Cruz', location: 'Santa Cruz West', area: 'Bandra', rating: 4.3, reviewCount: 71, service: 'Basic Threading Package', price: 350, duration: '25 min', specialties: ['Styling & Trimming', 'Organic Henna', 'Pedicure'], tags: ['Express Services', 'Budget Friendly'], coordinates: { lat: 19.0810, lng: 72.8410 } },
  { salonName: 'Mahogany Studio Malad', location: 'Malad West', area: 'Andheri', rating: 4.4, reviewCount: 94, service: 'Full Arms Waxing', price: 499, duration: '35 min', specialties: ['Nail Extensions', 'Hair Spa', 'Waxing'], tags: ['Hygienic', 'Friendly'], coordinates: { lat: 19.1860, lng: 72.8485 } }
]

function parseBudget(text = '', profileBudget = '') {
  const source = `${text} ${profileBudget}`.toLowerCase()
  const underMatch = source.match(/(?:under|below|less than|within|upto|up to)\s*₹?\s*([\d,]+)/)
  if (underMatch) return Number(underMatch[1].replace(/,/g, ''))

  const rupeeMatches = [...source.matchAll(/₹\s*([\d,]+)/g)].map(match => Number(match[1].replace(/,/g, '')))
  if (rupeeMatches.length) return Math.max(...rupeeMatches)

  const plainBudget = source.match(/budget\s*(?:is|of|:)?\s*([\d,]+)/)
  if (plainBudget) return Number(plainBudget[1].replace(/,/g, ''))

  return null
}

function detectIntent(text = '') {
  const lower = text.toLowerCase()
  const match = SERVICE_ALIASES.find(group => group.terms.some(term => lower.includes(term)))
  if (match) return match.intent
  if (/wedding|bridal|reception|sangeet|engagement|occasion/.test(lower)) return 'occasion_plan'
  return 'beauty_concierge'
}

function serviceMatches(serviceText, intent, message) {
  const lower = serviceText.toLowerCase()
  const query = message.toLowerCase()
  const alias = SERVICE_ALIASES.find(group => group.intent === intent)
  if (alias?.terms.some(term => lower.includes(term) || query.includes(term) && lower.includes(intent))) return true
  return query.split(/\s+/).some(word => word.length > 3 && lower.includes(word))
}

function withDistance(item, activeCoords) {
  if (!activeCoords || !item.coordinates) return item
  const toRad = value => (value * Math.PI) / 180
  const earthKm = 6371
  const dLat = toRad(item.coordinates.lat - activeCoords.lat)
  const dLng = toRad(item.coordinates.lng - activeCoords.lng)
  const lat1 = toRad(activeCoords.lat)
  const lat2 = toRad(item.coordinates.lat)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return { ...item, distance: earthKm * c }
}

function buildLocalServiceMatches(message, profileState, activeCoords) {
  const budget = parseBudget(message, profileState?.budget)
  const intent = detectIntent(message)
  const queryLocation = (profileState?.location || '').toLowerCase()
  const baseServices = localSalons.flatMap(salon => (salon.services || []).map(service => ({
    salonName: salon.name,
    location: salon.location,
    area: salon.area,
    rating: salon.rating,
    reviewCount: salon.reviewCount,
    service: service.name,
    price: service.price,
    duration: service.duration,
    specialties: salon.specialties,
    tags: salon.tags,
    coordinates: salon.coordinates
  })))

  const allServices = [...baseServices, ...AFFORDABLE_SERVICES].map(item => withDistance(item, activeCoords))
  const matches = allServices
    .filter(item => {
      const matchesIntent = intent === 'beauty_concierge' || intent === 'occasion_plan' || serviceMatches(`${item.service} ${(item.specialties || []).join(' ')} ${(item.tags || []).join(' ')}`, intent, message)
      const matchesBudget = !budget || item.price <= budget
      const matchesLocation = !queryLocation || queryLocation.includes('current gps') || item.area?.toLowerCase().includes(queryLocation) || item.location?.toLowerCase().includes(queryLocation) || queryLocation.includes(item.area?.toLowerCase())
      return matchesIntent && matchesBudget && matchesLocation
    })
    .sort((a, b) => {
      if (typeof a.distance === 'number' && typeof b.distance === 'number' && a.distance !== b.distance) return a.distance - b.distance
      if (a.price !== b.price) return a.price - b.price
      return b.rating - a.rating
    })
    .slice(0, 5)

  if (matches.length >= 3) return matches

  const nearbyMatches = allServices
    .filter(item => {
      const matchesIntent = intent === 'beauty_concierge' || intent === 'occasion_plan' || serviceMatches(`${item.service} ${(item.specialties || []).join(' ')} ${(item.tags || []).join(' ')}`, intent, message)
      const matchesBudget = !budget || item.price <= budget
      return matchesIntent && matchesBudget
    })
    .sort((a, b) => {
      if (typeof a.distance === 'number' && typeof b.distance === 'number' && a.distance !== b.distance) return a.distance - b.distance
      if (a.price !== b.price) return a.price - b.price
      return b.rating - a.rating
    })

  return [...matches, ...nearbyMatches.filter(item => !matches.some(match => match.salonName === item.salonName && match.service === item.service))]
    .slice(0, 5)
}

function formatServiceMatches(matches) {
  if (!matches.length) return 'No exact service-and-budget matches found in the GlowAI local dataset.'
  return matches.map((item, idx) => `${idx + 1}. **${item.salonName}**
   - Service: ${item.service}
   - Rating: ⭐ ${item.rating} (${item.reviewCount} reviews)
   - Price: ₹${item.price}
   - Duration: ${item.duration}
   - Location: ${item.location}
   - Distance: ${typeof item.distance === 'number' ? `${item.distance.toFixed(1)} km away` : 'Ask user for area/GPS to calculate'}
   - Specialties: ${(item.specialties || []).join(', ')}`).join('\n\n')
}

function buildLocalConciergeReply({ message, profileState, serviceMatches, detectedIntent, detectedBudget, locationName }) {
  const area = locationName && !locationName.toLowerCase().includes('current gps') ? locationName : 'your area'

  if (detectedIntent === 'occasion_plan') {
    const occasion = profileState?.occasion || message
    return `✨ Absolutely. For ${occasion}, I would plan this in phases:

1. **Now:** decide the style direction, outfit neckline, hair length, and grooming priorities.
2. **3-4 weeks before:** book skin prep, hair consult, brows/beard shaping if needed, and a trial look.
3. **1 week before:** do final facial or clean-up, hair spa/trim, nails, and outfit-compatible styling.
4. **Event week:** keep treatments gentle, hydrate, and lock the final look.

For your profile, I would lean toward **${profileState?.stylePreference || 'a polished, camera-ready style'}** with a budget estimate of **${profileState?.budget || '₹3,000-₹8,000'}** depending on salon tier.

Would you like me to make this more bridal, minimal, celebrity-inspired, or clean professional?`
  }

  if (serviceMatches.length > 0) {
    const introBudget = detectedBudget ? ` within ₹${detectedBudget}` : ''
    const lines = serviceMatches.slice(0, 3).map((item, idx) => `${idx + 1}. **${item.salonName}**
   ⭐ ${item.rating}
   ${item.service} - ₹${item.price}
   ${typeof item.distance === 'number' ? `${item.distance.toFixed(1)} km away` : item.location}`)

    return `✨ I found ${Math.min(serviceMatches.length, 3)} ${detectedIntent.replace('_', ' ')} option${serviceMatches.length === 1 ? '' : 's'} near ${area}${introBudget}:

${lines.join('\n\n')}

My pick: start with the closest option if you want speed, or choose the highest-rated salon if finish and hygiene matter more.

Would you prefer:
• Home service
• Salon visit
• A full package with add-ons`
  }

  return `✨ I can help with that. I could not find an exact salon-service match in the current GlowAI dataset for ${area}, so I need one detail before I recommend:

What matters most right now: lowest price, closest salon, highest rating, or a specific look?`
}

/**
 * Controller handling real-time OpenAI streaming chat for the Glow concierge.
 */
export const handleChat = async (req, res, next) => {
  try {
    const { userId, message, profileState, coords } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Message is required.' })
    }

    // 1. Fetch chat history from in-memory DB
    const dbHistory = userId ? await db.chatHistories.getHistory(userId) : []
    const apiMessages = dbHistory.map(m => ({
      role: m.isUser ? 'user' : 'assistant',
      content: m.text
    }))

    // Save current user message
    if (userId) {
      await db.chatHistories.saveMessage(userId, { isUser: true, text: message })
    }

    // Append new message
    apiMessages.push({ role: 'user', content: message })

    // 2. Resolve location & fetch nearby salons
    let activeCoords = coords
    const locationName = profileState?.location || ''
    if (!activeCoords && locationName) {
      const geo = geocodeAddress(locationName)
      if (geo && geo.lat) {
        activeCoords = { lat: geo.lat, lng: geo.lng }
      }
    }

    let salonText = 'No nearby salons found or location not provided yet.'
    if (activeCoords && activeCoords.lat) {
      try {
        const radius = 5000
        const salonsData = await fetchGooglePlacesSalons(activeCoords.lat, activeCoords.lng, radius)
        
        const analysisData = {
          faceShape: { technicalClassification: profileState?.faceShape },
          hairAnalysis: { technicalClassification: profileState?.hairAnalysis },
          skinAnalysis: { technicalClassification: profileState?.skinAnalysis }
        }
        const profileData = { 
          budgetRange: profileState?.budget || '₹1,500–₹3,000', 
          occasion: profileState?.occasion || '', 
          styleIntent: profileState?.userIntent || message 
        }
        
        const rankedSalons = rankSalons(salonsData, analysisData, profileData)
        const topSalons = rankedSalons.slice(0, 4)
        
        if (topSalons.length > 0) {
          salonText = topSalons.map((s, idx) => {
            return `${idx + 1}. **${s.name}**
   - Location: ${s.location}
   - Rating: ⭐ ${s.rating} (${s.reviewCount} reviews)
   - Distance: ${s.distance ? s.distance.toFixed(1) + ' km away' : 'N/A'}
   - Match Score: ${s.matchScore}% Match
   - Estimated Cost: Starting at ₹${s.priceFrom || 1500}
   - Specialties: ${s.specialties ? s.specialties.join(', ') : 'Styling'}
   - Match Reason: ${s.whyRecommended || ''}`
          }).join('\n\n')
        }
      } catch (err) {
        console.error('Error fetching/ranking salons for concierge:', err)
      }
    }

    const detectedIntent = detectIntent(message)
    const detectedBudget = parseBudget(message, profileState?.budget)
    const serviceMatches = buildLocalServiceMatches(message, profileState, activeCoords)
    const serviceMatchText = formatServiceMatches(serviceMatches)

    // 3. Construct system prompt
    const userProfileContext = {
      faceShape: profileState?.faceShape || '',
      skinAnalysis: profileState?.skinAnalysis || '',
      hairAnalysis: profileState?.hairAnalysis || '',
      budget: profileState?.budget || '',
      location: locationName || '',
      userIntent: profileState?.userIntent || detectedIntent || '',
      stylePreference: profileState?.stylePreference || '',
      occasion: profileState?.occasion || null
    }

    const systemPrompt = `You are Glow, the AI beauty concierge for GlowAI.

You help users discover:
- Beauty styles
- Hair recommendations
- Makeup inspiration
- Beauty preparation plans
- Salon recommendations
- Service-specific salon options from GlowAI data

You speak naturally.
You are warm, smart, slightly playful, and Mumbai-aware.
Do not use excessive slang.
Never act like a generic ChatGPT assistant.
Always guide users toward personalized beauty recommendations.
Never echo the user's message back as the main answer.

Always consider:
- Face shape
- Skin analysis
- Hair analysis
- Location
- Budget
- Occasion
- User goals

when available.

Current user profile context:
${JSON.stringify(userProfileContext, null, 2)}

Detected request:
${JSON.stringify({ intent: detectedIntent, budgetCap: detectedBudget, hasCoordinates: Boolean(activeCoords), serviceMatchCount: serviceMatches.length }, null, 2)}

Behavior rules:
1. Use the profile context directly when it is available. Example: "Since your detected face shape is Oval and your hair texture is Wavy 2A..."
2. If the user describes an occasion or timeline, create a practical beauty preparation plan with phases, timing, suggested treatments, style inspirations, salon recommendations, and estimated budget.
3. If the user gives a budget, suggest what that budget can cover and ask for the next missing detail.
4. For service-and-budget requests, prioritize the GlowAI service matches below. Return salon name, rating, price, distance when available, and a short reason.
5. If location is missing for a salon request, ask for location or permission to use their current area.
6. Do not identify celebrity lookalikes or claim the user resembles a real person. You may recommend style inspirations or aesthetics.
7. Keep answers concise enough for a chat drawer, but useful and personal.
8. If the user asks for options near them and exact GPS is unavailable, use their selected area/profile location and be transparent.

GlowAI service matches:
${serviceMatchText}

Available nearby salons ranked by the GlowAI matching engine:
${salonText}`

    // 4. Send Streamed SSE Response
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    if (!config.openaiApiKey || config.openaiApiKey === 'YOUR_KEY_HERE') {
      if (isProduction) {
        console.error('OpenAI API key missing in production. Concierge disabled.')
        return res.status(503).json({
          error: 'AI concierge is unavailable in production until OPENAI_API_KEY is configured.'
        })
      }

      const localReply = buildLocalConciergeReply({
        message,
        profileState,
        serviceMatches,
        detectedIntent,
        detectedBudget,
        locationName
      })

      res.write(`data: ${JSON.stringify({ text: localReply })}\n\n`)
      if (userId) {
        await db.chatHistories.saveMessage(userId, { isUser: false, text: localReply })
      }
      res.write('data: [DONE]\n\n')
      res.end()
      return
    }

    const openai = new OpenAI({ apiKey: config.openaiApiKey })
    const messages = [
      { role: 'system', content: systemPrompt },
      ...apiMessages
    ]

    const stream = await openai.chat.completions.create({
      model: config.openaiModel,
      messages,
      stream: true,
      temperature: 0.8
    })

    let fullText = ''
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || ''
      if (text) {
        fullText += text
        res.write(`data: ${JSON.stringify({ text })}\n\n`)
      }
    }

    // Save assistant message to history
    if (userId) {
      await db.chatHistories.saveMessage(userId, { isUser: false, text: fullText.trim() })
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    console.error('SSE streaming error:', err)
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Glow chat request failed.' })
    }
    res.write(`data: ${JSON.stringify({ error: 'Glow is having trouble connecting right now. Please try again soon.' })}\n\n`)
    res.write('data: [DONE]\n\n')
    res.end()
  }
}

export const getChatHistory = async (req, res, next) => {
  try {
    const { userId } = req.params
    const history = await db.chatHistories.getHistory(userId)
    return res.status(200).json(history)
  } catch (err) {
    next(err)
  }
}

export const clearChatHistory = async (req, res, next) => {
  try {
    const { userId } = req.params
    await db.chatHistories.clearHistory(userId)
    return res.status(200).json({ success: true, message: 'Chat history cleared.' })
  } catch (err) {
    next(err)
  }
}
