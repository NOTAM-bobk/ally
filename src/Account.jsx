import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Bell,
  Target,
  Ruler,
  LogOut,
  ChevronRight,
  Check,
  Sliders,
  GlassWater,
  Palette,
  FileText,
  ShieldCheck,
  Lightbulb,
  LifeBuoy,
  ExternalLink,
} from 'lucide-react'
import { UNIT_DEFS, UNIT_ORDER, ozToUnit, formatAmount, unitShort } from './units.js'

const REMINDERS_STORAGE_KEY = 'ally-reminders'
const THEME_STORAGE_KEY = 'ally-theme'
// Storage keys owned by App.jsx (units/presets/drink settings/drink history)
// — listed here too so sign-out can clear everything this screen touches.
const UNITS_STORAGE_KEY = 'ally-units'
const PRESETS_STORAGE_KEY = 'ally-presets'
const DRINK_SETTINGS_STORAGE_KEY = 'ally-drink-settings'
const DRINK_HISTORY_STORAGE_KEY = 'ally-drink-history'

const INTERVAL_OPTIONS = [1, 2, 3, 4, 6]

// Only "Light" actually does anything today — this is just the scaffold for
// an Appearance section we'll build out with more options later.
const THEME_OPTIONS = [
  { id: 'light', label: 'Light', available: true },
  { id: 'dark', label: 'Dark', available: false },
]

// Quick links open in a new tab so nobody loses their place in the app.
// Swap these placeholder URLs for the real destinations when ready.
const QUICK_LINKS = [
  { key: 'terms', label: 'Terms of service', icon: FileText, url: 'https://example.com/terms' },
  { key: 'privacy', label: 'Privacy policy', icon: ShieldCheck, url: 'https://example.com/privacy' },
  { key: 'features', label: 'Feature board', icon: Lightbulb, url: 'https://example.com/features' },
  { key: 'support', label: 'Support', icon: LifeBuoy, url: 'https://example.com/support' },
]

function openInNewTab(url) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

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

function loadTheme() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    return THEME_OPTIONS.some((t) => t.id === raw) ? raw : 'light'
  } catch {
    return 'light'
  }
}

// Onboarding may store the name under a couple of different keys depending
// on how it was built — check the common ones.
function getUserName(user) {
  return user?.name || user?.firstName || user?.displayName || ''
}

/* ------------------------------ shared row bits ------------------------------ */

// A tappable row that opens one of the settings sheets below. Used for
// every row in Preferences and Appearance — one implementation, so there's
// a single place that can go wrong instead of five near-identical copies.
function SettingsRow({ icon: Icon, label, value, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-mist/60 transition-colors"
    >
      <span className="w-9 h-9 rounded-full bg-mist flex items-center justify-center shrink-0">
        <Icon className="w-4.5 h-4.5 text-aqua-deep" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-body font-bold text-ink text-sm">{label}</span>
        <span className="block font-body text-xs text-inkSoft truncate">{value}</span>
      </span>
      <ChevronRight className="w-4 h-4 text-ink/30 shrink-0" />
    </button>
  )
}

// A row that just opens an external link in a new tab (Terms, Support, etc).
function LinkRow({ icon: Icon, label, url }) {
  return (
    <button
      onClick={() => openInNewTab(url)}
      className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-mist/60 transition-colors"
    >
      <span className="w-9 h-9 rounded-full bg-mist flex items-center justify-center shrink-0">
        <Icon className="w-4.5 h-4.5 text-aqua-deep" />
      </span>
      <span className="flex-1 min-w-0 font-body font-bold text-ink text-sm">{label}</span>
      <ExternalLink className="w-3.5 h-3.5 text-ink/30 shrink-0" />
    </button>
  )
}

// A labeled white card containing a list of rows — Preferences, Appearance,
// and More are each just one of these with a different row set.
function Section({ title, children }) {
  return (
    <div className="mb-6">
      <p className="font-body text-xs font-bold uppercase tracking-wider text-inkSoft/70 mb-2 px-1">{title}</p>
      <div className="bg-white rounded-3xl shadow-card divide-y divide-mistDeep overflow-hidden">{children}</div>
    </div>
  )
}

/* ------------------------------ settings sheets ------------------------------ */

