import { useState, useCallback, useMemo, useId, useEffect, memo, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3,
  UserCircle2,
  Plus,
  Minus,
  PartyPopper,
  Trophy,
  Flame,
  ChevronLeft,
  ChevronRight,
  GlassWater,
  Coffee,
  Leaf,
  Milk,
  CupSoda,
  X,
} from 'lucide-react'
import Onboarding from './Onboarding.jsx'

// Account and Insights are only needed once the user opens them, so they're
// code-split out of the main bundle (perf: smaller initial JS payload).
const Account = lazy(() => import('./Account.jsx'))
const Insights = lazy(() => import('./Insights.jsx'))

const DEFAULT_STEP = 8 // oz — default amount the +/- buttons adjust by
const PRESETS = [8, 16, 24]
const HISTORY_STORAGE_KEY = 'ally-history'
const STEP_STORAGE_KEY = 'ally-step'
const MAX_DAILY_OZ = 500 // sane ceiling so numbers can't grow forever
const GOAL_BANNER_MS = 5000 // how long the "Goal reached!" pill stays up

// Other drinks the FAB can log. Each tints the cup a little toward its color.
const DRINK_TYPES = [
  { id: 'coffee', label: 'Coffee', icon: Coffee, color: '#6F4E37' },
  { id: 'tea', label: 'Tea', icon: Leaf, color: '#C17817' },
  { id: 'juice', label: 'Juice', icon: CupSoda, color: '#FF8C42' },
  { id: 'milk', label: 'Milk', icon: Milk, color: '#EADFC8' },
]

/* ---------------------------- color helpers ---------------------------- */
function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'))
      .join('')
  )
}
function mixColors(hexA, hexB, t) {
  const [ar, ag, ab] = hexToRgb(hexA)
  const [br, bg, bb] = hexToRgb(hexB)
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t)
}

// Hand-drawn wobbly glass cup outline, used both as the visible stroke
// and as the clip path that the water fill is masked into.
const CUP_PATH =
  'M36 14 C34 10 166 10 164 14 L182 234 C183 244 172 252 160 252 L40 252 C28 252 17 244 18 234 Z'

/* ---------------------------- date helpers ---------------------------- */
// Local-time date keys (not UTC) so streaks/history line up with the user's day.
function toKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date, delta) {
  const d = new Date(date)
  d.setDate(d.getDate() + delta)
  return d
}

function formatDateLabel(date) {
  const key = toKey(date)
  const todayKey = toKey(new Date())
  if (key === todayKey) return 'Today'
  if (key === toKey(addDays(new Date(), -1))) return 'Yesterday'
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

// Consecutive days (ending today or yesterday) where intake hit the goal.
function computeStreak(history, goal) {
  const today = new Date()
  const todayKey = toKey(today)
  let cursor = (history[todayKey] || 0) >= goal ? today : addDays(today, -1)
  let streak = 0
  for (let i = 0; i < 3650; i++) {
    const key = toKey(cursor)
    if ((history[key] || 0) >= goal) {
      streak += 1
      cursor = addDays(cursor, -1)
    } else {
      break
    }
  }
  return streak
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function loadStep() {
  try {
    const raw = localStorage.getItem(STEP_STORAGE_KEY)
    const n = raw ? Number(raw) : DEFAULT_STEP
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_STEP
  } catch {
    return DEFAULT_STEP
  }
}

/* ------------------------------ subcomponents ------------------------------ */

const Droplet = memo(function Droplet({ left, top, amount }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 0.6 }}
      animate={{ opacity: [0, 1, 1, 0], y: -46, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.1, ease: 'easeOut' }}
      className="absolute font-hand text-xl font-bold text-aqua-deep pointer-events-none select-none"
      style={{ left: `${left}%`, top: `${top}%` }}
    >
      +{amount} oz
    </motion.div>
  )
})

