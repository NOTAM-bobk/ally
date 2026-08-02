import { useState, useCallback, useMemo, useId, useEffect, memo, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3,
  UserCircle2,
  Plus,
  Minus,
  PartyPopper,
  Trophy,
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
const ONBOARDED_STORAGE_KEY = 'ally-onboarded'
const USER_STORAGE_KEY = 'ally-user'
const GOAL_STORAGE_KEY = 'ally-goal'
const DEFAULT_GOAL = 64
const MAX_DAILY_OZ = 500 // sane ceiling so numbers can't grow forever
const GOAL_BANNER_MS = 5000 // how long the "Goal reached!" pill stays up

// Other drinks logged from the "Other drinks" toggle. Each tints the cup a little toward its color.
const DRINK_TYPES = [
  { id: 'coffee', label: 'Coffee', icon: Coffee, color: '#6F4E37' },
  { id: 'tea', label: 'Tea', icon: Leaf, color: '#C17817' },
  { id: 'juice', label: 'Juice', icon: CupSoda, color: '#FF8C42' },
  { id: 'milk', label: 'Milk', icon: Milk, color: '#EADFC8' },
]
const DRINK_BY_COLOR = Object.fromEntries(DRINK_TYPES.map((d) => [d.color, d]))

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

// If Onboarding has already run and saved its flag, skip straight to the
// dashboard on future loads instead of showing the intro slides again.
function loadStage() {
  try {
    return localStorage.getItem(ONBOARDED_STORAGE_KEY) ? 'dashboard' : 'onboarding'
  } catch {
    return 'onboarding'
  }
}

function loadUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// The personalized goal Onboarding calculated (gender/age/height/weight/activity),
// falling back to the old flat default if it isn't there yet.
function loadGoal() {
  try {
    const raw = localStorage.getItem(GOAL_STORAGE_KEY)
    const n = raw ? Number(raw) : DEFAULT_GOAL
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_GOAL
  } catch {
    return DEFAULT_GOAL
  }
}

/* ------------------------------ subcomponents ------------------------------ */

const Droplet = memo(function Droplet({ amount }) {
  const isAdd = amount > 0
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.7, y: -16 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-hand text-2xl font-bold px-5 py-2 rounded-full shadow-soft pointer-events-none select-none whitespace-nowrap z-30 ${
        isAdd ? 'bg-aqua-deep text-white' : 'bg-white text-ink'
      }`}
    >
      {isAdd ? '+' : ''}{amount} oz
    </motion.div>
  )
})

const WaterCup = memo(function WaterCup({ current, goal, tint, drinkMix }) {
  const clipId = useId()
  const gradId = useId()
  const fillClipId = useId()
  const ratio = goal > 0 ? current / goal : 0
  const pct = Math.max(0, Math.min(1, ratio)) // visual fill can't exceed a full glass
  const fillHeight = 236 * pct
  const fillY = 252 - fillHeight
  const goalReached = ratio >= 1
  const superHydrated = ratio >= 1.4

  const topStop = superHydrated ? '#FFE29A' : '#8FE3EE'
  let bottomStop = superHydrated ? '#E8A83B' : '#1C7293'
  // A light overall shift toward whatever's been logged, on top of the
  // distinct floating color bubbles below.
  if (tint && tint.color && !superHydrated) {
    bottomStop = mixColors(bottomStop, tint.color, Math.min(0.32, tint.weight))
  }

  // One softly-floating colored bubble per drink type logged today. Size
  // reflects how much of that drink was logged; position/drift is derived
  // deterministically from the color so it doesn't jump around on re-render.
  const blobs = useMemo(() => {
    const entries = Object.entries(drinkMix || {})
    return entries.map(([color, oz], i) => {
      const seed = color.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + i * 31
      const rand = (n) => Math.abs(Math.sin(seed * (n + 1.7))) // stable pseudo-random 0-1
      const r = 14 + Math.min(30, (oz / goal) * 70)
      return {
        color,
        r,
        cx: 45 + rand(1) * 100,
        cy: 90 + rand(2) * 120,
        dx: 8 + rand(3) * 16,
        dy: 8 + rand(4) * 16,
        duration: 7 + rand(5) * 7,
      }
    })
  }, [drinkMix, goal])

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
    <div className="relative w-48 h-56 sm:w-56 sm:h-64 mx-auto select-none">
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
          <clipPath id={fillClipId}>
            <motion.rect
              x="0"
              width="200"
              initial={false}
              animate={{ y: fillY, height: fillHeight + 20 }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            />
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

          {/* colored bubbles for whatever's actually been logged, confined to the current water level */}
          <g clipPath={`url(#${fillClipId})`}>
            {blobs.map((b) => (
              <motion.circle
                key={b.color}
                r={b.r}
                fill={b.color}
                opacity={0.5}
                style={{ mixBlendMode: 'multiply' }}
                initial={false}
                animate={{
                  cx: [b.cx, b.cx + b.dx, b.cx - b.dx * 0.6, b.cx],
                  cy: [b.cy, b.cy - b.dy, b.cy + b.dy * 0.7, b.cy],
                }}
                transition={{ duration: b.duration, repeat: Infinity, ease: 'easeInOut' }}
              />
            ))}
          </g>

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

      <div className="absolute bottom-[13%] left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <span className="font-body font-black text-lg text-white drop-shadow-[0_1px_3px_rgba(28,50,56,0.45)]">
          {Math.round(ratio * 100)}%
        </span>
      </div>
    </div>
  )
})

const PresetButton = memo(function PresetButton({ amount, maxAmount, onTap }) {
  // Icon grows a step for each bigger preset, so size is visible at a glance.
  const iconClass = amount <= maxAmount / 3 ? 'w-3.5 h-3.5' : amount <= (2 * maxAmount) / 3 ? 'w-4 h-4' : 'w-4.5 h-4.5'
  return (
    <motion.button
      onClick={() => onTap(amount)}
      whileTap={{ scale: 0.9, rotate: -2 }}
      whileHover={{ scale: 1.04 }}
      transition={{ type: 'spring', stiffness: 400, damping: 14 }}
      className="flex-1 bg-mist rounded-2xl py-2.5 shadow-card border-2 border-transparent active:border-aqua flex flex-col items-center justify-center"
    >
      <GlassWater className={`${iconClass} text-aqua-deep mb-0.5`} />
      <span className="font-hand text-xl text-ink leading-none">+{amount}</span>
      <span className="font-body text-[9px] font-bold text-inkSoft uppercase tracking-wide mt-0.5">
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
      className="w-11 h-11 shrink-0 rounded-full bg-white/80 backdrop-blur shadow-card flex items-center justify-center"
      aria-label="Account"
    >
      <UserCircle2 className="w-5 h-5 text-aqua-deep" />
    </motion.button>
  )
})

// Insights button — a circular progress ring showing today's hydration %
// wraps the button. Before any streak it shows a chart icon in the middle;
// once a streak exists, the icon is replaced by the streak number itself.
const InsightsButton = memo(function InsightsButton({ onClick, streak, current, goal }) {
  const size = 44
  const stroke = 3.5
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const pct = goal > 0 ? Math.max(0, Math.min(1, current / goal)) : 0

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-label="Insights"
    >
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#1C93D1"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={{ type: 'spring', stiffness: 90, damping: 20 }}
        />
      </svg>

      <div className="absolute inset-[3.5px] rounded-full bg-white/80 backdrop-blur shadow-card flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {streak > 0 ? (
            <motion.span
              key="streak"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="font-body text-sm font-black text-coral-deep leading-none"
            >
              {streak}
            </motion.span>
          ) : (
            <motion.span
              key="icon"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="flex"
            >
              <BarChart3 className="w-4.5 h-4.5 text-aqua-deep" />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  )
})

