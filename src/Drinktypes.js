// All non-water drink types the app knows about — this is the one place to
// add, remove, rename, recolor, or re-icon a drink. Every screen reads from
// this list automatically: the cup's tint and pour markers, the "Other
// drinks" swipe-up menu, Account's per-drink enable/step settings, and
// Insights' pie chart + calendar breakdown. Add an entry here and it shows
// up everywhere else with no other code changes needed.
//
// Fields:
//   id     — stable internal key (lowercase, no spaces, e.g. 'coffee').
//            Used as the localStorage bucket name for history and settings,
//            so avoid renaming an id once it's shipped (you'd lose that
//            drink's saved history) — change `label` instead if you just
//            want the display name to be different.
//   label  — the name shown throughout the app (chip, Account, Insights).
//   icon   — a lucide-react icon component shown on the drink's chip and
//            its marker in the cup. Browse icons at https://lucide.dev/icons
//            and import the one you want at the top of this file.
//   color  — hex color used everywhere this drink appears: its icon bubble,
//            its pour line/marker in the cup, the cup's tint while it's the
//            most recent thing logged, and its slice of the Insights pie
//            chart. Pick something that reads clearly at a small size.
//
// To add a new drink:
//   1. Import its icon at the top, e.g. `import { Wine } from 'lucide-react'`
//   2. Add a line below, e.g. `{ id: 'wine', label: 'Wine', icon: Wine, color: '#7B2D42' },`
// That's it — it'll auto-populate on next load in the swipe menu, Account,
// and Insights.

import { Coffee, Leaf, CupSoda, Milk } from 'lucide-react'

export const DRINK_TYPES = [
  { id: 'coffee', label: 'Coffee', icon: Coffee, color: '#6F4E37' },
  { id: 'tea', label: 'Tea', icon: Leaf, color: '#C17817' },
  { id: 'juice', label: 'Juice', icon: CupSoda, color: '#FF8C42' },
  { id: 'milk', label: 'Milk', icon: Milk, color: '#EADFC8' },
  // { id: 'wine', label: 'Wine', icon: Wine, color: '#7B2D42' },
]

// Quick lookup from a stored hex color back to its drink type — used when a
// cup marker or history entry only carries a color and needs to resolve
// back to the drink that produced it.
export const DRINK_BY_COLOR = Object.fromEntries(DRINK_TYPES.map((d) => [d.color, d]))
