import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Droplets,
  Bell,
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Mail,
  Lock,
  User,
  Coffee,
  Target,
} from 'lucide-react'

const SLIDES = [
  {
    icon: Droplets,
    title: 'Meet Ally.',
    body: "Your friendly little sidekick for staying hydrated — no guilt, no spreadsheets, just water.",
    color: 'from-aqua-light to-aqua',
  },
  {
    icon: Coffee,
    title: 'Log anything.',
    body: "Water's the star, but coffee, tea, juice, and milk all count too — tap once and Ally tracks the mix.",
    color: 'from-sunshine to-aqua-light',
  },
  {
    icon: Bell,
    title: 'Gentle nudges.',
    body: "Ally taps you on the shoulder when you've gone quiet, so a busy day never turns into a dry one.",
    color: 'from-sunshine to-coral-light',
  },
  {
    icon: TrendingUp,
    title: 'See your streaks.',
    body: "Watch your daily habit build into something real, one glass — and one good day — at a time.",
    color: 'from-coral-light to-coral',
  },
  {
    icon: Target,
    title: 'A goal built for you.',
    body: "Answer a few quick questions and Ally works out a daily target that actually fits your body, not a generic number.",
    color: 'from-aqua to-coral-light',
  },
]

const GENDERS = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'other', label: 'Other' },
]

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary', hint: 'Little to no exercise' },
  { id: 'light', label: 'Lightly active', hint: '1–3 workouts a week' },
  { id: 'moderate', label: 'Moderately active', hint: '3–5 workouts a week' },
  { id: 'active', label: 'Active', hint: '6–7 workouts a week' },
  { id: 'veryActive', label: 'Very active', hint: 'Physical job or 2x/day training' },
]

const FEET_OPTIONS = [3, 4, 5, 6, 7]
const INCH_OPTIONS = Array.from({ length: 12 }, (_, i) => i)

const LB_TO_KG = 0.453592
const IN_TO_CM = 2.54

// Rough, friendly estimate — not medical advice. Blends a weight-based
// baseline with a small body-surface-area nod (so height actually matters),
// then adjusts for activity level and age.
export function calculateDailyGoalOz({ gender, age, heightCm, weightKg, activityLevel }) {
  const baseMlPerKg = gender === 'male' ? 35 : gender === 'female' ? 31 : 33
  let ml = weightKg * baseMlPerKg

  const bsa = Math.sqrt((heightCm * weightKg) / 3600) // Mosteller formula, m²
  const bsaAdjustment = Math.max(-0.15, Math.min(0.15, (bsa / 1.73 - 1) * 0.15))
  ml *= 1 + bsaAdjustment

  const activityMultiplier =
    {
      sedentary: 1,
      light: 1.08,
      moderate: 1.16,
      active: 1.26,
      veryActive: 1.4,
    }[activityLevel] || 1
  ml *= activityMultiplier

  const ageNum = Number(age)
  if (ageNum >= 65) ml *= 0.95
  else if (ageNum > 0 && ageNum < 18) ml *= 0.9

  const oz = ml / 29.5735
  const clamped = Math.max(48, Math.min(160, oz))
  return Math.round(clamped / 4) * 4 // round to a clean 4oz step
}

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

function BackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-inkSoft font-body text-sm mb-4 -ml-1 py-1.5 px-1.5 rounded-full active:bg-ink/5"
      aria-label="Go back"
    >
      <ArrowLeft className="w-4 h-4" />
      Back
    </button>
  )
}

const CHIP_ACTIVE = 'bg-aqua-deep text-white border-aqua-deep'
const CHIP_INACTIVE = 'bg-white text-inkSoft border-transparent shadow-sm'
const INPUT_CLASS =
  'w-full bg-white rounded-2xl px-4 py-3.5 font-body text-base text-ink shadow-sm border-2 border-transparent focus:border-aqua outline-none transition-colors'