// Swipeable date pill — lives in the top bar between Insights and Account,
// same height/style as those. Swipe left goes forward a day (back to today),
// swipe right goes back a day. No visible arrow buttons anymore.
const DatePill = memo(function DatePill({ selectedDate, isToday, onNext, onPrev }) {
  const label = useMemo(() => formatDateLabel(selectedDate), [selectedDate])

  const handleDragEnd = useCallback(
    (_e, info) => {
      const threshold = 46
      if (info.offset.x <= -threshold) {
        if (!isToday) onNext()
      } else if (info.offset.x >= threshold) {
        onPrev()
      }
    },
    [isToday, onNext, onPrev]
  )

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.5}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 0.97 }}
      className="flex-1 min-w-0 h-11 bg-white/80 backdrop-blur rounded-full shadow-card flex items-center justify-center touch-pan-y cursor-grab active:cursor-grabbing overflow-hidden"
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={label}
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -14 }}
          transition={{ duration: 0.18 }}
          className="font-hand text-lg text-ink leading-none whitespace-nowrap"
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  )
})

// Subtle floating bubbles drifting up the background. Purely decorative —
// positions/timings are randomized once and driven by a CSS animation so
// they don't cause re-renders.
const Bubbles = memo(function Bubbles() {
  const bubbles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 8 + Math.random() * 20,
        duration: 9 + Math.random() * 9,
        delay: Math.random() * -18, // negative delay = already mid-flight on load
        drift: (Math.random() - 0.5) * 70,
        hue: Math.random() > 0.5 ? 'bg-white/50' : 'bg-aqua-light/40',
      })),
    []
  )
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {bubbles.map((b) => (
        <span
          key={b.id}
          className={`absolute rounded-full bubble-rise ${b.hue}`}
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

// Toggle lives in the bottom sheet, but no longer holds its own drink row —
// the drink options now float around the cup itself (see FloatingDrinks
// below). This component is now fully controlled from App.
const OtherDrinksToggle = memo(function OtherDrinksToggle({ open, onToggle }) {
  return (
    <div className="mt-3 flex justify-center">
      <motion.button
        onClick={onToggle}
        whileTap={{ scale: 0.94 }}
        className="flex items-center gap-1.5 bg-mist px-3.5 py-1.5 rounded-full shadow-card"
        aria-label={open ? 'Close other drinks' : 'Add another drink'}
      >
        <motion.span animate={{ rotate: open ? 45 : 0 }} className="flex">
          <Plus className="w-3.5 h-3.5 text-aqua-deep" strokeWidth={3} />
        </motion.span>
        <span className="font-body text-[11px] font-bold text-inkSoft uppercase tracking-wide">
          {open ? 'Close' : 'Other drinks'}
        </span>
      </motion.button>
    </div>
  )
})

// Drink-type circles that appear around the cup and gently float/orbit in
// place while open. Each circle shows just the drink's icon, centered.
// Positioned relative to the cup's own wrapper div, so "around the cup"
// tracks the cup regardless of screen size.
const ORBIT_SPOTS = [
  { top: '0%', left: '-10%' },
  { top: '0%', right: '-10%' },
  { bottom: '16%', left: '-15%' },
  { bottom: '16%', right: '-15%' },
]

const FloatingDrinks = memo(function FloatingDrinks({ open, step, onAdd }) {
  return (
    <AnimatePresence>
      {open &&
        DRINK_TYPES.map((drink, i) => {
          const Icon = drink.icon
          const spot = ORBIT_SPOTS[i % ORBIT_SPOTS.length]
          const floatX = 6 + (i % 2) * 5
          const floatY = 7 + (i % 3) * 4
          const duration = 5.5 + i * 0.9
          return (
            <motion.button
              key={drink.id}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{
                opacity: 1,
                scale: 1,
                x: [0, floatX, -floatX * 0.6, 0],
                y: [0, -floatY, floatY * 0.7, 0],
              }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{
                opacity: { duration: 0.25 },
                scale: { type: 'spring', stiffness: 300, damping: 20 },
                x: { duration, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 },
                y: { duration: duration * 1.15, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 },
              }}
              whileTap={{ scale: 0.85 }}
              onClick={() => onAdd(step, drink.color)}
              className="hand-wobble absolute w-14 h-14 rounded-full shadow-card flex items-center justify-center text-white z-20"
              style={{ backgroundColor: drink.color, ...spot }}
              aria-label={`Add ${drink.label}`}
            >
              <Icon className="w-6 h-6" />
            </motion.button>
          )
        })}
    </AnimatePresence>
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
  const [stage, setStage] = useState(loadStage) // 'onboarding' | 'dashboard'
  const [user, setUser] = useState(loadUser)
  const [overlay, setOverlay] = useState(null) // null | 'insights' | 'account'

  const [goal, setGoal] = useState(loadGoal)
  const [history, setHistory] = useState(loadHistory) // { 'YYYY-MM-DD': ozConsumed }
  const [dayOffset, setDayOffset] = useState(0) // 0 = today, 1 = yesterday, ...
  const [toasts, setToasts] = useState([])
  const [step, setStep] = useState(loadStep) // +/- button increment, user-adjustable
  const [stepModalOpen, setStepModalOpen] = useState(false)
  // Running total of non-water drinks logged today, by color, so the cup can
  // tint toward whatever's actually been added. In-memory only (resets on
  // reload), which is fine since it's a light visual touch, not core data.
  const [drinkMix, setDrinkMix] = useState({})
  const [otherDrinksOpen, setOtherDrinksOpen] = useState(false)

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
    setToasts((t) => [...t, { id, amount }])
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

  const addOtherDrink = useCallback(
    (amount, color) => {
      addWater(amount, color)
      setOtherDrinksOpen(false)
    },
    [addWater]
  )

  const openInsights = useCallback(() => setOverlay('insights'), [])
  const openAccount = useCallback(() => setOverlay('account'), [])
  const closeOverlay = useCallback(() => setOverlay(null), [])

  const handleOnboardingComplete = useCallback((userData) => {
    setUser(userData)
    if (userData?.goal) setGoal(userData.goal)
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

      {/* top bar — insights, swipeable date pill, and account all in one row, same size */}
      <div className="flex items-center gap-2 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] relative z-10">
        <InsightsButton onClick={openInsights} streak={streak} current={current} goal={goal} />
        <DatePill
          selectedDate={selectedDate}
          isToday={isToday}
          amount={current}
          goal={goal}
          onPrev={goPrevDay}
          onNext={goNextDay}
        />
        <AccountButton onClick={openAccount} />
      </div>

      {/* cup stage — nudged up a bit via the extra bottom padding below */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 pb-6">
        <div className="relative">
          <WaterCup current={current} goal={goal} tint={isToday ? tint : null} drinkMix={isToday ? drinkMix : {}} />

          <FloatingDrinks open={otherDrinksOpen} step={step} onAdd={addOtherDrink} />

          <AnimatePresence>
            {toasts.map((t) => (
              <Droplet key={t.id} amount={t.amount} />
            ))}
          </AnimatePresence>
        </div>

        <div className="flex items-baseline gap-1 mt-4">
          <span className="font-body font-black text-4xl text-ink">{Math.round(current)}</span>
          <span className="font-body text-inkSoft font-bold">/ {goal} oz</span>
        </div>

        {!isToday && (
          <p className="font-body text-xs text-inkSoft mt-1.5">
            Logging water will jump you back to today
          </p>
        )}

        {/* +/- controls */}
        <div className="flex items-center gap-6 mt-5">
          <motion.button
            onClick={() => addWater(-step)}
            whileTap={{ scale: 0.85 }}
            className="w-[52px] h-[52px] rounded-full bg-white shadow-card flex items-center justify-center active:bg-mistDeep"
          >
            <Minus className="w-5 h-5 text-ink" strokeWidth={3} />
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
            className="w-[52px] h-[52px] rounded-full bg-coral shadow-card flex items-center justify-center active:bg-coral-deep"
          >
            <Plus className="w-5 h-5 text-white" strokeWidth={3} />
          </motion.button>
        </div>
      </div>

      {/* bottom sheet — quick add + other drinks, docked like a real app's action tray */}
      <div className="relative z-10 bg-white rounded-t-[32px] shadow-[0_-8px_24px_rgba(28,50,56,0.10)] px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <p className="font-body text-[11px] font-bold uppercase tracking-wider text-inkSoft/70 text-center mb-2.5">
          Quick add
        </p>
        <div className="flex gap-2.5">
          {PRESETS.map((amount) => (
            <PresetButton
              key={amount}
              amount={amount}
              maxAmount={PRESETS[PRESETS.length - 1]}
              onTap={addWater}
            />
          ))}
        </div>

        <OtherDrinksToggle open={otherDrinksOpen} onToggle={() => setOtherDrinksOpen((o) => !o)} />
      </div>

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