const WaterCup = memo(function WaterCup({ current, goal, tint }) {
  const clipId = useId()
  const gradId = useId()
  const ratio = goal > 0 ? current / goal : 0
  const pct = Math.max(0, Math.min(1, ratio)) // visual fill can't exceed a full glass
  const fillHeight = 236 * pct
  const fillY = 252 - fillHeight
  const goalReached = ratio >= 1
  const superHydrated = ratio >= 1.4

  const topStop = superHydrated ? '#FFE29A' : '#8FE3EE'
  let bottomStop = superHydrated ? '#E8A83B' : '#1C7293'
  // Whatever's being logged (coffee, tea, etc.) tints the water a little.
  if (tint && tint.color && !superHydrated) {
    bottomStop = mixColors(bottomStop, tint.color, tint.weight)
  }

  // The "Goal reached!" pill shows itself for a few seconds, then goes away
  // on its own even if you're still at/above goal.
  const [bannerVisible, setBannerVisible] = useState(false)
  useEffect(() => {
    if (!goalReached) {
      setBannerVisible(false)
      return
    }
    setBannerVisible(true)
    const t = setTimeout(() => setBannerVisible(false), GOAL_BANNER_MS)
    return () => clearTimeout(t)
  }, [goalReached, superHydrated])

  return (
    <div className="relative w-56 h-64 mx-auto select-none">
      <AnimatePresence>
        {bannerVisible && (
          <motion.div
            key={superHydrated ? 'hero' : 'reached'}
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`absolute -top-3 left-1/2 -translate-x-1/2 font-hand text-lg px-4 py-1 rounded-full shadow-soft flex items-center gap-1.5 z-10 whitespace-nowrap ${
              superHydrated ? 'bg-sunshine text-ink' : 'bg-coral text-white'
            }`}
          >
            {superHydrated ? <Trophy className="w-4 h-4" /> : <PartyPopper className="w-4 h-4" />}
            {superHydrated ? 'Hydration hero!' : 'Goal reached!'}
          </motion.div>
        )}
      </AnimatePresence>

      {superHydrated && (
        <motion.div
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full bg-sunshine/30 blur-2xl pointer-events-none"
        />
      )}

      <svg viewBox="0 0 200 264" className="w-full h-full drop-shadow-[0_10px_20px_rgba(28,114,147,0.18)] relative">
        <defs>
          <clipPath id={clipId}>
            <path d={CUP_PATH} />
          </clipPath>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={topStop} />
            <stop offset="100%" stopColor={bottomStop} />
          </linearGradient>
        </defs>

        <path d={CUP_PATH} fill="#FFFFFF" opacity="0.5" />

        <g clipPath={`url(#${clipId})`}>
          <motion.rect
            x="0"
            width="200"
            fill={`url(#${gradId})`}
            initial={false}
            animate={{ y: fillY, height: fillHeight + 20 }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          />
          <motion.g
            initial={false}
            animate={{ y: fillY }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          >
            <path
              d="M-40 0 C -10 -8, 20 8, 50 0 C 80 -8, 110 8, 140 0 C 170 -8, 200 8, 230 0 C 260 -8, 280 4, 300 0 L 300 10 L -40 10 Z"
              fill="#B7ECF3"
              opacity="0.55"
              className="wave-scroll"
            />
          </motion.g>

          <ellipse cx="55" cy="60" rx="10" ry="70" fill="#FFFFFF" opacity="0.18" />
        </g>

        <path
          d={CUP_PATH}
          fill="none"
          stroke="#223238"
          strokeWidth="5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
})

const PresetButton = memo(function PresetButton({ amount, maxAmount, onTap }) {
  // Icon grows a step for each bigger preset, so size is visible at a glance.
  const iconClass = amount <= maxAmount / 3 ? 'w-4 h-4' : amount <= (2 * maxAmount) / 3 ? 'w-5 h-5' : 'w-6 h-6'
  return (
    <motion.button
      onClick={() => onTap(amount)}
      whileTap={{ scale: 0.9, rotate: -2 }}
      whileHover={{ scale: 1.04 }}
      transition={{ type: 'spring', stiffness: 400, damping: 14 }}
      className="flex-1 bg-white rounded-full py-3.5 shadow-card border-2 border-transparent active:border-aqua flex flex-col items-center justify-center"
    >
      <GlassWater className={`${iconClass} text-aqua-deep mb-0.5`} />
      <span className="font-hand text-2xl text-ink leading-none">+{amount}</span>
      <span className="font-body text-[10px] font-bold text-inkSoft uppercase tracking-wide mt-0.5">
        oz
      </span>
    </motion.button>
  )
})

const AccountButton = memo(function AccountButton({ onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      className="flex flex-row-reverse items-center gap-2 bg-white/80 backdrop-blur px-3.5 py-2 rounded-full shadow-card"
    >
      <UserCircle2 className="w-4.5 h-4.5 text-aqua-deep" />
      <span className="font-body text-xs font-bold text-ink hidden xs:inline">Account</span>
    </motion.button>
  )
})

// Insights button — expands with a fire icon + streak count once the user has one.
const InsightsButton = memo(function InsightsButton({ onClick, streak }) {
  return (
    <motion.button
      layout
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
      className="flex items-center gap-2 bg-white/80 backdrop-blur px-3.5 py-2 rounded-full shadow-card overflow-hidden"
    >
      <BarChart3 className="w-4.5 h-4.5 text-aqua-deep shrink-0" />
      <span className="font-body text-xs font-bold text-ink hidden xs:inline">Insights</span>
      <AnimatePresence initial={false}>
        {streak > 0 && (
          <motion.span
            key="streak"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex items-center gap-1 pl-2 ml-0.5 border-l border-ink/10 whitespace-nowrap"
          >
            <Flame className="w-4 h-4 text-coral" fill="currentColor" />
            <span className="font-body text-xs font-black text-coral-deep">{streak}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
})

const DateSwitcher = memo(function DateSwitcher({ selectedDate, isToday, amount, goal, onPrev, onNext }) {
  const label = useMemo(() => formatDateLabel(selectedDate), [selectedDate])
  return (
    <div className="flex items-center justify-center gap-1.5 mt-5 relative z-10">
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={onPrev}
        className="w-7 h-7 rounded-full bg-white shadow-card flex items-center justify-center shrink-0"
        aria-label="Previous day"
      >
        <ChevronLeft className="w-3.5 h-3.5 text-ink" />
      </motion.button>

      <AnimatePresence mode="wait">
        <motion.div
          key={label}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.18 }}
          className="bg-white shadow-card rounded-full px-4 py-1.5 min-w-[132px] text-center"
        >
          <p className="font-hand text-lg text-ink leading-none">{label}</p>
          <p className="font-body text-[10px] text-inkSoft font-bold mt-0.5">
            {Math.round(amount)} / {goal} oz
          </p>
        </motion.div>
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={onNext}
        disabled={isToday}
        className="w-7 h-7 rounded-full bg-white shadow-card flex items-center justify-center shrink-0 disabled:opacity-30"
        aria-label="Next day"
      >
        <ChevronRight className="w-3.5 h-3.5 text-ink" />
      </motion.button>
    </div>
  )
})

// Subtle floating bubbles drifting up the background. Purely decorative —
// positions/timings are randomized once and driven by a CSS animation so
// they don't cause re-renders.
const Bubbles = memo(function Bubbles() {
  const bubbles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 6 + Math.random() * 16,
        duration: 10 + Math.random() * 10,
        delay: Math.random() * -18, // negative delay = already mid-flight on load
        drift: (Math.random() - 0.5) * 60,
      })),
    []
  )
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {bubbles.map((b) => (
        <span
          key={b.id}
          className="absolute rounded-full bg-white/40 bubble-rise"
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: b.size,
            bottom: -24,
            animationDuration: `${b.duration}s`,
            animationDelay: `${b.delay}s`,
            '--drift': `${b.drift}px`,
          }}
        />
      ))}
    </div>
  )
})

