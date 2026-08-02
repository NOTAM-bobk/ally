// Shared unit definitions/conversions. Everything in the app is stored
// internally in ounces (oz) — this module is the ONLY place that knows how
// to convert oz to/from whatever the person picked to look at, so App and
// Account always agree on what a number means.

export const OZ_TO_ML = 29.5735

export const UNIT_DEFS = {
  oz: {
    id: 'oz',
    label: 'Ounces (oz)',
    short: 'oz',
    fromOz: (oz) => oz,
    toOz: (v) => v,
    decimals: 0,
    sliderStep: 1,
  },
  ml: {
    id: 'ml',
    label: 'Milliliters (mL)',
    short: 'mL',
    fromOz: (oz) => oz * OZ_TO_ML,
    toOz: (v) => v / OZ_TO_ML,
    decimals: 0,
    sliderStep: 25,
  },
  l: {
    id: 'l',
    label: 'Liters (L)',
    short: 'L',
    fromOz: (oz) => (oz * OZ_TO_ML) / 1000,
    toOz: (v) => (v * 1000) / OZ_TO_ML,
    decimals: 2,
    sliderStep: 0.05,
  },
  cup: {
    id: 'cup',
    label: 'Cups',
    short: 'cup',
    fromOz: (oz) => oz / 8,
    toOz: (v) => v * 8,
    decimals: 2,
    sliderStep: 0.25,
  },
}

// Display order for the Units picker.
export const UNIT_ORDER = ['oz', 'ml', 'l', 'cup']

export function isValidUnit(id) {
  return Object.prototype.hasOwnProperty.call(UNIT_DEFS, id)
}

// Round a converted value to a sensible number of decimals for its unit.
function roundForUnit(value, def) {
  if (def.decimals === 0) return Math.round(value)
  const factor = 10 ** def.decimals
  return Math.round(value * factor) / factor
}

// oz -> number in the target unit, rounded for display/editing.
export function ozToUnit(oz, unitId) {
  const def = UNIT_DEFS[unitId] || UNIT_DEFS.oz
  return roundForUnit(def.fromOz(oz), def)
}

// number in the target unit -> oz (unrounded, since this feeds storage).
export function unitToOz(value, unitId) {
  const def = UNIT_DEFS[unitId] || UNIT_DEFS.oz
  return def.toOz(value)
}

// oz -> "123 mL" style label, ready to render.
export function formatAmount(oz, unitId) {
  const def = UNIT_DEFS[unitId] || UNIT_DEFS.oz
  return `${roundForUnit(def.fromOz(oz), def)} ${def.short}`
}

export function unitShort(unitId) {
  return (UNIT_DEFS[unitId] || UNIT_DEFS.oz).short
}