// Shared bottom-sheet shell for every settings editor.
function SettingsSheet({ title, onClose, children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-soft p-6 w-full max-w-xs mb-[max(1.5rem,env(safe-area-inset-bottom))] sm:mb-0 relative max-h-[85vh] overflow-y-auto [-webkit-overflow-scrolling:touch] [overscroll-behavior:contain]"
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

// goal is always stored/passed in ounces — the slider stays in oz too, it's
// only the numbers shown to the person that switch with the chosen unit.
function GoalSheet({ goal, units, onSave, onClose }) {
  const [ozValue, setOzValue] = useState(goal)
  const short = unitShort(units)

  return (
    <SettingsSheet title="Daily goal" onClose={onClose}>
      <p className="font-body text-4xl font-black text-aqua-deep text-center">
        {ozToUnit(ozValue, units)}
        <span className="text-lg font-bold text-inkSoft ml-1">{short}</span>
      </p>
      <input
        type="range"
        min={48}
        max={160}
        step={4}
        value={ozValue}
        onChange={(e) => setOzValue(Number(e.target.value))}
        aria-label="Daily goal"
        className="w-full mt-5 accent-aqua-deep"
      />
      <div className="flex justify-between font-body text-[11px] text-inkSoft font-bold mt-1">
        <span>{formatAmount(48, units)}</span>
        <span>{formatAmount(160, units)}</span>
      </div>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          onSave(ozValue)
          onClose()
        }}
        className="w-full mt-5 bg-aqua-deep text-white font-body font-bold py-3 rounded-full"
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
        className="w-full mt-5 bg-aqua-deep text-white font-body font-bold py-3 rounded-full"
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
        {UNIT_ORDER.map((id) => {
          const def = UNIT_DEFS[id]
          return (
            <button
              key={id}
              onClick={() => {
                onSave(id)
                onClose()
              }}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 font-body font-bold text-sm ${
                units === id
                  ? 'bg-aqua-deep text-white border-aqua-deep'
                  : 'bg-mist text-inkSoft border-transparent'
              }`}
            >
              {def.label}
              {units === id && <Check className="w-4 h-4" />}
            </button>
          )
        })}
      </div>
    </SettingsSheet>
  )
}

// First setting under Appearance. Only Light works today — Dark (and
// whatever else lands here later) shows up already, greyed out and
// labeled, so the section has somewhere to grow into.
function ThemeSheet({ theme, onSave, onClose }) {
  return (
    <SettingsSheet title="Theme" onClose={onClose}>
      <div className="flex flex-col gap-2">
        {THEME_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            disabled={!opt.available}
            onClick={() => {
              if (!opt.available) return
              onSave(opt.id)
              onClose()
            }}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 font-body font-bold text-sm ${
              !opt.available
                ? 'bg-mist/60 text-inkSoft/50 border-transparent cursor-not-allowed'
                : theme === opt.id
                  ? 'bg-aqua-deep text-white border-aqua-deep'
                  : 'bg-mist text-inkSoft border-transparent'
            }`}
          >
            <span>{opt.label}</span>
            {!opt.available ? (
              <span className="text-[10px] font-bold uppercase tracking-wide">Coming soon</span>
            ) : (
              theme === opt.id && <Check className="w-4 h-4" />
            )}
          </button>
        ))}
      </div>
    </SettingsSheet>
  )
}

// Amounts are stored/edited in ounces regardless of the currently selected
// unit — only the numbers shown to the person switch with it.
function PresetsSheet({ presets, units, onSave, onClose }) {
  const [values, setValues] = useState(presets)
  const short = unitShort(units)
  const minOz = 4
  const maxOz = 64

  const updateAt = (index, nextOz) => {
    setValues((vals) => vals.map((v, i) => (i === index ? nextOz : v)))
  }

  return (
    <SettingsSheet title="Quick-add presets" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {values.map((oz, i) => (
          <div key={i} className="bg-mist rounded-2xl px-4 py-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-body font-bold text-xs uppercase tracking-wide text-inkSoft/70">
                Button {i + 1}
              </span>
              <span className="font-body font-black text-aqua-deep text-lg">
                {ozToUnit(oz, units)} {short}
              </span>
            </div>
            <input
              type="range"
              min={minOz}
              max={maxOz}
              step={2}
              value={oz}
              onChange={(e) => updateAt(i, Number(e.target.value))}
              aria-label={`Quick-add preset ${i + 1}`}
              className="w-full accent-aqua-deep"
            />
          </div>
        ))}
      </div>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          onSave(values)
          onClose()
        }}
        className="w-full mt-5 bg-aqua-deep text-white font-body font-bold py-3 rounded-full"
      >
        Save
      </motion.button>
    </SettingsSheet>
  )
}

