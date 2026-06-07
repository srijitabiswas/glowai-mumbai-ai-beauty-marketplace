import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, MapPin, Sparkles, Loader2, Trash2, MessageSquare, X } from 'lucide-react'
import { useBeautyProfile } from '../context/BeautyProfileContext'
import { useAuth } from '../context/AuthContext'
import ChatMessage from './ChatMessage'
import { MUMBAI_AREAS } from '../data/mumbaiAreas'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'

function firstValue(...values) {
  return values.find(value => value !== undefined && value !== null && value !== '') || null
}

export default function GlowChatbot() {
  const { 
    isChatOpen, 
    setIsChatOpen, 
    chatHistory, 
    setChatHistory,
    profile,
    form, 
    setForm, 
    analysis 
  } = useBeautyProfile()
  
  const { user } = useAuth()
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [locationState, setLocationState] = useState('pending') // pending, granted, denied
  const [coords, setCoords] = useState(null)
  const [selectedArea, setSelectedArea] = useState('')
  
  const messagesEndRef = useRef(null)
  const areas = MUMBAI_AREAS
  
  const suggestedPrompts = [
    { label: '✨ Wedding Look', text: 'I have a wedding coming up next month and want to plan my look.' },
    { label: '✨ Korean Glow', text: 'Recommend a dewy Korean Glass Skin look for my profile.' },
    { label: '✨ Bridal Package', text: 'What does a complete bridal package include for hair & makeup?' },
    { label: '✨ Budget Under ₹3000', text: 'Suggest top styling recommendations and salons under ₹3000.' },
    { label: '✨ Reception Styling', text: 'I need an elegant styling plan for a reception next week.' },
    { label: '✨ Hair Makeover', text: 'Recommend a hair makeover look inspired by my face shape and hair texture.' }
  ]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom()
  }, [chatHistory, isTyping])

  // Sync history when user logs in/out
  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.id) {
        // Reset to default greeting for guests
        setChatHistory([
          {
            id: 'init',
            isUser: false,
            text: "Hi! I'm Glow ✨\n\nTell me what occasion you're preparing for, your budget, and what kind of look you're imagining. Like: *'I have a wedding next month, budget ₹4000'*",
          }
        ])
        return
      }

      try {
        const response = await fetch(`${API_BASE}/api/chat/history/${user.id}`)
        if (response.ok) {
          const data = await response.json()
          if (data && data.length > 0) {
            setChatHistory(data)
          } else {
            setChatHistory([
              {
                id: 'init',
                isUser: false,
                text: `Hi ${user.name}! I'm Glow ✨\n\nTell me what occasion you're preparing for, your budget, and what kind of look you're imagining. Like: *'I have a wedding next month, budget ₹4000'*`,
              }
            ])
          }
        }
      } catch (err) {
        console.error('Error fetching chat history:', err)
      }
    }

    fetchHistory()
  }, [user?.id, setChatHistory, user?.name])

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({ lat: position.coords.latitude, lng: position.coords.longitude })
          setLocationState('granted')
        },
        () => {
          setLocationState('denied')
        }
      )
    } else {
      setLocationState('denied')
    }
  }

  const handleSend = async (customText) => {
    const textToSend = customText || input
    if (typeof textToSend !== 'string' || !textToSend.trim()) return

    setInput('')
    
    // Request location on first interaction if pending
    if (locationState === 'pending') {
      requestLocation()
    }

    // Save intent to context if not set
    if (!form.userIntent) {
      setForm(prev => ({ ...prev, userIntent: textToSend }))
    }

    // Append user message
    const userMsgId = `user_${Date.now()}`
    setChatHistory(prev => [...prev, { id: userMsgId, isUser: true, text: textToSend }])
    setIsTyping(true)

    try {
      const profileState = {
        name: firstValue(user?.name, form?.name, profile?.name, 'GlowAI guest') || '',
        faceShape: firstValue(
          analysis?.faceShape?.technicalClassification,
          analysis?.faceShape,
          profile?.faceShape,
          profile?.faceAnalysis?.technicalClassification
        ) || '',
        skinAnalysis: firstValue(
          analysis?.skinAnalysis?.technicalClassification,
          analysis?.skinTone,
          profile?.skinAnalysis?.technicalClassification,
          profile?.skinTone
        ) || '',
        hairAnalysis: firstValue(
          analysis?.hairAnalysis?.technicalClassification,
          analysis?.hairAnalysis,
          profile?.hairAnalysis?.technicalClassification,
          profile?.hairType
        ) || '',
        userIntent: form.userIntent || textToSend,
        location: selectedArea || profile?.location || (locationState === 'granted' ? 'Current GPS location' : ''),
        budget: firstValue(form.budgetRange, profile?.budgetRange, profile?.budget) || '',
        occasion: firstValue(form.occasion, profile?.occasion) || '',
        stylePreference: firstValue(form.styleProfile, profile?.stylePreference, profile?.styleProfile) || ''
      }

      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user?.id || null,
          message: textToSend,
          profileState,
          coords
        })
      })

      if (!response.ok) {
        throw new Error('Glow chat request failed')
      }

      if (!response.body) {
        throw new Error('Glow chat streaming is unavailable in this browser')
      }

      // Create bot typing placeholder
      const botMsgId = `bot_${Date.now()}`
      setChatHistory(prev => [...prev, { id: botMsgId, isUser: false, text: '' }])

      // Parse SSE stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let botText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim()
            if (dataStr === '[DONE]') {
              break
            }
            try {
              const parsed = JSON.parse(dataStr)
              if (parsed.text) {
                botText += parsed.text
                // Stream text changes to UI
                setChatHistory(prev => {
                  const copy = [...prev]
                  const idx = copy.findIndex(m => m.id === botMsgId)
                  if (idx !== -1) {
                    copy[idx] = { ...copy[idx], text: botText }
                  }
                  return copy
                })
              } else if (parsed.error) {
                botText = parsed.error
                setChatHistory(prev => {
                  const copy = [...prev]
                  const idx = copy.findIndex(m => m.id === botMsgId)
                  if (idx !== -1) {
                    copy[idx] = { ...copy[idx], text: botText }
                  }
                  return copy
                })
              }
            } catch (err) {
              // ignore partial lines
            }
          }
        }
      }
    } catch (error) {
      console.error(error)
      setChatHistory(prev => [
        ...prev,
        { id: `err_${Date.now()}`, isUser: false, text: "Glow is having trouble connecting right now. Please try again in a moment." }
      ])
    } finally {
      setIsTyping(false)
    }
  }

  const handleClear = async () => {
    setChatHistory([
      {
        id: 'init',
        isUser: false,
        text: "Hi! I'm Glow ✨\n\nTell me what occasion you're preparing for, your budget, and what kind of look you're imagining. Like: *'I have a wedding next month, budget ₹4000'*",
      }
    ])
    if (user?.id) {
      try {
        await fetch(`${API_BASE}/api/chat/history/${user.id}`, {
          method: 'DELETE'
        })
      } catch (err) {
        console.error('Failed to clear backend chat memory:', err)
      }
    }
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[2147483000] flex flex-col items-end">
      {/* Expanded Chat Drawer */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.92 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-8rem)] bg-glow-black/95 backdrop-blur-2xl border border-glow-gold/30 rounded-3xl shadow-luxury-lg overflow-hidden flex flex-col mb-4"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-white/8 border border-glow-gold/30 flex items-center justify-center shadow-lg">
                  <Sparkles size={16} className="text-glow-gold" />
                </div>
                <div>
                  <h3 className="font-playfair text-base font-semibold text-white leading-none mb-1">Glow</h3>
                  <p className="font-inter text-[9px] text-glow-gold tracking-widest uppercase font-medium">
                    Your Personal Beauty Concierge ✨
                  </p>
                </div>
              </div>
              
              {/* Header Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClear}
                  title="Clear conversation"
                  className="p-1.5 rounded-full hover:bg-white/5 text-white/50 hover:text-white transition-colors"
                >
                  <Trash2 size={15} />
                </button>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="p-1.5 rounded-full hover:bg-white/5 text-white/50 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Geolocation Warning / Picker */}
            {locationState === 'denied' && !selectedArea && (
              <div className="bg-amber-500/10 border-b border-amber-500/20 p-3 shrink-0">
                <p className="font-inter text-[10px] text-amber-200/80 mb-1.5">Where in Mumbai are you looking?</p>
                <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto pr-1">
                  {areas.map(area => (
                    <button
                      key={area}
                      onClick={() => setSelectedArea(area)}
                      className="px-2 py-0.5 bg-black/40 border border-white/10 hover:border-glow-gold rounded-full font-inter text-[9px] text-white/70 hover:text-white transition-colors"
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 custom-scrollbar">
              {chatHistory.map(msg => (
                <ChatMessage key={msg.id} message={msg.text} isUser={msg.isUser} />
              ))}
              
              {isTyping && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="flex gap-2 items-center text-glow-gold/75 text-xs font-inter ml-11"
                >
                  <Loader2 size={11} className="animate-spin" /> Glow is typing...
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Prompts (Pills) */}
            <div className="px-4 py-2 border-t border-white/5 bg-black/20 shrink-0">
              <div className="flex gap-2 overflow-x-auto scrollbar-none snap-x snap-mandatory">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt.label}
                    onClick={() => handleSend(prompt.text)}
                    className="flex-shrink-0 snap-align-start px-3 py-1 bg-white/5 border border-white/10 hover:border-glow-gold/40 hover:bg-white/10 rounded-full font-inter text-[10px] text-white/80 hover:text-white transition-all whitespace-nowrap"
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <div className="p-3 border-t border-white/10 bg-white/5 shrink-0">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend() }}
                className="relative flex items-center"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Glow anything about beauty, styles..."
                  className="w-full bg-black/40 border border-white/15 rounded-full py-2.5 pl-4 pr-12 font-inter text-xs text-white placeholder-white/25 focus:outline-none focus:border-glow-gold transition-colors"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="absolute right-1.5 w-8 h-8 bg-glow-black border border-glow-gold/30 text-glow-gold rounded-full flex items-center justify-center hover:bg-glow-deep-gold hover:text-glow-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={13} className="ml-0.5" />
                </button>
              </form>
              
              {/* Location Indicator Footer */}
              <div className="flex items-center justify-between mt-2 px-1 text-[9px] text-white/30 font-inter">
                <div className="flex items-center gap-1">
                  <MapPin size={9} className={locationState === 'granted' || selectedArea ? 'text-glow-gold' : 'text-white/30'} />
                  <span>
                    {locationState === 'granted' ? 'GPS Active' : selectedArea ? `${selectedArea}, Mumbai` : 'Location Pending'}
                  </span>
                </div>
                <span>GlowAI Concierge v1.1</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button Launcher */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="bg-glow-black border border-glow-gold/35 hover:bg-glow-deep-gold text-white hover:text-glow-black w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-luxury cursor-pointer focus:outline-none focus:ring-2 focus:ring-glow-gold transition-all duration-300"
      >
        <MessageSquare size={20} className="text-glow-gold transition-colors" />
        <span className="text-[9px] font-inter font-medium tracking-wide mt-0.5">Glow</span>
      </motion.button>
    </div>
  )
}
