import { createContext, useContext, useState } from 'react'

const BeautyProfileContext = createContext(null)

export const BeautyProfileProvider = ({ children }) => {
  const [profile, setProfile]       = useState(null)
  const [analysis, setAnalysis]     = useState(null)
  const [isAnalyzed, setIsAnalyzed] = useState(false)

  const saveProfile  = (data) => setProfile(data)
  const saveAnalysis = (data) => { setAnalysis(data); setIsAnalyzed(true) }
  const clearProfile = () => { setProfile(null); setAnalysis(null); setIsAnalyzed(false) }

  return (
    <BeautyProfileContext.Provider value={{ profile, analysis, isAnalyzed, saveProfile, saveAnalysis, clearProfile }}>
      {children}
    </BeautyProfileContext.Provider>
  )
}

export const useBeautyProfile = () => {
  const ctx = useContext(BeautyProfileContext)
  if (!ctx) throw new Error('useBeautyProfile must be inside BeautyProfileProvider')
  return ctx
}