// Floating "+" button that pops out chips for other drink types. Picking one
// logs it like water and nudges the cup's color a little toward that drink.
const DrinkFAB = memo(function DrinkFAB({ step, onAdd }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="fixed right-5 bottom-40 z-30 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open &&
          DRINK_TYPES.map((drink, i) => {
            const Icon = drink.icon
            return (
              <motion.button
                key={drink.id}
                initial={{ opacity: 0, y: 12, scale: 0.5 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.5 }}
                transition={{ delay: i * 0.03, type: 'spring', stiffness: 400, damping: 20 }}
                whileTap={{ scale: 0.88 }}
                onClick={() => {
                  onAdd(step, drink.color)
                  setOpen(false)
                }}
                className="hand-wobble w-11 h-11 rounded-full shadow-card flex items-center justify-center text-white"
                style={{ backgroundColor: drink.color }}
                aria-label={`Add ${drink.label}`}
              >
                <Icon className="w-5 h-5" />
              </motion.button>
            )
          })}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileTap={{ scale: 0.9 }}
        animate={{ rotate: open ? 45 : 0 }}
        className="w-12 h-12 rounded-full bg-white shadow-card flex items-center justify-center"
        aria-label={open ? 'Close drink options' : 'Add another drink'}
      >
        <Plus className="w-5 h-5 text-aqua-deep" strokeWidth={3} />
      </motion.button>
    </div>
  )
})