// Lets the person turn individual "other drinks" off (so they drop out of
// the swipe menu) and set a custom tap amount for each one that's still on.
function DrinksSheet({ drinkTypes, drinkSettings, units, onSave, onClose }) {
  const [settings, setSettings] = useState(drinkSettings)
  const short = unitShort(units)
  const minOz = 2
  const maxOz = 32

  const toggle = (id) => {
    setSettings((s) => ({ ...s, [id]: { ...s[id], enabled: !s[id]?.enabled } }))
  }
  const setStep = (id, nextOz) => {
    setSettings((s) => ({ ...s, [id]: { ...s[id], step: nextOz } }))
  }

  return (
    <SettingsSheet title="Other drinks" onClose={onClose}>
      <div className="flex flex-col gap-3">
        {drinkTypes.map((drink) => {
          const Icon = drink.icon
          const entry = settings[drink.id] || { enabled: true, step: 8 }
          return (
            <div key={drink.id} className="bg-mist rounded-2xl px-4 py-3.5">
              <button onClick={() => toggle(drink.id)} className="w-full flex items-center gap-3">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white"
                  style={{ backgroundColor: drink.color }}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span className="flex-1 text-left font-body font-bold text-sm text-ink">{drink.label}</span>
                <span
                  className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${
                    entry.enabled ? 'bg-aqua-deep' : 'bg-ink/15'
                  }`}
                >
                  <motion.span
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
                    animate={{ left: entry.enabled ? 22 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  />
                </span>
              </button>

              <AnimatePresence>
                {entry.enabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center justify-between mt-3 mb-1">
                      <span className="font-body text-[11px] font-bold uppercase tracking-wide text-inkSoft/70">
                        Adds per tap
                      </span>
                      <span className="font-body font-black text-aqua-deep text-sm">
                        {ozToUnit(entry.step, units)} {short}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={minOz}
                      max={maxOz}
                      step={1}
                      value={entry.step}
                      onChange={(e) => setStep(drink.id, Number(e.target.value))}
                      aria-label={`${drink.label} amount per tap`}
                      className="w-full accent-aqua-deep"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          onSave(settings)
          onClose()
        }}
        className="w-full mt-5 bg-aqua-deep text-white font-body font-bold py-3 rounded-full"
      >
        Save
      </motion.button>
    </SettingsSheet>
  )
}

/* --------------------------------- Account --------------------------------- */

// goal/units/presets/drinkSettings all live in App and are handed down here
// as props, with matching onChange callbacks — so any change made in this
// screen is reflected everywhere else in the app immediately, and survives
// a reload the same way the rest of the app's settings do.
export default function Account({
  user,
  goal = 64,
  onGoalChange,
  units = 'oz',
  onUnitsChange,
  presets = [8, 16, 24],
  onPresetsChange,
  drinkTypes = [],
  drinkSettings = {},
  onDrinkSettingsChange,
  onClose,
  onSignOut,
}) {
  const [openSheet, setOpenSheet] = useState(null) // null | 'goal' | 'reminders' | 'units' | 'presets' | 'drinks' | 'theme'
  const [reminders, setReminders] = useState(loadReminders)
  const [theme, setTheme] = useState(loadTheme)
  const [confirmingSignOut, setConfirmingSignOut] = useState(false)

  const saveReminders = (next) => {
    setReminders(next)
    try {
      localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // storage unavailable — setting still applies for this session
    }
  }

  const saveTheme = (next) => {
    setTheme(next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
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
      localStorage.removeItem(THEME_STORAGE_KEY)
      localStorage.removeItem(UNITS_STORAGE_KEY)
      localStorage.removeItem(PRESETS_STORAGE_KEY)
      localStorage.removeItem(DRINK_SETTINGS_STORAGE_KEY)
      localStorage.removeItem(DRINK_HISTORY_STORAGE_KEY)
    } catch {
      // storage unavailable — still hand off to the parent to reset state
    }
    if (onSignOut) {
      onSignOut()
    } else {
      window.location.reload()
    }
  }

  const name = getUserName(user)
  const initial = name?.trim()?.[0]?.toUpperCase() || 'A'
  const activeDrinkCount = drinkTypes.filter((d) => drinkSettings[d.id]?.enabled !== false).length

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
        className="flex-1 flex flex-col overflow-y-auto px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch] [overscroll-behavior:contain]"
      >
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-hand text-4xl text-ink">Your account</h1>
          <motion.button
            whileTap={{ scale: 0.85, rotate: -90 }}
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white shadow-card flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-ink" />
          </motion.button>
        </div>

        <div className="bg-gradient-to-br from-aqua to-aqua-deep rounded-3xl p-6 shadow-soft mb-6 text-white">
          <div className="w-16 h-16 rounded-full bg-white/25 flex items-center justify-center font-hand text-3xl mb-3">
            {initial}
          </div>
          <p className="font-hand text-3xl">{name || 'Friend'}</p>
          <p className="font-body text-sm text-white/80">{user?.email || 'you@example.com'}</p>
        </div>

        <Section title="Preferences">
          <SettingsRow
            icon={Target}
            label="Daily goal"
            value={formatAmount(goal, units)}
            onClick={() => setOpenSheet('goal')}
          />
          <SettingsRow
            icon={Bell}
            label="Reminders"
            value={
              reminders.enabled ? `Every ${reminders.intervalHours} hr${reminders.intervalHours > 1 ? 's' : ''}` : 'Off'
            }
            onClick={() => setOpenSheet('reminders')}
          />
          <SettingsRow
            icon={Ruler}
            label="Units"
            value={UNIT_DEFS[units]?.label || 'Ounces (oz)'}
            onClick={() => setOpenSheet('units')}
          />
          <SettingsRow
            icon={Sliders}
            label="Quick-add presets"
            value={presets.map((oz) => `${ozToUnit(oz, units)}${unitShort(units)}`).join(' · ')}
            onClick={() => setOpenSheet('presets')}
          />
          <SettingsRow
            icon={GlassWater}
            label="Other drinks"
            value={drinkTypes.length ? `${activeDrinkCount} of ${drinkTypes.length} shown` : 'None'}
            onClick={() => setOpenSheet('drinks')}
          />
        </Section>

        <Section title="Appearance">
          <SettingsRow
            icon={Palette}
            label="Theme"
            value={THEME_OPTIONS.find((t) => t.id === theme)?.label || 'Light'}
            onClick={() => setOpenSheet('theme')}
          />
        </Section>

        <Section title="More">
          {QUICK_LINKS.map((link) => (
            <LinkRow key={link.key} icon={link.icon} label={link.label} url={link.url} />
          ))}
        </Section>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleSignOut}
          onBlur={() => setConfirmingSignOut(false)}
          className={`w-full mt-2 flex items-center justify-center gap-2 font-body font-bold py-3.5 rounded-full transition-colors ${
            confirmingSignOut ? 'bg-coral text-white' : 'text-coral-deep'
          }`}
        >
          <LogOut className="w-4 h-4" />
          {confirmingSignOut ? 'Tap again to sign out' : 'Sign out'}
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {openSheet === 'goal' && (
          <GoalSheet
            key="goal"
            goal={goal}
            units={units}
            onSave={(next) => onGoalChange?.(next)}
            onClose={() => setOpenSheet(null)}
          />
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
          <UnitsSheet
            key="units"
            units={units}
            onSave={(next) => onUnitsChange?.(next)}
            onClose={() => setOpenSheet(null)}
          />
        )}
        {openSheet === 'presets' && (
          <PresetsSheet
            key="presets"
            presets={presets}
            units={units}
            onSave={(next) => onPresetsChange?.(next)}
            onClose={() => setOpenSheet(null)}
          />
        )}
        {openSheet === 'drinks' && (
          <DrinksSheet
            key="drinks"
            drinkTypes={drinkTypes}
            drinkSettings={drinkSettings}
            units={units}
            onSave={(next) => onDrinkSettingsChange?.(next)}
            onClose={() => setOpenSheet(null)}
          />
        )}
        {openSheet === 'theme' && (
          <ThemeSheet key="theme" theme={theme} onSave={saveTheme} onClose={() => setOpenSheet(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
