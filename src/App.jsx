import { useState, useCallback, useMemo, useId, useEffect, useRef, memo, lazy, Suspense } from 'react'
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import Onboarding from './Onboarding.jsx'
import { UNIT_DEFS, UNIT_ORDER, ozToUnit, formatAmount } from './units.js'

// Account and Insights are only needed once the user opens them, so they're
// code-split out of the main bundle (perf: smaller initial JS payload).
const Account = lazy(() => import('./Account.jsx'))
const Insights = lazy(() => import('./Insights.jsx'))

const DEFAULT_STEP = 8 // oz — default amount the +/- buttons adjust by
const DEFAULT_PRESETS = [8, 16, 24] // oz — fallback quick-add amounts, customizable in Account
const HISTORY_STORAGE_KEY = 'ally-history'
const STEP_STORAGE_KEY = 'ally-step'
const ONBOARDED_STORAGE_KEY = 'ally-onboarded'
const USER_STORAGE_KEY = 'ally-user'
const GOAL_STORAGE_KEY = 'ally-goal'
const UNITS_STORAGE_KEY = 'ally-units'
const PRESETS_STORAGE_KEY = 'ally-presets'
const DRINK_SETTINGS_STORAGE_KEY = 'ally-drink-settings'
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

// Per-drink customization: each drink can be shown/hidden and given its own
// tap amount (in oz), independent of the others and independent of the main
// +/- step size.
function defaultDrinkSettings() {
  return Object.fromEntries(DRINK_TYPES.map((d) => [d.id, { enabled: true, step: DEFAULT_STEP }]))
}

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

// The display unit is read here (top of the app) and handed down to every
// screen that shows a number, so switching it in Account changes it
// everywhere at once instead of just on the Account screen.
function loadUnits() {
  try {
    const raw = localStorage.getItem(UNITS_STORAGE_KEY)
    return UNIT_ORDER.includes(raw) ? raw : 'oz'
  } catch {
    return 'oz'
  }
}

