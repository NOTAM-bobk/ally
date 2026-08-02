import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Bell, Target, LogOut, ChevronRight, Check } from 'lucide-react'

const REMINDERS_STORAGE_KEY = 'ally-reminders'
const UNITS_STORAGE_KEY = 'ally-units'
const OZ_TO_ML = 29.5735

const INTERVAL_OPTIONS = [1, 2, 3, 4, 6]
const UNIT_OPTIONS = [
  { id: 'oz', label: 'Ounces (oz)' },
  { id: 'ml', label: 'Milliliters (mL)' },
]

function loadReminders() {
  try {
    const raw = localStorage.getItem(REMINDERS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (parsed && typeof parsed.enabled === 'boolean' && Number.isFinite(parsed.intervalHours)) {
      return parsed
    }
  } catch {
    // fall through to default
  }
  return { enabled: false, intervalHours: 2 }
}

function loadUnits() {
  try {
    const raw = localStorage.getItem(UNITS_STORAGE_KEY)
    return raw === 'ml' ? 'ml' : 'oz'
  } catch {
    return 'oz'
  }
}

function formatOz(oz, units) {
  if (units === 'ml') return `${Math.round(oz * OZ_TO_ML)} mL`
  return `${Math.round(oz)} oz`
}

// Shared bottom-sheet shell for all three settings editors.
function SettingsSheet({ title, onClose, children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-soft p-6 w-full max-w-xs mb-[max(1.5rem,env(safe-area-inset-bottom))] sm:mb-0 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-mist flex items-center justify-center"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-inkSoft" />
        </button>
        <p className="font-hand text-2xl text-ink text-center mb-4">{title}</p>
        {children}
      </motion.div>
    </motion.div>
  )
}

function GoalSheet({ goal, units, onSave, onClose }) {
  const [ozValue, setOzValue] = useState(goal)
  const displayValue = units === 'ml' ? Math.round(ozValue * OZ_TO_ML) : ozValue

  return (
    <SettingsSheet title="Daily goal" onClose={onClose}>
      <p className="font-body text-4xl font-black text-aqua-deep text-center">
        {displayValue}
        <span className="text-lg font-bold text-inkSoft ml-1">{units === 'ml' ? 'mL' : 'oz'}</span>
      </p>
      <input
        type="range"
        min={48}
        max={160}
        step={4}
        value={ozValue}
        onChange={(e) => setOzValue(Number(e.target.value))}
        aria-label="Daily goal in ounces"
        className="w-full mt-5 accent-coral"
      />
      <div className="flex justify-between font-body text-[11px] text-inkSoft font-bold mt-1">
        <span>{formatOz(48, units)}</span>
        <span>{formatOz(160, units)}</span>
      </div>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          onSave(ozValue)
          onClose()
        }}
        className="w-full mt-5 bg-coral text-white font-body font-bold py-3 rounded-full"
      >
        Save
      </motion.button>
    </SettingsSheet>
  )
}

function RemindersSheet({ reminders, onSave, onClose }) {
  const [enabled, setEnabled] = useState(reminders.enabled)
  const [intervalHours, setIntervalHours] = useState(reminders.intervalHours)

  return (
    <SettingsSheet title="Reminders" onClose={onClose}>
      <button
        onClick={() => setEnabled((e) => !e)}
        className="w-full flex items-center justify-between bg-mist rounded-2xl px-4 py-3.5"
      >
        <span className="font-body font-bold text-sm text-ink">Nudge me to drink water</span>
        <span
          className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${
            enabled ? 'bg-aqua-deep' : 'bg-ink/15'
          }`}
        >
          <motion.span
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
            animate={{ left: enabled ? 22 : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          />
        </span>
      </button>

      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="font-body text-xs font-bold uppercase tracking-wide text-inkSoft/70 mt-4 mb-2">
              Remind me every
            </p>
            <div className="flex flex-wrap gap-2">
              {INTERVAL_OPTIONS.map((h) => (
                <button
                  key={h}
                  onClick={() => setIntervalHours(h)}
                  className={`px-3.5 py-2 rounded-full font-body font-bold text-sm border-2 ${
                    intervalHours === h
                      ? 'bg-aqua-deep text-white border-aqua-deep'
                      : 'bg-mist text-inkSoft border-transparent'
                  }`}
                >
                  {h} hr{h > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          onSave({ enabled, intervalHours })
          onClose()
        }}
        className="w-full mt-5 bg-coral text-white font-body font-bold py-3 rounded-full"
      >
        Save
      </motion.button>
    </SettingsSheet>
  )
}

function UnitsSheet({ units, onSave, onClose }) {
  return (
    <SettingsSheet title="Units" onClose={onClose}>
      <div className="flex flex-col gap-2">
        {UNIT_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => {
              onSave(opt.id)
              onClose()
            }}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 font-body font-bold text-sm ${
              units === opt.id
                ? 'bg-aqua-deep text-white border-aqua-deep'
                : 'bg-mist text-inkSoft border-transparent'
            }`}
          >
            {opt.label}
            {units === opt.id && <Check className="w-4 h-4" />}
          </button>
        ))}
      </div>
    </SettingsSheet>
  )
}

