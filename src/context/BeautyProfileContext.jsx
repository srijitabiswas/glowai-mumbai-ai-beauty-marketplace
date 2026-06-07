import { createContext, useContext, useState } from 'react'

const BeautyProfileContext = createContext(null)

export const BeautyProfileProvider = ({ children }) => {
  const [profile, setProfile]       = useState(null)
  const [analysis, setAnalysis]     = useState(null)
  const [isAnalyzed, setIsAnalyzed] = useState(false)

  // Chatbot site-wide persistent states
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatHistory, setChatHistory] = useState([
    {
      id: 'init',
      isUser: false,
      text: "Hi! I'm Glow ✨\n\nTell me what occasion you're preparing for, your budget, and what kind of look you're imagining. Like: *'I have a wedding next month, budget ₹4000'*",
    }
  ])
  const openChat = () => setIsChatOpen(true)

  // Onboarding step and form state persistence
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [form, setForm] = useState({
    photo: null,
    photoPreview: null,
    name: '',
    styleProfile: '',
    skinConcern: '',
    styleIntent: '',
    userIntent: '',
    occasion: '',
    inspirations: [],
    budgetRange: '',
  })

  const saveProfile  = (data) => setProfile(data)
  const saveAnalysis = (data) => { setAnalysis(data); setIsAnalyzed(true) }
  
  const clearProfile = () => { 
    setProfile(null)
    setAnalysis(null)
    setIsAnalyzed(false)
    setOnboardingStep(0)
    setForm({
      photo: null,
      photoPreview: null,
      name: '',
      styleProfile: '',
      skinConcern: '',
      styleIntent: '',
      userIntent: '',
      occasion: '',
      inspirations: [],
      budgetRange: '',
    })
  }

  return (
    <BeautyProfileContext.Provider value={{ 
      profile, 
      analysis, 
      isAnalyzed, 
      saveProfile, 
      saveAnalysis, 
      clearProfile,
      onboardingStep,
      setOnboardingStep,
      form,
      setForm,
      isChatOpen,
      setIsChatOpen,
      chatHistory,
      setChatHistory,
      openChat
    }}>
      {children}
    </BeautyProfileContext.Provider>
  )
}

export const useBeautyProfile = () => {
  const ctx = useContext(BeautyProfileContext)
  if (!ctx) throw new Error('useBeautyProfile must be inside BeautyProfileProvider')
  return ctx
}
