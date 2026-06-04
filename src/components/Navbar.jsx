import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Sparkles } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Discover',       href: '/salons' },
  { label: 'Beauty Profile', href: '/profile-setup' },
  { label: 'Experiences',    href: '/experiences' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen]         = useState(false)
  const navigate  = useNavigate()
  const location  = useLocation()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => setOpen(false), [location.pathname])

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-glow-surface/96 backdrop-blur-md shadow-card border-b border-glow-border'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 lg:h-20">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-glow-gold to-glow-rose rounded-full flex items-center justify-center">
            <Sparkles size={15} className="text-white" />
          </div>
          <span className="font-playfair text-xl font-semibold text-glow-black tracking-tight">GlowAI</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              to={l.href}
              className={`font-inter text-sm transition-colors duration-200 ${
                location.pathname === l.href ? 'text-glow-gold' : 'text-glow-muted hover:text-glow-black'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-4">
          <button className="font-inter text-sm text-glow-muted hover:text-glow-black transition-colors">
            Sign In
          </button>
          <button onClick={() => navigate('/profile-setup')} className="btn-gold text-sm py-2.5 px-5">
            Create My Profile
          </button>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setOpen(!open)} className="md:hidden p-1.5 text-glow-black">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-glow-surface border-t border-glow-border overflow-hidden"
          >
            <div className="px-5 py-6 space-y-5">
              {NAV_LINKS.map((l) => (
                <Link key={l.href} to={l.href} className="block font-inter text-base text-glow-muted hover:text-glow-black">
                  {l.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-glow-border space-y-3">
                <button className="font-inter text-sm text-glow-muted block">Sign In</button>
                <button onClick={() => navigate('/profile-setup')} className="btn-gold w-full">
                  Create My Profile
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}