const STEP_ORDER = ['intro', 'name', 'profile', 'goal', 'account']

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState('intro')
  const [slideIndex, setSlideIndex] = useState(0)

  const [name, setName] = useState('')
  const [gender, setGender] = useState(null)
  const [age, setAge] = useState('')
  const [feet, setFeet] = useState(5)
  const [inches, setInches] = useState(7)
  const [weight, setWeight] = useState('')
  const [activityLevel, setActivityLevel] = useState(null)
  const [computedGoal, setComputedGoal] = useState(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [creating, setCreating] = useState(false)

  const goBack = () => {
    const i = STEP_ORDER.indexOf(step)
    if (i > 0) setStep(STEP_ORDER[i - 1])
  }

  const nextSlide = () => {
    if (slideIndex < SLIDES.length - 1) {
      setSlideIndex((i) => i + 1)
    } else {
      setStep('name')
    }
  }

  const profileValid = gender && age && weight && activityLevel

  const handleProfileSubmit = (e) => {
    e.preventDefault()
    if (!profileValid) return
    const heightCm = (feet * 12 + inches) * IN_TO_CM
    const weightKg = Number(weight) * LB_TO_KG
    const goal = calculateDailyGoalOz({ gender, age, heightCm, weightKg, activityLevel })
    setComputedGoal(goal)
    setStep('goal')
  }

  const handleAccountSubmit = (e) => {
    e.preventDefault()
    setCreating(true)
    setTimeout(() => {
      const payload = {
        name: name.trim() || 'Friend',
        email: email.trim(),
        gender,
        age: Number(age),
        heightCm: (feet * 12 + inches) * IN_TO_CM,
        weightKg: Number(weight) * LB_TO_KG,
        activityLevel,
        goal: computedGoal,
      }
      try {
        localStorage.setItem('ally-onboarded', '1')
        localStorage.setItem('ally-user', JSON.stringify(payload))
        localStorage.setItem('ally-goal', String(computedGoal))
      } catch {
        // storage unavailable — onComplete still runs the session normally
      }
      onComplete(payload)
    }, 900)
  }

  return (
    <div className="min-h-full w-full flex flex-col bg-mist relative overflow-hidden">
      <div className="absolute -top-24 -right-20 w-64 h-64 rounded-full bg-aqua-light/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-16 w-72 h-72 rounded-full bg-coral-light/20 blur-3xl pointer-events-none" />

      <AnimatePresence mode="wait">
        {step === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] relative z-10"
          >
            <div className="flex justify-center gap-2 mb-8 sm:mb-10">
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
                  className={`w-28 h-28 sm:w-32 sm:h-32 rounded-blob bg-gradient-to-br ${SLIDES[slideIndex].color} flex items-center justify-center shadow-soft mb-7 sm:mb-8`}
                >
                  {(() => {
                    const Icon = SLIDES[slideIndex].icon
                    return <Icon className="w-12 h-12 sm:w-14 sm:h-14 text-white" strokeWidth={1.75} />
                  })()}
                </motion.div>

                <h1 className="font-hand text-4xl sm:text-5xl text-ink mb-1">{SLIDES[slideIndex].title}</h1>
                <Squiggle className="w-24 h-3 text-coral mb-5" />
                <p className="font-body text-inkSoft text-base sm:text-lg leading-relaxed max-w-xs">
                  {SLIDES[slideIndex].body}
                </p>
              </motion.div>
            </AnimatePresence>

            <PressButton
              onClick={nextSlide}
              className="mt-8 w-full bg-ink text-mist font-body font-bold text-lg py-4 rounded-full shadow-card flex items-center justify-center gap-2"
            >
              {slideIndex < SLIDES.length - 1 ? 'Tell me more' : "Let's get started"}
              <ArrowRight className="w-5 h-5" />
            </PressButton>

            {slideIndex < SLIDES.length - 1 && (
              <button
                onClick={() => setStep('name')}
                className="mt-4 text-inkSoft font-body text-sm underline underline-offset-4 py-1"
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
            className="flex-1 flex flex-col px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] relative z-10"
          >
            <BackButton onClick={goBack} />
            <Sparkles className="w-9 h-9 text-sunshine mb-4" />
            <h1 className="font-hand text-4xl text-ink leading-tight mb-2">
              So — what should
              <br />I call you?
            </h1>
            <p className="font-body text-inkSoft mb-8">
              Just a first name is perfect. I like to keep things personal.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (name.trim()) setStep('profile')
              }}
              className="flex-1 flex flex-col"
            >
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Type your name here..."
                enterKeyHint="next"
                autoComplete="given-name"
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

        {step === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="flex-1 flex flex-col px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] relative z-10 overflow-y-auto"
          >
            <BackButton onClick={goBack} />
            <h1 className="font-hand text-4xl text-ink leading-tight mb-1">A few quick things,</h1>
            <p className="font-body text-inkSoft mb-6">
              This is how Ally works out a daily goal that's actually right for you.
            </p>

            <form onSubmit={handleProfileSubmit} className="flex-1 flex flex-col gap-5">
              <div>
                <span className="font-body text-sm font-bold text-inkSoft mb-1.5 block">Gender</span>
                <div className="flex gap-2">
                  {GENDERS.map((g) => (
                    <PressButton
                      key={g.id}
                      onClick={() => setGender(g.id)}
                      className={`flex-1 py-3 rounded-2xl font-body font-bold text-sm border-2 ${
                        gender === g.id ? CHIP_ACTIVE : CHIP_INACTIVE
                      }`}
                    >
                      {g.label}
                    </PressButton>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="font-body text-sm font-bold text-inkSoft mb-1.5 block">Age</span>
                <input
                  required
                  type="number"
                  inputMode="numeric"
                  enterKeyHint="next"
                  min={13}
                  max={110}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 29"
                  className={INPUT_CLASS}
                />
              </label>

              <div className="flex gap-3">
                <label className="block flex-1">
                  <span className="font-body text-sm font-bold text-inkSoft mb-1.5 block">Height</span>
                  <div className="flex gap-2">
                    <select
                      value={feet}
                      onChange={(e) => setFeet(Number(e.target.value))}
                      className={`${INPUT_CLASS} appearance-none`}
                    >
                      {FEET_OPTIONS.map((f) => (
                        <option key={f} value={f}>
                          {f} ft
                        </option>
                      ))}
                    </select>
                    <select
                      value={inches}
                      onChange={(e) => setInches(Number(e.target.value))}
                      className={`${INPUT_CLASS} appearance-none`}
                    >
                      {INCH_OPTIONS.map((i) => (
                        <option key={i} value={i}>
                          {i} in
                        </option>
                      ))}
                    </select>
                  </div>
                </label>

                <label className="block flex-1">
                  <span className="font-body text-sm font-bold text-inkSoft mb-1.5 block">Weight (lb)</span>
                  <input
                    required
                    type="number"
                    inputMode="decimal"
                    enterKeyHint="done"
                    min={40}
                    max={600}
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="e.g. 150"
                    className={INPUT_CLASS}
                  />
                </label>
              </div>

              <div>
                <span className="font-body text-sm font-bold text-inkSoft mb-1.5 block">Activity level</span>
                <div className="flex flex-col gap-2">
                  {ACTIVITY_LEVELS.map((a) => (
                    <PressButton
                      key={a.id}
                      onClick={() => setActivityLevel(a.id)}
                      className={`w-full text-left px-4 py-3 rounded-2xl border-2 flex items-center justify-between ${
                        activityLevel === a.id ? CHIP_ACTIVE : CHIP_INACTIVE
                      }`}
                    >
                      <span className="font-body font-bold text-sm">{a.label}</span>
                      <span
                        className={`font-body text-xs ${
                          activityLevel === a.id ? 'text-white/80' : 'text-inkSoft/70'
                        }`}
                      >
                        {a.hint}
                      </span>
                    </PressButton>
                  ))}
                </div>
              </div>

              <PressButton
                type="submit"
                disabled={!profileValid}
                className="w-full bg-coral disabled:bg-ink/15 disabled:text-ink/30 text-white font-body font-bold text-lg py-4 rounded-full shadow-card flex items-center justify-center gap-2 transition-colors mt-1"
              >
                Calculate my goal
                <ArrowRight className="w-5 h-5" />
              </PressButton>
            </form>
          </motion.div>
        )}

        {step === 'goal' && (
          <motion.div
            key="goal"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="flex-1 flex flex-col px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] relative z-10"
          >
            <BackButton onClick={goBack} />

            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                className="w-32 h-32 rounded-blob bg-gradient-to-br from-aqua to-coral-light flex items-center justify-center shadow-soft mb-6"
              >
                <Target className="w-14 h-14 text-white" strokeWidth={1.75} />
              </motion.div>

              <p className="font-body text-inkSoft text-sm font-bold uppercase tracking-wide mb-1">
                Your daily goal
              </p>
              <h1 className="font-body text-6xl font-black text-ink leading-none mb-1">
                {computedGoal}
                <span className="text-2xl font-bold text-inkSoft ml-1">oz</span>
              </h1>
              <Squiggle className="w-24 h-3 text-coral my-4" />
              <p className="font-body text-inkSoft text-base leading-relaxed max-w-xs">
                Based on your weight, height, activity level, and age — a friendly estimate, not
                medical advice. You can adjust it any time.
              </p>
            </div>

            <PressButton
              onClick={() => setStep('account')}
              className="mt-8 w-full bg-ink text-mist font-body font-bold text-lg py-4 rounded-full shadow-card flex items-center justify-center gap-2"
            >
              Sounds good
              <ArrowRight className="w-5 h-5" />
            </PressButton>
          </motion.div>
        )}

        {step === 'account' && (
          <motion.div
            key="account"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="flex-1 flex flex-col px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] relative z-10 overflow-y-auto"
          >
            <BackButton onClick={goBack} />
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
                  inputMode="email"
                  enterKeyHint="next"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={INPUT_CLASS}
                />
              </label>

              <label className="block">
                <span className="font-body text-sm font-bold text-inkSoft mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-4 h-4" /> Password
                </span>
                <input
                  required
                  type="password"
                  enterKeyHint="done"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Make it a good one"
                  minLength={4}
                  className={INPUT_CLASS}
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
