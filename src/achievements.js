// All Insights achievements — the trophies/badges the person can earn for
// hydration habits. This is the one place to add, remove, or tweak one:
// give it an id/label/description/icon/color and a `check(stats)` function
// that returns true once it's earned. Insights.jsx evaluates every entry
// here automatically against real data — nothing else needs to change to
// add a new badge.
//
// Fields:
//   id          — stable key (lowercase, no spaces). Used to remember which
//                 badges have already been shown as "new" — avoid renaming
//                 an id once it's shipped, or it'll pop the celebration
//                 popup again for people who'd already earned it.
//   label       — badge name, shown under its icon and in the popup card.
//   description — one short sentence, shown in the popup card.
//   icon        — a lucide-react icon component. Browse icons at
//                 https://lucide.dev/icons and import the one you want above.
//   color       — hex color for the badge's icon circle once earned.
//   check(stats)— returns true/false. `stats` (computed in Insights.jsx from
//                 real history) has:
//                   streak          — current consecutive-day streak
//                   longestStreak   — longest streak ever
//                   daysTracked     — distinct days with anything logged
//                   goalMetDays     — tracked days where goal was hit
//                   totalAllTime    — total oz ever logged
//                   mostDayAmount   — highest single-day oz total
//                   drinkTypesTried — distinct drink buckets ever logged
//                                     (water counts as one)
//
// To add a badge: import an icon at the top, then add a line below, e.g.
//   { id: 'early-bird', label: 'Early Bird', description: 'Log a drink before 8am',
//     icon: Sunrise, color: '#E8A33D', check: (s) => s.loggedBeforeEightAm },
// (Add any new stat your check needs to the `stats` object built in
// Insights.jsx first.)

import { Droplets, Flame, Trophy, Target, Star, Gem, Rocket, Award } from 'lucide-react'

export const ACHIEVEMENTS = [
  {
    id: 'first-sip',
    label: 'First Sip',
    description: 'Log your very first drink.',
    icon: Droplets,
    color: '#1C93D1',
    check: (s) => s.daysTracked >= 1,
  },
  {
    id: 'three-day-streak',
    label: 'Getting Started',
    description: 'Hit a 3-day streak.',
    icon: Flame,
    color: '#FF8C42',
    check: (s) => s.longestStreak >= 3,
  },
  {
    id: 'week-streak',
    label: 'Week Warrior',
    description: 'Hit a 7-day streak.',
    icon: Flame,
    color: '#E8895F',
    check: (s) => s.longestStreak >= 7,
  },
  {
    id: 'month-streak',
    label: 'Habit Formed',
    description: 'Hit a 30-day streak.',
    icon: Trophy,
    color: '#C17817',
    check: (s) => s.longestStreak >= 30,
  },
  {
    id: 'goal-getter',
    label: 'Goal Getter',
    description: 'Hit your daily goal 10 times.',
    icon: Target,
    color: '#5E8C61',
    check: (s) => s.goalMetDays >= 10,
  },
  {
    id: 'century-club',
    label: 'Century Club',
    description: 'Track 100 days total.',
    icon: Star,
    color: '#B77BA3',
    check: (s) => s.daysTracked >= 100,
  },
  {
    id: 'variety-pack',
    label: 'Variety Pack',
    description: 'Log 3 different drink types.',
    icon: Gem,
    color: '#4F9A94',
    check: (s) => s.drinkTypesTried >= 3,
  },
  {
    id: 'overachiever',
    label: 'Overachiever',
    description: 'Log 1,000 oz all-time.',
    icon: Rocket,
    color: '#D8686B',
    check: (s) => s.totalAllTime >= 1000,
  },
  {
    id: 'personal-best',
    label: 'Personal Best',
    description: 'Log 1.5x your goal in a single day.',
    icon: Award,
    color: '#1C93D1',
    check: (s) => s.goal > 0 && s.mostDayAmount >= s.goal * 1.5,
  },
]
