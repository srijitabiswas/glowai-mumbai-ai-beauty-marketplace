import { Sparkles, Instagram, Twitter, Youtube } from 'lucide-react'

const COL1 = ['Find Salons', 'Premium Experiences', 'Bridal Planner', 'At-Home Services', 'Budget Optimizer']
const COL2 = ['About GlowAI', 'For Salons', 'Privacy Policy', 'Terms of Service', 'Contact Us']

export default function Footer() {
  return (
    <footer className="bg-glow-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-glow-gold to-glow-rose rounded-full flex items-center justify-center">
                <Sparkles size={15} className="text-white" />
              </div>
              <span className="font-playfair text-xl font-semibold">GlowAI</span>
            </div>
            <p className="font-inter text-sm text-white/55 leading-relaxed max-w-xs">
              Mumbai's AI-powered beauty concierge. Discover salons, stylists, and premium beauty experiences personalized to your profile.
            </p>
            <div className="flex gap-3 mt-6">
              {[Instagram, Twitter, Youtube].map((Icon, i) => (
                <button key={i} className="w-9 h-9 border border-white/20 rounded-full flex items-center justify-center hover:border-glow-gold hover:text-glow-gold transition-colors duration-200">
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>

          {/* Explore */}
          <div>
            <h4 className="font-inter text-xs uppercase tracking-widest mb-5 text-white/50">Explore</h4>
            <ul className="space-y-3">
              {COL1.map((i) => (
                <li key={i}><a href="#" className="font-inter text-sm text-white/50 hover:text-glow-gold transition-colors">{i}</a></li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-inter text-xs uppercase tracking-widest mb-5 text-white/50">Support</h4>
            <ul className="space-y-3">
              {COL2.map((i) => (
                <li key={i}><a href="#" className="font-inter text-sm text-white/50 hover:text-glow-gold transition-colors">{i}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-inter text-xs text-white/35">© 2025 GlowAI Mumbai. All rights reserved.</p>
          <p className="font-inter text-xs text-white/35 flex items-center gap-1.5">
            Made with <span className="text-glow-gold">♥</span> in Mumbai
          </p>
        </div>
      </div>
    </footer>
  )
}
