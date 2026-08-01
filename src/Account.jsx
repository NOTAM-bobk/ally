import { motion } from 'framer-motion'
import { X, User, Bell, Target, LogOut, ChevronRight } from 'lucide-react'

const ROWS = [
  { icon: Target, label: 'Daily goal', value: '64 oz' },
  { icon: Bell, label: 'Reminders', value: 'Every 2 hrs' },
  { icon: User, label: 'Units', value: 'Ounces (oz)' },
]

// Placeholder screen — swap the content below with real settings whenever you're ready.
export default function Account({ user, onClose }) {
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
          {ROWS.map(({ icon: Icon, label, value }) => (
            <button
              key={label}
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

        <div className="bg-sunshine/20 border-2 border-dashed border-sunshine rounded-2xl px-4 py-3 mb-6">
          <p className="font-body text-xs text-inkSoft leading-relaxed">
            This is a styled placeholder — hook these rows up to real settings, edit{' '}
            <span className="font-bold">src/Account.jsx</span>.
          </p>
        </div>

        <div className="flex-1" />

        <motion.button
          whileTap={{ scale: 0.96 }}
          className="w-full flex items-center justify-center gap-2 text-coral-deep font-body font-bold py-3.5"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