// goal is always stored/passed in ounces — units only changes how it's displayed.
export default function Account({ user, goal = 64, onGoalChange, onClose, onSignOut }) {
  const [openSheet, setOpenSheet] = useState(null) // null | 'goal' | 'reminders' | 'units'
  const [reminders, setReminders] = useState(loadReminders)
  const [units, setUnits] = useState(loadUnits)
  const [confirmingSignOut, setConfirmingSignOut] = useState(false)

  const saveGoal = (nextOz) => {
    onGoalChange?.(nextOz)
    try {
      localStorage.setItem('ally-goal', String(nextOz))
    } catch {
      // storage unavailable — the session still reflects the change via onGoalChange
    }
  }

  const saveReminders = (next) => {
    setReminders(next)
    try {
      localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // storage unavailable — setting still applies for this session
    }
  }

  const saveUnits = (next) => {
    setUnits(next)
    try {
      localStorage.setItem(UNITS_STORAGE_KEY, next)
    } catch {
      // storage unavailable — setting still applies for this session
    }
  }

  const handleSignOut = () => {
    if (!confirmingSignOut) {
      setConfirmingSignOut(true)
      return
    }
    try {
      localStorage.removeItem('ally-onboarded')
      localStorage.removeItem('ally-user')
      localStorage.removeItem('ally-goal')
      localStorage.removeItem('ally-history')
      localStorage.removeItem('ally-step')
      localStorage.removeItem(REMINDERS_STORAGE_KEY)
      localStorage.removeItem(UNITS_STORAGE_KEY)
    } catch {
      // storage unavailable — still hand off to the parent to reset state
    }
    if (onSignOut) {
      onSignOut()
    } else {
      window.location.reload()
    }
  }

  const rows = [
    { key: 'goal', icon: Target, label: 'Daily goal', value: formatOz(goal, units) },
    {
      key: 'reminders',
      icon: Bell,
      label: 'Reminders',
      value: reminders.enabled ? `Every ${reminders.intervalHours} hr${reminders.intervalHours > 1 ? 's' : ''}` : 'Off',
    },
    { key: 'units', icon: User, label: 'Units', value: units === 'ml' ? 'Milliliters (mL)' : 'Ounces (oz)' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-mist flex flex-col"
    >
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="flex-1 flex flex-col overflow-y-auto px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-hand text-4xl text-ink">Your account</h1>
          <motion.button
            whileTap={{ scale: 0.85, rotate: -90 }}
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white shadow-card flex items-center justify-center"
          >
            <X className="w-5 h-5 text-ink" />
          </motion.button>
        </div>

        <div className="bg-gradient-to-br from-aqua to-aqua-deep rounded-3xl p-6 shadow-soft mb-6 text-white">
          <div className="w-16 h-16 rounded-full bg-white/25 flex items-center justify-center font-hand text-3xl mb-3">
            {(user?.name?.[0] || 'A').toUpperCase()}
          </div>
          <p className="font-hand text-3xl">{user?.name || 'Friend'}</p>
          <p className="font-body text-sm text-white/80">{user?.email || 'you@example.com'}</p>
        </div>

        <p className="font-body text-xs font-bold uppercase tracking-wider text-inkSoft/70 mb-2 px-1">
          Preferences
        </p>
        <div className="bg-white rounded-3xl shadow-card divide-y divide-mistDeep overflow-hidden mb-6">
          {rows.map(({ key, icon: Icon, label, value }) => (
            <button
              key={key}
              onClick={() => setOpenSheet(key)}
              className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-mist/60 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-mist flex items-center justify-center shrink-0">
                <Icon className="w-4.5 h-4.5 text-aqua-deep" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body font-bold text-ink text-sm">{label}</p>
                <p className="font-body text-xs text-inkSoft">{value}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-ink/30" />
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleSignOut}
          onBlur={() => setConfirmingSignOut(false)}
          className={`w-full flex items-center justify-center gap-2 font-body font-bold py-3.5 rounded-full transition-colors ${
            confirmingSignOut ? 'bg-coral text-white' : 'text-coral-deep'
          }`}
        >
          <LogOut className="w-4 h-4" />
          {confirmingSignOut ? 'Tap again to sign out' : 'Sign out'}
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {openSheet === 'goal' && (
          <GoalSheet key="goal" goal={goal} units={units} onSave={saveGoal} onClose={() => setOpenSheet(null)} />
        )}
        {openSheet === 'reminders' && (
          <RemindersSheet
            key="reminders"
            reminders={reminders}
            onSave={saveReminders}
            onClose={() => setOpenSheet(null)}
          />
        )}
        {openSheet === 'units' && (
          <UnitsSheet key="units" units={units} onSave={saveUnits} onClose={() => setOpenSheet(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
