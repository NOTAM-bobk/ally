import { useState, useCallback, useMemo, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart3, UserCircle2, Plus, Minus, PartyPopper } from 'lucide-react'
import Onboarding from './Onboarding.jsx'
import Account from './Account.jsx'
import Insights from './Insights.jsx'

const STEP = 8 // oz — amount the +/- buttons adjust by
const PRESETS = [8, 16, 24]

// Hand-drawn wobbly glass cup outline, used both as the visible stroke
// and as the clip path that the water fill is masked into.
const CUP_PATH =
  'M36 14 C34 10 166 10 164 14 L182 234 C183 244 172 252 160 252 L40 252 C28 252 17 244 18 234 Z'

function Droplet({ left, top, amount }) {
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
}

function WaterCup({ current, goal }) {
  const clipId = useId()
  const gradId = useId()
  const pct = Math.max(0, Math.min(1, current / goal))
  const fillHeight = 236 * pct // interior usable height of the cup path
  const fillY = 252 - fillHeight
  const goalReached = current >= goal

  return (
    <div className="relative w-56 h-64 mx-auto select-none">
      {goalReached && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute -top-3 left-1/2 -translate-x-1/2 bg-coral text-white font-hand text-lg px-4 py-1 rounded-full shadow-soft flex items-center gap-1.5 z-10 whitespace-nowrap"
        >
          <PartyPopper className="w-4 h-4" /> Goal reached!
        </motion.div>
      )}

      <svg viewBox="0 0 200 264" className="w-full h-full drop-shadow-[0_10px_20px_rgba(28,114,147,0.18)]">
        <defs>
          <clipPath id={clipId}>
            <path d={CUP_PATH} />
          </clipPath>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8FE3EE" />
            <stop offset="100%" stopColor="#1C7293" />
          </linearGradient>
        </defs>

        {/* glass base tint */}
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
          {/* shimmering wave crest riding on top of the water */}
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

          {/* soft glass shine */}
          <ellipse cx="55" cy="60" rx="10" ry="70" fill="#FFFFFF" opacity="0.18" />
        </g>

        {/* hand-drawn outline on top */}
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
}

function PresetButton({ amount, onTap }) {
  return (
    <motion.button
      onClick={() => onTap(amount)}
      whileTap={{ scale: 0.9, rotate: -2 }}
      whileHover={{ scale: 1.04 }}
      transition={{ type: 'spring', stiffness: 400, damping: 14 }}
      className="flex-1 bg-white rounded-full py-3.5 shadow-card border-2 border-transparent active:border-aqua flex flex-col items-center justify-center"
    >
      <span className="font-hand text-2xl text-ink leading-none">+{amount}</span>
      <span className="font-body text-[10px] font-bold text-inkSoft uppercase tracking-wide mt-0.5">
        oz
      </span>
    </motion.button>
  )
}

function IconTopButton({ icon: Icon, label, onClick, align }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      className={`flex items-center gap-2 bg-white/80 backdrop-blur px-3.5 py-2 rounded-full shadow-card ${
        align === 'right' ? 'flex-row-reverse' : ''
      }`}
    >
      <Icon className="w-4.5 h-4.5 text-aqua-deep" />
      <span className="font-body text-xs font-bold text-ink hidden xs:inline">{label}</span>
    </motion.button>
  )
}

export default function App() {
  const [stage, setStage] = useState('onboarding') // 'onboarding' | 'dashboard'
  const [user, setUser] = useState(null)
  const [overlay, setOverlay] = useState(null) // null | 'insights' | 'account'

  const [goal] = useState(64)
  const [current, setCurrent] = useState(0)
  const [toasts, setToasts] = useState([])

  const spawnToast = useCallback((amount) => {
    const id = Math.random().toString(36).slice(2)
    const left = 40 + Math.random() * 20 // keep it near center
    setToasts((t) => [...t, { id, amount, left }])
    setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id))
    }, 1100)
  }, [])

  const addWater = useCallback(
    (amount) => {
      setCurrent((c) => Math.max(0, Math.min(goal * 1.4, c + amount)))
      if (amount > 0) spawnToast(amount)
    },
    [goal, spawnToast]
  )

  const percentLabel = useMemo(() => Math.round((current / goal) * 100), [current, goal])

  if (stage === 'onboarding') {
    return (
      <Onboarding
        onComplete={(userData) => {
          setUser(userData)
          setStage('dashboard')
        }}
      />
    )
  }

  return (
    <div className="min-h-full w-full bg-mist flex flex-col relative overflow-hidden">
      {/* ambient background blobs */}
      <div className="absolute -top-24 -left-16 w-64 h-64 rounded-full bg-aqua-light/25 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-28 -right-16 w-72 h-72 rounded-full bg-coral-light/20 blur-3xl pointer-events-none" />

      {/* top bar */}
      <div className="flex items-center justify-between px-5 pt-6 relative z-10">
        <IconTopButton icon={BarChart3} label="Insights" onClick={() => setOverlay('insights')} />
        <IconTopButton
          icon={UserCircle2}
          label="Account"
          align="right"
          onClick={() => setOverlay('account')}
        />
      </div>

      {/* greeting */}
      <div className="text-center mt-4 px-6 relative z-10">
        <h1 className="font-hand text-3xl text-ink">
          Hey {user?.name || 'friend'}, let's hydrate!
        </h1>
        <p className="font-body text-inkSoft text-sm mt-1">
          {current >= goal
            ? "You've crushed today's goal 🎉"
            : `${Math.max(goal - current, 0)} oz to go — you've got this.`}
        </p>
      </div>

      {/* cup stage */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6">
        <div className="relative">
          <WaterCup current={current} goal={goal} />

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

        {/* +/- controls */}
        <div className="flex items-center gap-6 mt-6">
          <motion.button
            onClick={() => addWater(-STEP)}
            whileTap={{ scale: 0.85 }}
            className="w-14 h-14 rounded-full bg-white shadow-card flex items-center justify-center active:bg-mistDeep"
          >
            <Minus className="w-6 h-6 text-ink" strokeWidth={3} />
          </motion.button>

          <div className="font-body text-xs font-bold text-inkSoft w-16 text-center">
            {STEP} oz step
          </div>

          <motion.button
            onClick={() => addWater(STEP)}
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
            <PresetButton key={amount} amount={amount} onTap={addWater} />
          ))}
        </div>
      </div>

      {/* overlays */}
      <AnimatePresence>
        {overlay === 'insights' && <Insights key="insights" onClose={() => setOverlay(null)} />}
        {overlay === 'account' && (
          <Account key="account" user={user} onClose={() => setOverlay(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
