import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config()

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY || '',
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000').split(','),
  openaiEnabled: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'YOUR_KEY_HERE'),
  googlePlacesEnabled: Boolean(process.env.GOOGLE_PLACES_API_KEY),
}

export const isProduction = config.nodeEnv === 'production'

// Log startup warnings for missing keys
if (!config.googlePlacesApiKey) {
  console.warn(
    isProduction
      ? '[Warning] GOOGLE_PLACES_API_KEY is missing. Real salon discovery is disabled.'
      : '[Warning] GOOGLE_PLACES_API_KEY is missing. Backend will use development-only local salon data.'
  )
}
if (!config.openaiApiKey) {
  console.warn(
    isProduction
      ? '[Warning] OPENAI_API_KEY is missing. AI chat is disabled until it is configured.'
      : '[Warning] OPENAI_API_KEY is missing. Glow chatbot will use development-only local concierge responses.'
  )
}
