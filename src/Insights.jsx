import { useMemo, useState, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Flame,
  Trophy,
  TrendingUp,
  TrendingDown,
  Droplets,
  Target,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { UNIT_DEFS, UNIT_ORDER, ozToUnit, formatAmount } from './units.js'

const WATER_COLOR = '#1C93D1' // matches the ring accent used on the Insights button in the top bar

/* ------------------------------ date helpers ------------------------------ */
// Local-time date keys (not UTC), matching how App.jsx builds history keys —
// keeping this local avoids a circular import back into App.jsx.
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

// Parses a 'YYYY-MM-DD' key as a local date (not UTC — `new Date(key)` would
// shift a day in negative-offset timezones).
function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatShortDate(key) {
  return parseKey(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Longest run of consecutive calendar days (ever) where intake hit the goal —
// distinct from the "current streak" passed in from App, which only looks at
// today/yesterday backward.
function computeLongestStreak(history, goal) {
  const metDays = Object.keys(history)
    .filter((key) => (history[key] || 0) >= goal)
    .sort()
  if (!metDays.length) return 0
  let longest = 1
  let current = 1
  for (let i = 1; i < metDays.length; i++) {
    const expectedNext = toKey(addDays(parseKey(metDays[i - 1]), 1))
    current = expectedNext === metDays[i] ? current + 1 : 1
    longest = Math.max(longest, current)
  }
  return longest
}

/* ---------------------------- subcomponents ---------------------------- */

// Hand-rolled multi-segment donut — same stroke-dasharray/offset technique
// already used for the streak ring on the Insights button, just with
// multiple stacked circles instead of one.
const DonutChart = memo(function DonutChart({ segments, size = 148, thickness = 24 }) {
  const r = (size - thickness) / 2
  const circumference = 2 * Math.PI * r
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  let cumulative = 0

  return (
    <motion.svg
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90 shrink-0"
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EFF7F7" strokeWidth={thickness} />
      {total > 0 &&
        segments
          .filter((s) => s.value > 0)
          .map((s) => {
            const frac = s.value / total
            const rawLen = frac * circumference
            const gap = segments.filter((seg) => seg.value > 0).length > 1 ? 2 : 0
            const segLen = Math.max(rawLen - gap, 0)
            const dashOffset = -cumulative
            cumulative += rawLen
            return (
              <circle
                key={s.id}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeLinecap="round"
                strokeDasharray={`${segLen} ${circumference - segLen}`}
                strokeDashoffset={dashOffset}
              />
            )
          })}
    </motion.svg>
  )
})

const StatCard = memo(function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl shadow-card px-3.5 py-3 flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-full bg-mist flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-coral-deep" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-body text-[10px] font-bold text-inkSoft uppercase tracking-wide leading-tight">
          {label}
        </p>
        <p className="font-hand text-xl text-ink leading-tight mt-0.5 truncate">{value}</p>
        {sub && <p className="font-body text-[10px] text-inkSoft/80 leading-tight">{sub}</p>}
      </div>
    </div>
  )
})

// Unit switcher — small segmented control reusing App's global units state,
// so switching here updates every screen (matches the same control style
// used elsewhere, e.g. the drag handle / date pill conventions).
const UnitSwitcher = memo(function UnitSwitcher({ units, onChange }) {
  return (
    <div className="flex bg-mist rounded-full p-1 gap-0.5">
      {UNIT_ORDER.map((u) => (
        <button
          key={u}
          onClick={() => onChange(u)}
          className={`px-2.5 py-1 rounded-full font-body text-[11px] font-bold uppercase tracking-wide transition-colors ${
            units === u ? 'bg-white text-ink shadow-card' : 'text-inkSoft'
          }`}
        >
          {UNIT_DEFS[u]?.short || u}
        </button>
      ))}
    </div>
  )
})

/* --------------------------------- Insights --------------------------------- */

export default function Insights({
  onClose,
  history = {},
  drinkHistory = {},
  drinkTypes = [],
  goal = 64,
  units = 'oz',
  onUnitsChange = () => {},
  streak = 0,
}) {
  const today = new Date()
  const todayKey = useMemo(() => toKey(today), [])

  /* ---- last 7 days, for the bar chart ---- */
  const last7 = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const date = addDays(today, -i)
      const key = toKey(date)
      days.push({
        key,
        label: date.toLocaleDateString(undefined, { weekday: 'narrow' }),
        amount: history[key] || 0,
        isToday: key === todayKey,
      })
    }
    return days
  }, [history, todayKey])

  /* ---- all-time drink-type breakdown, for the pie/donut ---- */
  const pieSegments = useMemo(() => {
    const segs = [{ id: 'water', label: 'Water', color: WATER_COLOR, value: 0 }]
    drinkTypes.forEach((d) => segs.push({ id: d.id, label: d.label, color: d.color, value: 0 }))
    const byId = Object.fromEntries(segs.map((s) => [s.id, s]))
    Object.values(drinkHistory).forEach((day) => {
      Object.entries(day).forEach(([bucket, oz]) => {
        if (byId[bucket]) byId[bucket].value += oz
      })
    })
    return segs
  }, [drinkHistory, drinkTypes])
  const pieTotal = useMemo(() => pieSegments.reduce((sum, s) => sum + s.value, 0), [pieSegments])

  /* ---- streaks / most / least / average / goal-met stats ---- */
  const stats = useMemo(() => {
    const entries = Object.entries(history)
    if (!entries.length) {
      return { longestStreak: 0, mostDay: null, leastDay: null, avg: 0, daysTracked: 0, goalMetDays: 0 }
    }
    let mostDay = entries[0]
    let leastDay = entries[0]
    let total = 0
    let goalMetDays = 0
    entries.forEach(([key, oz]) => {
      total += oz
      if (oz > mostDay[1]) mostDay = [key, oz]
      if (oz < leastDay[1]) leastDay = [key, oz]
      if (oz >= goal) goalMetDays += 1
    })
    return {
      longestStreak: computeLongestStreak(history, goal),
      mostDay: { key: mostDay[0], amount: mostDay[1] },
      leastDay: { key: leastDay[0], amount: leastDay[1] },
      avg: total / entries.length,
      daysTracked: entries.length,
      goalMetDays,
    }
  }, [history, goal])

  /* ---- calendar ---- */
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })
  const [selectedDay, setSelectedDay] = useState(null)

  const isCurrentMonth = calMonth.getFullYear() === today.getFullYear() && calMonth.getMonth() === today.getMonth()

  const calendarCells = useMemo(() => {
    const year = calMonth.getFullYear()
    const month = calMonth.getMonth()
    const firstWeekday = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells = Array.from({ length: firstWeekday }, () => null)
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const key = toKey(date)
      cells.push({
        day,
        key,
        tracked: Object.prototype.hasOwnProperty.call(history, key),
        amount: history[key] || 0,
        isToday: isSameDay(date, today),
        isFuture: date > today && !isSameDay(date, today),
      })
    }
    return cells
  }, [calMonth, history])

  const selectedDetail = useMemo(() => {
    if (!selectedDay) return null
    const dayBreakdown = drinkHistory[selectedDay] || {}
    const chips = pieSegments
      .map((s) => ({ ...s, value: dayBreakdown[s.id] || 0 }))
      .filter((s) => s.value > 0)
    return { key: selectedDay, total: history[selectedDay] || 0, chips }
  }, [selectedDay, drinkHistory, history, pieSegments])

  const unitShort = UNIT_DEFS[units]?.short || 'oz'

  const statCards = [
    { icon: Flame, label: 'Current streak', value: `${streak} ${streak === 1 ? 'day' : 'days'}` },
    { icon: Trophy, label: 'Longest streak', value: `${stats.longestStreak} ${stats.longestStreak === 1 ? 'day' : 'days'}` },
    {
      icon: TrendingUp,
      label: 'Most in a day',
      value: stats.mostDay ? formatAmount(stats.mostDay.amount, units) : '—',
      sub: stats.mostDay ? formatShortDate(stats.mostDay.key) : null,
    },
    {
      icon: TrendingDown,
      label: 'Least in a day',
      value: stats.leastDay ? formatAmount(stats.leastDay.amount, units) : '—',
      sub: stats.leastDay ? formatShortDate(stats.leastDay.key) : null,
    },
    { icon: Droplets, label: 'Daily average', value: stats.daysTracked ? formatAmount(stats.avg, units) : '—' },
    {
      icon: Target,
      label: 'Goal met',
      value: stats.daysTracked ? `${stats.goalMetDays}/${stats.daysTracked} days` : '—',
      sub: stats.daysTracked ? `${Math.round((stats.goalMetDays / stats.daysTracked) * 100)}% of tracked days` : null,
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 bg-mist flex flex-col"
    >
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="flex-1 flex flex-col overflow-y-auto px-6 pt-8 pb-10 [-webkit-overflow-scrolling:touch] [overscroll-behavior:contain]"
      >
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-hand text-4xl text-ink">Your insights</h1>
          <motion.button
            whileTap={{ scale: 0.85, rotate: 90 }}
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white shadow-card flex items-center justify-center shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-ink" />
          </motion.button>
        </div>

        <div className="flex justify-end mb-6">
          <UnitSwitcher units={units} onChange={onUnitsChange} />
        </div>

        {/* pie/donut — what you actually drink, split up */}
        <div className="bg-white rounded-3xl shadow-card p-5 mb-6">
          <p className="font-body text-xs font-bold uppercase tracking-wider text-inkSoft/70 mb-4">
            What you drink
          </p>
          {pieTotal > 0 ? (
            <div className="flex flex-col items-center gap-5">
              <div className="relative shrink-0">
                <DonutChart segments={pieSegments} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="font-hand text-xl text-ink leading-none">{ozToUnit(pieTotal, units)}</span>
                  <span className="font-body text-[9px] font-bold text-inkSoft uppercase tracking-wide mt-0.5">
                    {unitShort} total
                  </span>
                </div>
              </div>
              <div className="w-full grid grid-cols-2 gap-x-3 gap-y-2.5">
                {pieSegments
                  .filter((s) => s.value > 0)
                  .sort((a, b) => b.value - a.value)
                  .map((s, i) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.05 }}
                      className="flex items-center gap-1.5 min-w-0"
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="font-body text-xs font-bold text-ink truncate min-w-0">{s.label}</span>
                      <span className="font-body text-xs font-bold text-inkSoft shrink-0 ml-auto">
                        {Math.round((s.value / pieTotal) * 100)}%
                      </span>
                    </motion.div>
                  ))}
              </div>
            </div>
          ) : (
            <p className="font-body text-sm text-inkSoft py-6 text-center">
              Log a drink and your breakdown will show up here.
            </p>
          )}
        </div>

        {/* last 7 days */}
        <div className="bg-white rounded-3xl shadow-card p-5 mb-6">
          <p className="font-body text-xs font-bold uppercase tracking-wider text-inkSoft/70 mb-4">
            Last 7 days
          </p>
          <div className="flex items-stretch justify-between gap-2 h-32">
            {last7.map((d, i) => {
              const pct = goal > 0 ? Math.max(0, Math.min(1, d.amount / goal)) : 0
              const superHydrated = goal > 0 && d.amount / goal >= 1.4
              const goalMet = goal > 0 && d.amount >= goal
              return (
                <div key={d.key} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex-1 min-h-0 flex items-end rounded-full bg-mist overflow-hidden relative">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${pct * 100}%` }}
                      transition={{ type: 'spring', stiffness: 120, damping: 16, delay: i * 0.05 }}
                      className={`w-full rounded-full bg-gradient-to-t ${
                        superHydrated
                          ? 'from-sunshine to-sunshine'
                          : goalMet
                            ? 'from-coral-deep to-coral'
                            : 'from-aqua-deep to-aqua'
                      }`}
                    />
                  </div>
                  <span className={`font-body text-xs font-bold ${d.isToday ? 'text-coral-deep' : 'text-inkSoft'}`}>
                    {d.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* stat cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {statCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>

        {/* calendar */}
        <div className="bg-white rounded-3xl shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-body text-xs font-bold uppercase tracking-wider text-inkSoft/70">
              {calMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </p>
            <div className="flex items-center gap-1.5">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => {
                  setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
                  setSelectedDay(null)
                }}
                className="w-7 h-7 rounded-full bg-mist flex items-center justify-center"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-ink" strokeWidth={3} />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => {
                  if (isCurrentMonth) return
                  setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
                  setSelectedDay(null)
                }}
                disabled={isCurrentMonth}
                className="w-7 h-7 rounded-full bg-mist flex items-center justify-center disabled:opacity-30"
                aria-label="Next month"
              >
                <ChevronRight className="w-3.5 h-3.5 text-ink" strokeWidth={3} />
              </motion.button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-center font-body text-[10px] font-bold text-inkSoft/60">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarCells.map((cell, i) => {
              if (!cell) return <div key={`empty-${i}`} />
              const superHydrated = goal > 0 && cell.amount / goal >= 1.4
              const goalMet = goal > 0 && cell.amount >= goal
              const isSelected = selectedDay === cell.key
              let bg = 'bg-mist text-inkSoft/40'
              if (cell.tracked) {
                if (superHydrated) bg = 'bg-sunshine text-ink'
                else if (goalMet) bg = 'bg-aqua-deep text-white'
                else bg = 'bg-aqua-light/40 text-ink'
              }
              return (
                <motion.button
                  key={cell.key}
                  whileTap={cell.isFuture ? {} : { scale: 0.88 }}
                  disabled={cell.isFuture}
                  onClick={() => setSelectedDay((d) => (d === cell.key ? null : cell.key))}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 ${bg} ${
                    cell.isFuture ? 'opacity-30' : ''
                  } ${cell.isToday ? 'ring-2 ring-coral' : ''} ${isSelected ? 'ring-2 ring-ink' : ''}`}
                >
                  <span className="font-body text-[11px] font-bold leading-none">{cell.day}</span>
                  {cell.tracked && (
                    <span className="font-body text-[8px] font-bold leading-none opacity-90">
                      {ozToUnit(cell.amount, units)}
                    </span>
                  )}
                </motion.button>
              )
            })}
          </div>

          <AnimatePresence>
            {selectedDetail && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-mist">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-hand text-lg text-ink">{formatShortDate(selectedDetail.key)}</p>
                    <p className="font-body text-sm font-bold text-inkSoft">
                      {formatAmount(selectedDetail.total, units)}
                    </p>
                  </div>
                  {selectedDetail.chips.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedDetail.chips.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center gap-1.5 bg-mist rounded-full pl-1.5 pr-2.5 py-1"
                        >
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                          <span className="font-body text-[11px] font-bold text-ink">
                            {c.label} · {ozToUnit(c.value, units)} {unitShort}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="font-body text-xs text-inkSoft">Nothing logged this day.</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}
