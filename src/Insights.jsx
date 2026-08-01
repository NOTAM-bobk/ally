import { motion } from 'framer-motion'
import { X, Flame, TrendingUp, Droplets } from 'lucide-react'

// Dummy week data — swap for real history whenever you're ready.
const WEEK = [
  { day: 'M', pct: 0.9 },
  { day: 'T', pct: 1.0 },
  { day: 'W', pct: 0.6 },
  { day: 'T', pct: 0.75 },
  { day: 'F', pct: 1.0 },
  { day: 'S', pct: 0.4 },
  { day: 'S', pct: 0.55 },
]

const STATS = [
  { icon: Flame, label: 'Current streak', value: '5 days' },
  { icon: Droplets, label: 'Avg. daily intake', value: '58 oz' },
  { icon: TrendingUp, label: 'Best day', value: '82 oz' },
]

// Placeholder screen — swap the content below with real analytics whenever you're ready.
export default function Insights({ onClose }) {
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
        className="flex-1 flex flex-col overflow-y-auto px-6 pt-8 pb-10"
      >
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-hand text-4xl text-ink">Your insights</h1>
          <motion.button
            whileTap={{ scale: 0.85, rotate: 90 }}
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white shadow-card flex items-center justify-center"
          >
            <X className="w-5 h-5 text-ink" />
          </motion.button>
        </div>

        <div className="bg-white rounded-3xl shadow-card p-5 mb-6">
          <p className="font-body text-xs font-bold uppercase tracking-wider text-inkSoft/70 mb-4">
            This week
          </p>
          <div className="flex items-end justify-between gap-2 h-32">
            {WEEK.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full h-full flex items-end rounded-full bg-mist overflow-hidden">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${d.pct * 100}%` }}
                    transition={{ delay: i * 0.06, type: 'spring', stiffness: 120, damping: 16 }}
                    className={`w-full rounded-full bg-gradient-to-t from-aqua-deep to-aqua ${
                      d.pct >= 1 ? 'from-coral-deep to-coral' : ''
                    }`}
                  />
                </div>
                <span className="font-body text-xs font-bold text-inkSoft">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {STATS.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="bg-white rounded-2xl shadow-card px-4 py-3.5 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-mist flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-coral-deep" />
              </div>
              <div className="flex-1">
                <p className="font-body text-xs text-inkSoft">{label}</p>
                <p className="font-hand text-2xl text-ink leading-none mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-sunshine/20 border-2 border-dashed border-sunshine rounded-2xl px-4 py-3">
          <p className="font-body text-xs text-inkSoft leading-relaxed">
            This is a styled placeholder with dummy data — wire up real history in{' '}
            <span className="font-bold">src/Insights.jsx</span>.
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
