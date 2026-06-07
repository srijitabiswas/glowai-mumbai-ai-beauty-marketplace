import { motion } from 'framer-motion'
import { Sparkles, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

export default function ChatMessage({ message, isUser }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 w-full ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      <div 
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser 
            ? 'bg-white/10' 
            : 'bg-glow-black border border-glow-gold/30'
        }`}
      >
        {isUser ? <User size={14} className="text-white" /> : <Sparkles size={14} className="text-glow-gold" />}
      </div>
      
      <div 
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm font-inter leading-relaxed ${
          isUser 
            ? 'bg-white/10 text-white rounded-tr-sm backdrop-blur-md' 
            : 'bg-glow-gold/10 text-white/90 border border-glow-gold/20 rounded-tl-sm [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:ml-4 [&>ul]:list-disc [&>ul]:my-2 [&>ul>li]:my-1 [&>strong]:font-semibold'
        }`}
      >
        <ReactMarkdown>{message}</ReactMarkdown>
      </div>
    </motion.div>
  )
}