function loadPresets() {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (Array.isArray(parsed) && parsed.length === 3 && parsed.every((n) => Number.isFinite(n) && n > 0)) {
      return parsed
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_PRESETS
}

function loadDrinkSettings() {
  const defaults = defaultDrinkSettings()
  try {
    const raw = localStorage.getItem(DRINK_SETTINGS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (parsed && typeof parsed === 'object') {
      const merged = {}
      for (const id of Object.keys(defaults)) {
        const saved = parsed[id]
        merged[id] = {
          enabled: typeof saved?.enabled === 'boolean' ? saved.enabled : defaults[id].enabled,
          step: Number.isFinite(saved?.step) && saved.step > 0 ? saved.step : defaults[id].step,
        }
      }
      return merged
    }
  } catch {
    // fall through to default
  }
  return defaults
}

/* ------------------------------ subcomponents ------------------------------ */

const Droplet = memo(function Droplet({ amount, units }) {
  const isAdd = amount > 0
  const label = formatAmount(Math.abs(amount), units)
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
      {isAdd ? '+' : '-'}{label}
    </motion.div>
  )
})

const WaterCup = memo(function WaterCup({ current, goal, tint, drinkEntries, onRemoveDrink, units, splashSignal }) {
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
  // A light overall shift toward whatever's been logged, on top of the
  // distinct marker lines below.
  if (tint && tint.color && !superHydrated) {
    bottomStop = mixColors(bottomStop, tint.color, Math.min(0.32, tint.weight))
  }

  // A thin line for each non-water drink poured today, sitting at the water
  // level it was poured at (not the current level) — so later water added on
  // top submerges it instead of pushing it back up to the surface.
  const markers = useMemo(() => {
    return (drinkEntries || []).map((entry) => {
      const clampedOz = Math.max(0, Math.min(entry.atOz, current))
      const markerRatio = goal > 0 ? clampedOz / goal : 0
      const y = 252 - 236 * Math.min(1, markerRatio)
      return { ...entry, drink: DRINK_BY_COLOR[entry.color], y }
    })
  }, [drinkEntries, current, goal])

  const [activeEntryId, setActiveEntryId] = useState(null)
  const activeMarker = markers.find((m) => m.id === activeEntryId) || null

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
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={topStop} />
            <stop offset="100%" stopColor={bottomStop} />
          </linearGradient>
        </defs>

        <path d={CUP_PATH} fill="#FFFFFF" opacity="0.5" />

        <g clipPath={`url(#${clipId})`}>
          {(() => {
            const fill = (
              <>
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

                {/* thin pour-level lines for logged non-water drinks — drawn above the
                    wave/highlight so they stay tappable even once water rises over them */}
                <AnimatePresence>
                  {markers.map((m) => (
                    <motion.g
                      key={m.id}
                      initial={{ opacity: 0, y: 252 }}
                      animate={{ opacity: 1, y: m.y }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={{ type: 'spring', stiffness: 150, damping: 20 }}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveEntryId((id) => (id === m.id ? null : m.id))
                      }}
                    >
                      <path
                        d="M42 0 C 68 -3, 92 3, 116 0 C 132 -2, 144 2, 154 0"
                        fill="none"
                        stroke={m.color}
                        strokeWidth="3"
                        strokeLinecap="round"
                        opacity="0.85"
                      />
                      {/* wider invisible stroke = easier tap target than the thin line */}
                      <path
                        d="M42 0 C 68 -3, 92 3, 116 0 C 132 -2, 144 2, 154 0"
                        fill="none"
                        stroke="transparent"
                        strokeWidth="18"
                      />
                      <circle cx="154" cy="0" r="6.5" fill={m.color} stroke="#FFFFFF" strokeWidth="1.5" />
                    </motion.g>
                  ))}
                </AnimatePresence>
              </>
            )
            // Only wrap in the sloshing animation once a splash has actually
            // happened (nonce > 0) — otherwise the cup would wobble on first
            // load for no reason. Tilts toward `dir` then settles back to 0,
            // pivoting from the bottom-center of the glass like real liquid.
            if (!splashSignal?.nonce) return fill
            const dir = splashSignal.dir || 1
            return (
              <motion.g
                key={splashSignal.nonce}
                initial={{ rotate: dir * 7 }}
                animate={{ rotate: [dir * 7, -dir * 4, dir * 2, 0] }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                style={{ transformOrigin: '100px 252px' }}
              >
                {fill}
              </motion.g>
            )
          })()}
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

      {/* tap-outside backdrop + remove popover for the active marker */}
      <AnimatePresence>
        {activeMarker && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20"
              onClick={() => setActiveEntryId(null)}
            />
            <motion.div
              key="popover"
              initial={{ opacity: 0, scale: 0.85, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 6 }}
              transition={{ type: 'spring', stiffness: 380, damping: 24 }}
              className="absolute z-30 -translate-x-1/2 -translate-y-full"
              style={{ left: '77%', top: `${(activeMarker.y / 264) * 100}%`, marginTop: '-10px' }}
            >
              <div className="bg-white rounded-2xl shadow-card px-3 py-2 flex flex-col items-center gap-1.5 whitespace-nowrap">
                <span className="font-body text-xs font-bold text-ink">
                  {activeMarker.drink?.label || 'Drink'} · {formatAmount(activeMarker.amount, units)}
                </span>
                <button
                  onClick={() => {
                    onRemoveDrink?.(activeMarker.id)
                    setActiveEntryId(null)
                  }}
                  className="hand-wobble flex items-center gap-1 bg-coral text-white text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full"
                >
                  <X className="w-3 h-3" strokeWidth={3} />
                  Remove
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
})

const PresetButton = memo(function PresetButton({ amount, maxAmount, units, onTap }) {
  // Icon grows a step for each bigger preset, so size is visible at a glance.
  // Sizing compares raw oz amounts (unaffected by display unit).
  const iconClass = amount <= maxAmount / 3 ? 'w-3.5 h-3.5' : amount <= (2 * maxAmount) / 3 ? 'w-4 h-4' : 'w-4.5 h-4.5'
  const displayValue = ozToUnit(amount, units)
  return (
    <motion.button
      onClick={() => onTap(amount)}
      whileTap={{ scale: 0.9, rotate: -2 }}
      whileHover={{ scale: 1.04 }}
      transition={{ type: 'spring', stiffness: 400, damping: 14 }}
      className="flex-1 bg-mist rounded-2xl py-2.5 shadow-card border-2 border-transparent active:border-aqua flex flex-col items-center justify-center"
    >
      <GlassWater className={`${iconClass} text-aqua-deep mb-0.5`} />
      <span className="font-hand text-xl text-ink leading-none">+{displayValue}</span>
      <span className="font-body text-[9px] font-bold text-inkSoft uppercase tracking-wide mt-0.5">
        {UNIT_DEFS[units]?.short || 'oz'}
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
// swipe right goes back a day. Tapping the pill while on a past day jumps
// straight back to today. A one-time nudge (plus faint permanent chevrons)
// hints that it's swipeable.
const DATE_HINT_STORAGE_KEY = 'ally-date-hint-seen'

const DatePill = memo(function DatePill({ selectedDate, isToday, onNext, onPrev, onToday }) {
  const label = useMemo(() => formatDateLabel(selectedDate), [selectedDate])

  const prevDateRef = useRef(selectedDate)
  const direction = selectedDate > prevDateRef.current ? 1 : selectedDate < prevDateRef.current ? -1 : 0
  useEffect(() => {
    prevDateRef.current = selectedDate
  }, [selectedDate])

  // Teach the swipe gesture once, ever, with a gentle nudge shortly after the
  // very first load — then never again.
  const [hint, setHint] = useState(false)
  useEffect(() => {
    let seen = true
    try {
      seen = !!localStorage.getItem(DATE_HINT_STORAGE_KEY)
    } catch {
      seen = true
    }
    if (seen) return
    const t = setTimeout(() => setHint(true), 900)
    return () => clearTimeout(t)
  }, [])

  const dismissHint = useCallback(() => {
    setHint(false)
    try {
      localStorage.setItem(DATE_HINT_STORAGE_KEY, '1')
    } catch {
      // storage unavailable — fail silently
    }
  }, [])

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

  const variants = {
    enter: (dir) => ({ opacity: 0, x: dir < 0 ? -14 : 14, scale: 0.94 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (dir) => ({ opacity: 0, x: dir < 0 ? 14 : -14, scale: 0.94 }),
  }

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.5}
      onDragEnd={handleDragEnd}
      onDragStart={dismissHint}
      onTap={() => {
        dismissHint()
        if (!isToday) onToday()
      }}
      whileTap={{ scale: 0.97 }}
      animate={hint ? { x: [0, -7, 0, 7, 0] } : { x: 0 }}
      transition={hint ? { duration: 1.1, ease: 'easeInOut' } : { duration: 0.15 }}
      onAnimationComplete={() => hint && dismissHint()}
      className="flex-1 min-w-0 h-11 bg-white/80 backdrop-blur rounded-full shadow-card flex items-center justify-center gap-1.5 touch-pan-y cursor-grab active:cursor-grabbing overflow-hidden"
    >
      <motion.span
        animate={{ opacity: hint ? [0.3, 0.7, 0.3] : 0.3 }}
        transition={{ duration: 1.1, ease: 'easeInOut' }}
        className="text-aqua-deep shrink-0"
      >
        <ChevronLeft className="w-3 h-3" strokeWidth={3} />
      </motion.span>

      <AnimatePresence mode="wait" custom={direction}>
        <motion.span
          key={label}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="font-hand text-lg text-ink leading-none whitespace-nowrap"
        >
          {label}
        </motion.span>
      </AnimatePresence>

      <motion.span
        animate={{ opacity: isToday ? 0.1 : hint ? [0.3, 0.7, 0.3] : 0.3 }}
        transition={{ duration: 1.1, ease: 'easeInOut' }}
        className="text-aqua-deep shrink-0"
      >
        <ChevronRight className="w-3 h-3" strokeWidth={3} />
      </motion.span>
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

const FloatingDrinks = memo(function FloatingDrinks({ open, drinkSettings, onAdd }) {
  const activeDrinks = DRINK_TYPES.filter((d) => drinkSettings[d.id]?.enabled !== false)
  return (
    <AnimatePresence>
      {open &&
        activeDrinks.map((drink, i) => {
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
              onClick={() => onAdd(drinkSettings[drink.id]?.step || DEFAULT_STEP, drink.color)}
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
const StepModal = memo(function StepModal({ step, units, onChange, onClose }) {
  const unitShort = UNIT_DEFS[units]?.short || 'oz'
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
        <p className="font-body text-4xl font-black text-aqua-deep text-center mt-2">
          {ozToUnit(step, units)} {unitShort}
        </p>
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
          <span>{ozToUnit(1, units)} {unitShort}</span>
          <span>{ozToUnit(32, units)} {unitShort}</span>
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
  // Display unit — read once here at the top of the app and passed down to
  // every screen that renders a number, so changing it in Account updates
  // the cup, presets, step modal, and everywhere else at once.
  const [units, setUnits] = useState(loadUnits)
  // Quick-add preset amounts (oz), customizable from Account.
  const [presets, setPresets] = useState(loadPresets)
  // Per-drink enabled/step customization for the "Other drinks" floaters.
  const [drinkSettings, setDrinkSettings] = useState(loadDrinkSettings)
  // Running total of non-water drinks logged today, by color, so the cup can
  // tint toward whatever's actually been added. In-memory only (resets on
  // reload), which is fine since it's a light visual touch, not core data.
  const [drinkMix, setDrinkMix] = useState({})
  // Individual non-water pours (id/color/amount/atOz), so each can render as
  // its own line marker in the cup and be removed on its own. In-memory only
  // (resets on reload), matching drinkMix above.
  const [otherDrinkEntries, setOtherDrinkEntries] = useState([])
  const [otherDrinksOpen, setOtherDrinksOpen] = useState(false)
  // Bumped every time addWater actually changes today's total, so WaterCup
  // can play a one-off "slosh" animation without re-rendering on every
  // unrelated state change (e.g. switching days).
  const [splashSignal, setSplashSignal] = useState({ nonce: 0, dir: 1 })

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

  // Persist the display unit so it survives a reload.
  useEffect(() => {
    try {
      localStorage.setItem(UNITS_STORAGE_KEY, units)
    } catch {
      // storage unavailable — fail silently
    }
  }, [units])

  // Persist quick-add presets so custom amounts survive a reload.
  useEffect(() => {
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets))
    } catch {
      // storage unavailable — fail silently
    }
  }, [presets])

  // Persist per-drink enabled/step customization so it survives a reload.
  useEffect(() => {
    try {
      localStorage.setItem(DRINK_SETTINGS_STORAGE_KEY, JSON.stringify(drinkSettings))
    } catch {
      // storage unavailable — fail silently
    }
  }, [drinkSettings])

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
      const prevToday = history[todayKey] || 0
      const nextVal = Math.max(0, Math.min(MAX_DAILY_OZ, prevToday + amount))
      const actualDelta = nextVal - prevToday
      setHistory((h) => ({ ...h, [todayKey]: nextVal }))
      if (amount > 0) {
        spawnToast(amount)
        if (color) {
          setDrinkMix((m) => ({ ...m, [color]: (m[color] || 0) + amount }))
          setOtherDrinkEntries((entries) => [
            ...entries,
            { id: Math.random().toString(36).slice(2), color, amount, atOz: nextVal },
          ])
        }
      }
      // Only splash if the level actually moved (e.g. not tapping minus at 0).
      if (actualDelta !== 0) {
        setSplashSignal((s) => ({ nonce: s.nonce + 1, dir: actualDelta > 0 ? 1 : -1 }))
      }
      setDayOffset(0)
    },
    [history, todayKey, spawnToast]
  )

  // Undoes a single pour: subtracts it from today's total, its share of the
  // color tint, and its own marker — without touching any other entries.
  const removeOtherDrink = useCallback(
    (id) => {
      const entry = otherDrinkEntries.find((e) => e.id === id)
      if (!entry) return
      setOtherDrinkEntries((entries) => entries.filter((e) => e.id !== id))
      setHistory((h) => ({
        ...h,
        [todayKey]: Math.max(0, (h[todayKey] || 0) - entry.amount),
      }))
      setDrinkMix((m) => {
        const nextOz = Math.max(0, (m[entry.color] || 0) - entry.amount)
        const next = { ...m }
        if (nextOz > 0) next[entry.color] = nextOz
        else delete next[entry.color]
        return next
      })
    },
    [otherDrinkEntries, todayKey]
  )

  const goPrevDay = useCallback(() => setDayOffset((d) => d + 1), [])
  const goNextDay = useCallback(() => setDayOffset((d) => Math.max(d - 1, 0)), [])
  const goToday = useCallback(() => setDayOffset(0), [])

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
          onToday={goToday}
        />
        <AccountButton onClick={openAccount} />
      </div>

      {/* cup stage — nudged up a bit via the extra bottom padding below */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 pb-6">
        <div className="relative">
          <WaterCup
            current={current}
            goal={goal}
            tint={isToday ? tint : null}
            drinkEntries={isToday ? otherDrinkEntries : []}
            onRemoveDrink={removeOtherDrink}
            units={units}
            splashSignal={splashSignal}
          />

          <FloatingDrinks open={otherDrinksOpen} drinkSettings={drinkSettings} onAdd={addOtherDrink} />

          <AnimatePresence>
            {toasts.map((t) => (
              <Droplet key={t.id} amount={t.amount} units={units} />
            ))}
          </AnimatePresence>
        </div>

        <div className="flex items-baseline gap-1 mt-4">
          <span className="font-body font-black text-4xl text-ink">{ozToUnit(current, units)}</span>
          <span className="font-body text-inkSoft font-bold">
            / {ozToUnit(goal, units)} {UNIT_DEFS[units]?.short || 'oz'}
          </span>
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
            {ozToUnit(step, units)} {UNIT_DEFS[units]?.short || 'oz'} step
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
          {presets.map((amount, i) => (
            <PresetButton
              key={i}
              amount={amount}
              maxAmount={Math.max(...presets)}
              units={units}
              onTap={addWater}
            />
          ))}
        </div>

        {DRINK_TYPES.some((d) => drinkSettings[d.id]?.enabled !== false) && (
          <OtherDrinksToggle open={otherDrinksOpen} onToggle={() => setOtherDrinksOpen((o) => !o)} />
        )}
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
            <Account
              user={user}
              goal={goal}
              onGoalChange={setGoal}
              units={units}
              onUnitsChange={setUnits}
              presets={presets}
              onPresetsChange={setPresets}
              drinkTypes={DRINK_TYPES}
              drinkSettings={drinkSettings}
              onDrinkSettingsChange={setDrinkSettings}
              onClose={closeOverlay}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* step-size adjuster popup */}
      <AnimatePresence>
        {stepModalOpen && (
          <StepModal
            key="step-modal"
            step={step}
            units={units}
            onChange={setStep}
            onClose={() => setStepModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