// Popup for adjusting the +/- step size, opened by tapping the "N oz step" label.
const StepModal = memo(function StepModal({ step, onChange, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-soft p-6 w-full max-w-xs mb-6 sm:mb-0 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-mist flex items-center justify-center"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-inkSoft" />
        </button>
        <p className="font-hand text-2xl text-ink text-center">Step size</p>
        <p className="font-body text-4xl font-black text-aqua-deep text-center mt-2">{step} oz</p>
        <input
          type="range"
          min={1}
          max={32}
          step={1}
          value={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full mt-5 accent-coral"
        />
        <div className="flex justify-between font-body text-[11px] text-inkSoft font-bold mt-1">
          <span>1 oz</span>
          <span>32 oz</span>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="w-full mt-5 bg-coral text-white font-body font-bold py-3 rounded-full"
        >
          Done
        </motion.button>
      </motion.div>
    </motion.div>
  )
})

/* ---------------------------------- App ---------------------------------- */

export default function App() {
  const [stage, setStage] = useState('onboarding') // 'onboarding' | 'dashboard'
  const [user, setUser] = useState(null)
  const [overlay, setOverlay] = useState(null) // null | 'insights' | 'account'

  const [goal] = useState(64)
  const [history, setHistory] = useState(loadHistory) // { 'YYYY-MM-DD': ozConsumed }
  const [dayOffset, setDayOffset] = useState(0) // 0 = today, 1 = yesterday, ...
  const [toasts, setToasts] = useState([])
  const [step, setStep] = useState(loadStep) // +/- button increment, user-adjustable
  const [stepModalOpen, setStepModalOpen] = useState(false)
  // Running total of non-water drinks logged today, by color, so the cup can
  // tint toward whatever's actually been added. In-memory only (resets on
  // reload), which is fine since it's a light visual touch, not core data.
  const [drinkMix, setDrinkMix] = useState({})

  // Persist intake history so streaks and past days survive a reload.
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
    } catch {
      // storage unavailable (e.g. private browsing) — fail silently
    }
  }, [history])

  // Persist the chosen step size so it survives a reload.
  useEffect(() => {
    try {
      localStorage.setItem(STEP_STORAGE_KEY, String(step))
    } catch {
      // storage unavailable — fail silently
    }
  }, [step])

  const todayKey = useMemo(() => toKey(new Date()), [])
  const selectedDate = useMemo(() => addDays(new Date(), -dayOffset), [dayOffset])
  const selectedKey = useMemo(() => toKey(selectedDate), [selectedDate])
  const isToday = dayOffset === 0

  const current = history[selectedKey] || 0
  const streak = useMemo(() => computeStreak(history, goal), [history, goal])
  const percentLabel = useMemo(() => Math.round((current / goal) * 100), [current, goal])

  // Blend today's logged drink colors into a single tint, weighted by how
  // much of today's total they make up (capped so it stays subtle).
  const tint = useMemo(() => {
    const entries = Object.entries(drinkMix)
    if (!entries.length) return null
    let totalOther = 0
    let r = 0,
      g = 0,
      b = 0
    entries.forEach(([hex, oz]) => {
      const [rr, gg, bb] = hexToRgb(hex)
      totalOther += oz
      r += rr * oz
      g += gg * oz
      b += bb * oz
    })
    const avgHex = rgbToHex(r / totalOther, g / totalOther, b / totalOther)
    const weight = Math.min(0.55, totalOther / Math.max(current, totalOther, 1))
    return { color: avgHex, weight }
  }, [drinkMix, current])

  const spawnToast = useCallback((amount) => {
    const id = Math.random().toString(36).slice(2)
    const left = 40 + Math.random() * 20
    setToasts((t) => [...t, { id, amount, left }])
    setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id))
    }, 1100)
  }, [])

  // Water (or any drink) is always logged against today — if you're browsing
  // a past day, adding water jumps you back to today so you can see it land.
  const addWater = useCallback(
    (amount, color = null) => {
      setHistory((h) => {
        const prevToday = h[todayKey] || 0
        const nextVal = Math.max(0, Math.min(MAX_DAILY_OZ, prevToday + amount))
        return { ...h, [todayKey]: nextVal }
      })
      if (amount > 0) {
        spawnToast(amount)
        if (color) {
          setDrinkMix((m) => ({ ...m, [color]: (m[color] || 0) + amount }))
        }
      }
      setDayOffset(0)
    },
    [todayKey, spawnToast]
  )

  const goPrevDay = useCallback(() => setDayOffset((d) => Math.min(d + 1, 365)), [])
  const goNextDay = useCallback(() => setDayOffset((d) => Math.max(d - 1, 0)), [])

  const openInsights = useCallback(() => setOverlay('insights'), [])
  const openAccount = useCallback(() => setOverlay('account'), [])
  const closeOverlay = useCallback(() => setOverlay(null), [])

  const handleOnboardingComplete = useCallback((userData) => {
    setUser(userData)
    setStage('dashboard')
  }, [])

  if (stage === 'onboarding') {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

  return (
    <div className="min-h-full w-full bg-mist flex flex-col relative overflow-hidden">
      <div className="absolute -top-24 -left-16 w-64 h-64 rounded-full bg-aqua-light/25 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-28 -right-16 w-72 h-72 rounded-full bg-coral-light/20 blur-3xl pointer-events-none" />
      <Bubbles />

      {/* top bar */}
      <div className="flex items-center justify-between px-5 pt-6 relative z-10">
        <InsightsButton onClick={openInsights} streak={streak} />
        <AccountButton onClick={openAccount} />
      </div>

      {/* date switcher replaces the old greeting text */}
      <DateSwitcher
        selectedDate={selectedDate}
        isToday={isToday}
        amount={current}
        goal={goal}
        onPrev={goPrevDay}
        onNext={goNextDay}
      />

      {/* cup stage */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6">
        <div className="relative">
          <WaterCup current={current} goal={goal} tint={isToday ? tint : null} />

          <AnimatePresence>
            {toasts.map((t) => (
              <Droplet key={t.id} left={t.left} top={30} amount={t.amount} />
            ))}
          </AnimatePresence>
        </div>

        <div className="flex items-baseline gap-1 mt-5">
          <span className="font-body font-black text-4xl text-ink">{Math.round(current)}</span>
          <span className="font-body text-inkSoft font-bold">/ {goal} oz</span>
          <span className="font-body text-aqua-deep font-bold text-sm ml-2">{percentLabel}%</span>
        </div>

        {!isToday && (
          <p className="font-body text-xs text-inkSoft mt-1.5">
            Logging water will jump you back to today
          </p>
        )}

        {/* +/- controls */}
        <div className="flex items-center gap-6 mt-6">
          <motion.button
            onClick={() => addWater(-step)}
            whileTap={{ scale: 0.85 }}
            className="w-14 h-14 rounded-full bg-white shadow-card flex items-center justify-center active:bg-mistDeep"
          >
            <Minus className="w-6 h-6 text-ink" strokeWidth={3} />
          </motion.button>

          <motion.button
            onClick={() => setStepModalOpen(true)}
            whileTap={{ scale: 0.92 }}
            className="font-body text-xs font-bold text-inkSoft w-16 text-center underline decoration-dotted decoration-inkSoft/50 underline-offset-2"
          >
            {step} oz step
          </motion.button>

          <motion.button
            onClick={() => addWater(step)}
            whileTap={{ scale: 0.85 }}
            className="w-14 h-14 rounded-full bg-coral shadow-card flex items-center justify-center active:bg-coral-deep"
          >
            <Plus className="w-6 h-6 text-white" strokeWidth={3} />
          </motion.button>
        </div>
      </div>

      {/* preset quick-add row */}
      <div className="px-6 pb-8 pt-2 relative z-10">
        <p className="font-body text-[11px] font-bold uppercase tracking-wider text-inkSoft/70 text-center mb-2.5">
          Quick add
        </p>
        <div className="flex gap-3">
          {PRESETS.map((amount) => (
            <PresetButton
              key={amount}
              amount={amount}
              maxAmount={PRESETS[PRESETS.length - 1]}
              onTap={addWater}
            />
          ))}
        </div>
      </div>

      {/* floating button for logging other drinks (coffee, tea, juice, milk...) */}
      <DrinkFAB step={step} onAdd={addWater} />

      {/* overlays — lazy loaded, only pulled in when opened */}
      <AnimatePresence>
        {overlay === 'insights' && (
          <Suspense fallback={null} key="insights">
            <Insights onClose={closeOverlay} />
          </Suspense>
        )}
        {overlay === 'account' && (
          <Suspense fallback={null} key="account">
            <Account user={user} onClose={closeOverlay} />
          </Suspense>
        )}
      </AnimatePresence>

      {/* step-size adjuster popup */}
      <AnimatePresence>
        {stepModalOpen && (
          <StepModal key="step-modal" step={step} onChange={setStep} onClose={() => setStepModalOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
