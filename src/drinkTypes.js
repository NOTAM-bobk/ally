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
import {
  Coffee,
  Leaf,
  CupSoda,
  Milk,
  Wine,
  Beer,
  Martini,
  GlassWater,
  Zap,
  Blend,
  Sparkles,
  Palmtree,
  IceCreamCone,
  Citrus,
  Rocket,
  Flame,
  Activity,
  Droplet,
  Dumbbell,
  IceCream,
  Sprout,
  Snowflake,
  Waves,
  Beaker,
  PartyPopper,
  Candy,
} from 'lucide-react'
export const DRINK_TYPES = [
  { id: 'coffee', label: 'Coffee', icon: Coffee, color: '#6F4E37' },
  { id: 'tea', label: 'Tea', icon: Leaf, color: '#C17817' },
  { id: 'juice', label: 'Juice', icon: CupSoda, color: '#FF8C42' },
  { id: 'milk', label: 'Milk', icon: Milk, color: '#EADFC8' },
  { id: 'wine', label: 'Wine', icon: Wine, color: '#7B2D42' },
  { id: 'beer', label: 'Beer', icon: Beer, color: '#F2A93B' },
  { id: 'cocktail', label: 'Cocktail', icon: Martini, color: '#C2185B' },
  { id: 'soda', label: 'Soda', icon: GlassWater, color: '#4FC3D9' },
  { id: 'energy_drink', label: 'Energy Drink', icon: Zap, color: '#2ECC71' },
  { id: 'smoothie', label: 'Smoothie', icon: Blend, color: '#FF6F91' },
  { id: 'kombucha', label: 'Kombucha', icon: Sparkles, color: '#8E7CC3' },
  { id: 'coconut_water', label: 'Coconut Water', icon: Palmtree, color: '#2AA876' },
  { id: 'hot_chocolate', label: 'Hot Chocolate', icon: IceCreamCone, color: '#5C3A21' },
  { id: 'lemonade', label: 'Lemonade', icon: Citrus, color: '#F4D35E' },
  { id: 'red_bull', label: 'Red Bull', icon: Rocket, color: '#00285E' },
  { id: 'monster', label: 'Monster', icon: Flame, color: '#00A651' },
  { id: 'gatorade', label: 'Gatorade', icon: Activity, color: '#0057B8' },
  { id: 'liquid_iv', label: 'Liquid IV', icon: Droplet, color: '#FFB400' },
  { id: 'protein_shake', label: 'Protein Shake', icon: Dumbbell, color: '#C68642' },
  { id: 'milkshake', label: 'Milkshake', icon: IceCream, color: '#F8C8DC' },
  { id: 'matcha', label: 'Matcha', icon: Sprout, color: '#7CB342' },
  { id: 'iced_coffee', label: 'Iced Coffee', icon: Snowflake, color: '#6B4423' },
  { id: 'sparkling_water', label: 'Sparkling Water', icon: Waves, color: '#A0D8EF' },
  { id: 'root_beer', label: 'Root Beer', icon: Beaker, color: '#2B1B17' },
  { id: 'champagne', label: 'Champagne', icon: PartyPopper, color: '#F0C987' },
  { id: 'chocolate_milk', label: 'Chocolate Milk', icon: Candy, color: '#7A4B2A' },
]
// Quick lookup from a stored hex color back to its drink type — used when a
// cup marker or history entry only carries a color and needs to resolve
// back to the drink that produced it.
export const DRINK_BY_COLOR = Object.fromEntries(DRINK_TYPES.map((d) => [d.color, d]))
