import { useEffect, useRef, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Play, ArrowRight, Star, MapPin, CheckCircle2,
  Sparkles, ChevronRight, Shield, Zap, Heart,
} from 'lucide-react'
import MainLayout    from '../layouts/MainLayout'
import SalonCard     from '../components/SalonCard'
import ExperienceCard from '../components/ExperienceCard'
import TestimonialCard from '../components/TestimonialCard'
import SectionHeader from '../components/SectionHeader'
import { salons }      from '../data/salons'
import { experiences } from '../data/experiences'

/* ---------- Animated Counter ---------- */
function Counter({ target, suffix = '' }) {
  const [count, setCount] = useState(0)
  const ref    = useRef(null)
  const inView = useInView(ref, { once: true })
  useEffect(() => {
    if (!inView) return
    const step = target / 60
    let current = 0
    const timer = setInterval(() => {
      current += step
      if (current >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(current))
    }, 24)
    return () => clearInterval(timer)
  }, [inView, target])
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

/* ---------- Beauty Profile Preview Card ---------- */
function ProfilePreviewCard() {
  return (
    <motion.div
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
      className="bg-glow-black rounded-3xl p-6 shadow-luxury-lg w-full max-w-sm mx-auto lg:mx-0"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-glow-gold to-glow-rose overflow-hidden">
          <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80" alt="profile" className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="font-playfair text-white text-sm font-semibold">Priya Sharma</p>
          <p className="font-inter text-xs text-glow-gold">Beauty Profile</p>
        </div>
        <span className="ml-auto text-xs font-inter text-glow-gold bg-glow-gold/15 px-2.5 py-1 rounded-full border border-glow-gold/30">
          Active
        </span>
      </div>

      {/* Stats */}
      <div className="space-y-3 mb-6">
        {[
          { label: 'Face Shape',       value: 'Oval' },
          { label: 'Hair Type',        value: 'Wavy' },
          { label: 'Style Preference', value: 'Modern Classic' },
          { label: 'Budget Range',     value: '₹2,000 – ₹8,000' },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between border-b border-white/8 pb-2.5 last:border-0">
            <span className="font-inter text-xs text-white/45">{row.label}</span>
            <span className="font-inter text-xs font-medium text-white">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Top Match */}
      <div className="bg-white/6 rounded-2xl p-3.5 border border-white/10">
        <p className="font-inter text-xs text-glow-gold mb-2.5 flex items-center gap-1.5">
          <Sparkles size={11} /> Top Salon Match
        </p>
        <div className="flex items-center gap-3">
          <img src="https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=80&q=80" alt="salon" className="w-10 h-10 rounded-xl object-cover" />
          <div>
            <p className="font-playfair text-sm text-white font-medium">Luxe Studio Bandra</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Star size={10} className="text-glow-gold fill-glow-gold" />
              <span className="font-inter text-xs text-white/55">4.9 · Bandra West</span>
            </div>
          </div>
          <div className="ml-auto">
            <span className="text-xs font-inter text-glow-gold bg-glow-gold/15 px-2 py-0.5 rounded-full">98% match</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ---------- Testimonial Data ---------- */
const TESTIMONIALS = [
  {
    name: 'Aisha Kapoor',
    role: 'Fashion Consultant, Vogue India',
    avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=80&q=80',
    review: 'GlowAI matched me with Luxe Studio Bandra instantly. The AI understood my aesthetic better than I could articulate myself. Absolute game-changer for Mumbai.',
  },
  {
    name: 'Sneha Reddy',
    role: 'Entrepreneur & Beauty Enthusiast',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&q=80',
    review: 'The bridal planner alone is worth everything. A 90-day beauty timeline, perfectly personalised to my skin and style. My wedding day look was flawless.',
  },
  {
    name: 'Mira Shah',
    role: 'Marketing Director',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&q=80',
    review: 'I used the budget optimizer and saved ₹3,200 on my monthly beauty routine without compromising on quality. Smart, effortless, luxurious.',
  },
]

/* ---------- How It Works Steps ---------- */
const HOW_STEPS = [
  {
    step: '01',
    icon: <Heart size={22} />,
    title: 'Create Beauty Profile',
    desc: 'Share your hair type, skin concerns, style preferences, and budget in under 2 minutes.',
  },
  {
    step: '02',
    icon: <Zap size={22} />,
    title: 'Receive AI Recommendations',
    desc: 'Our AI analyses your profile and surfaces salons, treatments, and experiences curated for you.',
  },
  {
    step: '03',
    icon: <Shield size={22} />,
    title: 'Book Your Experience',
    desc: 'Confirm your appointment instantly with verified professionals and premium salons across Mumbai.',
  },
]

const TRUST = [
  { value: 25000, suffix: '+', label: 'Beauty Consultations' },
  { value: 4.9,   suffix: '★', label: 'Average Rating',      isFloat: true },
  { value: 150,   suffix: '+', label: 'Verified Professionals' },
  { value: 50,    suffix: '+', label: 'Premium Salon Partners' },
]

/* ---------- Page ---------- */
export default function LandingPage() {
  const navigate = useNavigate()

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.6, ease: 'easeOut' } }),
  }

  return (
    <MainLayout>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="min-h-screen flex items-center pt-20 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-glow-bg via-glow-surface to-glow-bg overflow-hidden">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div className="order-2 lg:order-1">
              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
                <span className="inline-flex items-center gap-2 bg-glow-gold/10 border border-glow-gold/30 text-glow-gold font-inter text-xs px-4 py-2 rounded-full mb-6">
                  <Sparkles size={13} /> Mumbai's AI Beauty Concierge
                </span>
              </motion.div>

              <motion.h1
                initial="hidden" animate="visible" variants={fadeUp} custom={1}
                className="font-playfair text-5xl sm:text-6xl lg:text-7xl font-medium text-glow-black leading-[1.08] mb-6"
              >
                Beauty,
                <br />
                <span className="italic text-glow-gold">Curated</span>
                <br />
                For You
              </motion.h1>

              <motion.p
                initial="hidden" animate="visible" variants={fadeUp} custom={2}
                className="font-inter text-base sm:text-lg text-glow-muted leading-relaxed mb-8 max-w-md"
              >
                Discover salons, stylists, bridal experts, and premium beauty experiences — all personalised to your style, preferences, and budget across Mumbai.
              </motion.p>

              <motion.div
                initial="hidden" animate="visible" variants={fadeUp} custom={3}
                className="flex flex-wrap gap-4"
              >
                <button onClick={() => navigate('/profile-setup')} className="btn-gold text-base py-4 px-8">
                  Create My Beauty Profile <ArrowRight size={17} />
                </button>
                <button className="btn-outline-gold text-base py-4 px-8 group">
                  <div className="w-8 h-8 bg-glow-gold/15 rounded-full flex items-center justify-center group-hover:bg-white/20 transition-colors">
                    <Play size={14} className="text-glow-gold group-hover:text-white transition-colors" />
                  </div>
                  Watch Demo
                </button>
              </motion.div>
            </div>

            {/* Right */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
              className="order-1 lg:order-2 flex justify-center lg:justify-end"
            >
              <ProfilePreviewCard />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Trust Metrics ────────────────────────────────── */}
      <section className="py-14 bg-glow-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {TRUST.map((item) => (
              <div key={item.label} className="text-center">
                <p className="font-playfair text-3xl sm:text-4xl font-medium text-glow-gold mb-1">
                  {item.isFloat
                    ? <span>{item.value}{item.suffix}</span>
                    : <><Counter target={item.value} />{item.suffix}</>
                  }
                </p>
                <p className="font-inter text-xs text-white/50 uppercase tracking-wider">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Experiences ─────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <SectionHeader
            badge="Curated For You"
            title="Featured Beauty Experiences"
            subtitle="Handpicked luxury experiences personalized to Mumbai's most discerning clientele."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {experiences.slice(0, 3).map((exp, i) => (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <ExperienceCard experience={exp} />
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-10">
            <button onClick={() => navigate('/experiences')} className="btn-outline-gold">
              View All Experiences <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-glow-surface border-y border-glow-border">
        <div className="max-w-7xl mx-auto">
          <SectionHeader
            badge="Simple & Effortless"
            title="How GlowAI Works"
            subtitle="Three elegant steps to your perfect beauty experience."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* connector lines on desktop */}
            <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-px bg-gradient-to-r from-glow-border via-glow-gold to-glow-border" />
            {HOW_STEPS.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="text-center relative"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-glow-gold to-glow-rose rounded-2xl flex items-center justify-center text-white mx-auto mb-5 shadow-luxury">
                  {step.icon}
                </div>
                <span className="font-inter text-xs text-glow-gold uppercase tracking-widest mb-2 block">{step.step}</span>
                <h3 className="font-playfair text-xl font-semibold text-glow-black mb-3">{step.title}</h3>
                <p className="font-inter text-sm text-glow-muted leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Popular Salons ───────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <SectionHeader
            badge="Mumbai's Finest"
            title="Popular Salons"
            subtitle="Verified premium salons curated for excellence, consistency, and luxury experience."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {salons.slice(0, 6).map((salon, i) => (
              <motion.div
                key={salon.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
              >
                <SalonCard salon={salon} />
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-10">
            <button onClick={() => navigate('/salons')} className="btn-outline-gold">
              Explore All Salons <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-glow-surface border-y border-glow-border">
        <div className="max-w-7xl mx-auto">
          <SectionHeader
            badge="Client Stories"
            title="Loved By Mumbai's Best"
            subtitle="Discover how GlowAI is transforming the beauty experience for women across Mumbai."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
              >
                <TestimonialCard testimonial={t} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────── */}
      <section
        className="py-28 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #2d2015 100%)' }}
      >
        {/* decorative */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-glow-gold/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-glow-rose/8 rounded-full blur-3xl" />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 text-glow-gold font-inter text-xs uppercase tracking-widest mb-6">
              <Sparkles size={13} /> Your Journey Starts Here
            </span>
            <h2 className="font-playfair text-4xl sm:text-5xl font-medium text-white leading-tight mb-6">
              Your Next Beauty Experience
              <br />
              <span className="italic text-glow-gold">Starts Here</span>
            </h2>
            <p className="font-inter text-base text-white/55 leading-relaxed mb-10 max-w-lg mx-auto">
              Join 25,000+ women who have discovered their perfect beauty match with GlowAI. Personalised, premium, and entirely yours.
            </p>
            <button onClick={() => navigate('/profile-setup')} className="btn-gold text-base py-4 px-10 shadow-luxury-lg">
              Create My Beauty Profile <ArrowRight size={17} />
            </button>
          </motion.div>
        </div>
      </section>
    </MainLayout>
  )
}