import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Droplets, Bell, TrendingUp, ArrowRight, Sparkles, Mail, Lock, User } from 'lucide-react'

const SLIDES = [
  {
    icon: Droplets,
    title: "Meet Ally.",
    body: "Your friendly little sidekick for staying hydrated — no guilt, no spreadsheets, just water.",
    color: 'from-aqua-light to-aqua',
  },
  {
    icon: Bell,
    title: "Gentle nudges.",
    body: "Ally taps you on the shoulder when you've gone quiet, so a busy day never turns into a dry one.",
    color: 'from-sunshine to-coral-light',
  },
  {
    icon: TrendingUp,
    title: "See your streaks.",
    body: "Watch your daily habit build into something real, one glass — and one good day — at a time.",
    color: 'from-coral-light to-coral',
  },
]

// Hand-drawn wobbly underline used as a decorative accent
function Squiggle({ className = '' }) {
  return (
    <svg viewBox="0 0 120 12" className={className} fill="none">
      <path
        d="M2 8C15 2 25 10 38 6C51 2 61 10 74 6C87 2 97 10 110 5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function PressButton({ children, onClick, className = '', disabled = false, type = 'button' }) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.94, rotate: -1 }}
      whileHover={disabled ? {} : { scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      className={className}
    >
      {children}
    </motion.button>
  )
}

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState('intro') // intro -> name -> account
  const [slideIndex, setSlideIndex] = useState(0)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [creating, setCreating] = useState(false)

  const nextSlide = () => {
    if (slideIndex < SLIDES.length - 1) {
      setSlideIndex((i) => i + 1)
    } else {
      setStep('name')
    }
  }

  const handleAccountSubmit = (e) => {
    e.preventDefault()
    setCreating(true)
    // Simple mockup — simulate a beat of "creating your account"
    setTimeout(() => {
      onComplete({ name: name.trim() || 'Friend', email: email.trim() })
    }, 900)
  }

  return (
    <div className="min-h-full w-full flex flex-col bg-mist relative overflow-hidden">
      {/* ambient background blobs */}
      <div className="absolute -top-24 -right-20 w-64 h-64 rounded-full bg-aqua-light/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-16 w-72 h-72 rounded-full bg-coral-light/20 blur-3xl pointer-events-none" />

      <AnimatePresence mode="wait">
        {step === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col px-6 pt-10 pb-8 relative z-10"
          >
            <div className="flex justify-center gap-2 mb-10">
              {SLIDES.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === slideIndex ? 'w-8 bg-aqua-deep' : 'w-2 bg-aqua-light/60'
                  }`}
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={slideIndex}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                className="flex-1 flex flex-col items-center justify-center text-center"
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className={`w-32 h-32 rounded-blob bg-gradient-to-br ${SLIDES[slideIndex].color} flex items-center justify-center shadow-soft mb-8`}
                >
                  {(() => {
                    const Icon = SLIDES[slideIndex].icon
                    return <Icon className="w-14 h-14 text-white" strokeWidth={1.75} />
                  })()}
                </motion.div>

                <h1 className="font-hand text-5xl text-ink mb-1">{SLIDES[slideIndex].title}</h1>
                <Squiggle className="w-24 h-3 text-coral mb-5" />
                <p className="font-body text-inkSoft text-lg leading-relaxed max-w-xs">
                  {SLIDES[slideIndex].body}
                </p>
              </motion.div>
            </AnimatePresence>

            <PressButton
              onClick={nextSlide}
              className="mt-8 w-full bg-ink text-mist font-body font-bold text-lg py-4 rounded-full shadow-card flex items-center justify-center gap-2"
            >
              {slideIndex < SLIDES.length - 1 ? "Tell me more" : "Let's get started"}
              <ArrowRight className="w-5 h-5" />
            </PressButton>

            {slideIndex < SLIDES.length - 1 && (
              <button
                onClick={() => setStep('name')}
                className="mt-4 text-inkSoft font-body text-sm underline underline-offset-4"
              >
                Skip intro
              </button>
            )}
          </motion.div>
        )}

        {step === 'name' && (
          <motion.div
            key="name"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="flex-1 flex flex-col px-6 pt-16 pb-10 relative z-10"
          >
            <Sparkles className="w-9 h-9 text-sunshine mb-4" />
            <h1 className="font-hand text-4xl text-ink leading-tight mb-2">
              So — what should<br />I call you?
            </h1>
            <p className="font-body text-inkSoft mb-8">
              Just a first name is perfect. I like to keep things personal.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (name.trim()) setStep('account')
              }}
              className="flex-1 flex flex-col"
            >
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Type your name here..."
                className="font-hand text-3xl bg-transparent border-b-4 border-aqua/40 focus:border-aqua-deep outline-none py-3 placeholder:text-ink/25 transition-colors"
              />

              <div className="flex-1" />

              <PressButton
                type="submit"
                disabled={!name.trim()}
                className="w-full bg-coral disabled:bg-ink/15 disabled:text-ink/30 text-white font-body font-bold text-lg py-4 rounded-full shadow-card flex items-center justify-center gap-2 transition-colors"
              >
                Nice to meet you
                <ArrowRight className="w-5 h-5" />
              </PressButton>
            </form>
          </motion.div>
        )}

        {step === 'account' && (
          <motion.div
            key="account"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="flex-1 flex flex-col px-6 pt-14 pb-10 relative z-10"
          >
            <h1 className="font-hand text-4xl text-ink mb-1">
              Great to have you, {name.trim() || 'friend'}.
            </h1>
            <p className="font-body text-inkSoft mb-8">
              Let's set up your account so your progress is always saved.
            </p>

            <form onSubmit={handleAccountSubmit} className="flex-1 flex flex-col gap-4">
              <label className="block">
                <span className="font-body text-sm font-bold text-inkSoft mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-4 h-4" /> Email
                </span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-white rounded-2xl px-4 py-3.5 font-body text-ink shadow-sm border-2 border-transparent focus:border-aqua outline-none transition-colors"
                />
              </label>

              <label className="block">
                <span className="font-body text-sm font-bold text-inkSoft mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-4 h-4" /> Password
                </span>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Make it a good one"
                  minLength={4}
                  className="w-full bg-white rounded-2xl px-4 py-3.5 font-body text-ink shadow-sm border-2 border-transparent focus:border-aqua outline-none transition-colors"
                />
              </label>

              <div className="bg-aqua-light/25 rounded-2xl px-4 py-3 flex items-start gap-2.5 mt-1">
                <User className="w-4 h-4 text-aqua-deep mt-0.5 shrink-0" />
                <p className="font-body text-xs text-inkSoft leading-relaxed">
                  This is just a demo sign-up screen — no data leaves your device. Wire it up to real
                  auth whenever you're ready.
                </p>
              </div>

              <div className="flex-1" />

              <PressButton
                type="submit"
                disabled={creating}
                className="w-full bg-ink text-mist font-body font-bold text-lg py-4 rounded-full shadow-card flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {creating ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-mist/40 border-t-mist rounded-full"
                  />
                ) : (
                  <>
                    Create my account
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </PressButton>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
