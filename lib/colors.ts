/**
 * Momentum Color System
 *
 * This module provides a comprehensive color palette system for the entire app.
 * It ensures beautiful, accessible colors for Projects, People, Status, and Priority entities.
 */

// ============================================================================
// BASE PROJECT PALETTE (Beautiful & Accessible)
// ============================================================================

export const PROJECT_COLORS = {
  // Blues
  sky: { base: '#0EA5E9', name: 'Sky Blue' },
  ocean: { base: '#0284C7', name: 'Ocean Blue' },
  indigo: { base: '#6366F1', name: 'Indigo' },

  // Purples
  violet: { base: '#8B5CF6', name: 'Violet' },
  purple: { base: '#A855F7', name: 'Purple' },
  fuchsia: { base: '#D946EF', name: 'Fuchsia' },

  // Greens
  emerald: { base: '#10B981', name: 'Emerald' },
  teal: { base: '#14B8A6', name: 'Teal' },
  lime: { base: '#84CC16', name: 'Lime' },

  // Reds/Pinks
  rose: { base: '#F43F5E', name: 'Rose' },
  pink: { base: '#EC4899', name: 'Pink' },
  red: { base: '#EF4444', name: 'Red' },

  // Oranges/Yellows
  amber: { base: '#F59E0B', name: 'Amber' },
  orange: { base: '#F97316', name: 'Orange' },
  yellow: { base: '#EAB308', name: 'Yellow' },

  // Neutrals with color
  slate: { base: '#64748B', name: 'Slate' },
  stone: { base: '#78716C', name: 'Stone' },
} as const

export type ProjectColorKey = keyof typeof PROJECT_COLORS

// ============================================================================
// STATUS COLORS (Fixed Semantic Colors)
// ============================================================================

export const STATUS_COLORS = {
  'not-started': {
    base: '#9CA3AF', // Grey 400
    light: '#E5E7EB', // Grey 200
    foreground: '#FFFFFF',
    name: 'Not Started',
  },
  planning: {
    base: '#FBBF24', // Yellow 400
    light: '#FEF3C7', // Yellow 100
    foreground: '#000000',
    name: 'Planning',
  },
  'in-progress': {
    base: '#3B82F6', // Blue 500
    light: '#DBEAFE', // Blue 100
    foreground: '#FFFFFF',
    name: 'In Progress',
  },
  review: {
    base: '#8B5CF6', // Purple 500
    light: '#EDE9FE', // Purple 100
    foreground: '#FFFFFF',
    name: 'Review',
  },
  done: {
    base: '#10B981', // Green 500
    light: '#D1FAE5', // Green 100
    foreground: '#FFFFFF',
    name: 'Done',
  },
  blocked: {
    base: '#EF4444', // Red 500
    light: '#FEE2E2', // Red 100
    foreground: '#FFFFFF',
    name: 'Blocked',
  },
} as const

export type StatusKey = keyof typeof STATUS_COLORS

// ============================================================================
// PRIORITY COLORS (Fixed Semantic Colors)
// ============================================================================

export const PRIORITY_COLORS = {
  low: {
    base: '#64748B', // Slate 500
    light: '#F1F5F9', // Slate 100
    foreground: '#FFFFFF',
    name: 'Low',
  },
  medium: {
    base: '#F59E0B', // Amber 500
    light: '#FEF3C7', // Amber 100
    foreground: '#000000',
    name: 'Medium',
  },
  high: {
    base: '#F97316', // Orange 500
    light: '#FFEDD5', // Orange 100
    foreground: '#FFFFFF',
    name: 'High',
  },
  critical: {
    base: '#DC2626', // Red 600
    light: '#FEE2E2', // Red 100
    foreground: '#FFFFFF',
    name: 'Critical',
  },
} as const

export type PriorityKey = keyof typeof PRIORITY_COLORS

// ============================================================================
// COLOR GENERATION UTILITIES
// ============================================================================

/**
 * Generate a complete color palette from a base hex color
 * This creates light, muted, and foreground variants with proper contrast
 */
export interface ColorPalette {
  base: string
  light: string
  lighter: string
  muted: string
  dark: string
  foreground: string
}

/**
 * Simple hex to RGB converter
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

/**
 * RGB to hex converter
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => {
    const hex = Math.round(x).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

/**
 * Lighten a color by mixing with white
 */
function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex

  const r = Math.min(255, rgb.r + (255 - rgb.r) * amount)
  const g = Math.min(255, rgb.g + (255 - rgb.g) * amount)
  const b = Math.min(255, rgb.b + (255 - rgb.b) * amount)

  return rgbToHex(r, g, b)
}

/**
 * Darken a color by mixing with black
 */
function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex

  const r = Math.max(0, rgb.r * (1 - amount))
  const g = Math.max(0, rgb.g * (1 - amount))
  const b = Math.max(0, rgb.b * (1 - amount))

  return rgbToHex(r, g, b)
}

/**
 * Desaturate a color (move toward gray)
 */
function desaturate(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex

  // Calculate luminance
  const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b

  // Mix with gray
  const r = rgb.r + (luminance - rgb.r) * amount
  const g = rgb.g + (luminance - rgb.g) * amount
  const b = rgb.b + (luminance - rgb.b) * amount

  return rgbToHex(r, g, b)
}

/**
 * Calculate relative luminance for WCAG contrast
 */
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
    const v = val / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Calculate contrast ratio between two colors
 */
function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)

  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Get appropriate foreground color (black or white) for a background
 * Ensures WCAG AA compliance (4.5:1 contrast ratio)
 */
function getForegroundColor(backgroundHex: string): string {
  const whiteContrast = getContrastRatio(backgroundHex, '#FFFFFF')
  const blackContrast = getContrastRatio(backgroundHex, '#000000')

  // Prefer white if contrast is good enough, otherwise use black
  return whiteContrast >= 4.5 ? '#FFFFFF' : '#000000'
}

/**
 * Generate a complete palette from a base color
 */
export function generateColorPalette(baseColor: string): ColorPalette {
  return {
    base: baseColor,
    light: lighten(baseColor, 0.7), // 70% lighter for backgrounds
    lighter: lighten(baseColor, 0.9), // 90% lighter for subtle backgrounds
    muted: desaturate(baseColor, 0.5), // 50% desaturated for borders
    dark: darken(baseColor, 0.2), // 20% darker for hover states
    foreground: getForegroundColor(baseColor),
  }
}

/**
 * Get a project color palette by key
 */
export function getProjectColorPalette(colorKey: ProjectColorKey): ColorPalette {
  const color = PROJECT_COLORS[colorKey]
  return generateColorPalette(color.base)
}

/**
 * Get a random project color (for auto-assignment)
 */
export function getRandomProjectColor(): ProjectColorKey {
  const keys = Object.keys(PROJECT_COLORS) as ProjectColorKey[]
  return keys[Math.floor(Math.random() * keys.length)]
}

/**
 * Get all available project colors as options
 */
export function getProjectColorOptions(): Array<{ key: ProjectColorKey; name: string; hex: string }> {
  return Object.entries(PROJECT_COLORS).map(([key, value]) => ({
    key: key as ProjectColorKey,
    name: value.name,
    hex: value.base,
  }))
}

// ============================================================================
// CSS VARIABLE UTILITIES
// ============================================================================

/**
 * Apply a color palette to CSS variables on the document root
 */
export function applyColorPaletteToDOM(palette: ColorPalette, prefix: string = 'project'): void {
  const root = document.documentElement

  root.style.setProperty(`--${prefix}-color`, palette.base)
  root.style.setProperty(`--${prefix}-color-light`, palette.light)
  root.style.setProperty(`--${prefix}-color-lighter`, palette.lighter)
  root.style.setProperty(`--${prefix}-color-muted`, palette.muted)
  root.style.setProperty(`--${prefix}-color-dark`, palette.dark)
  root.style.setProperty(`--${prefix}-color-foreground`, palette.foreground)
}

/**
 * Remove color palette CSS variables from the document root
 */
export function removeColorPaletteFromDOM(prefix: string = 'project'): void {
  const root = document.documentElement

  root.style.removeProperty(`--${prefix}-color`)
  root.style.removeProperty(`--${prefix}-color-light`)
  root.style.removeProperty(`--${prefix}-color-lighter`)
  root.style.removeProperty(`--${prefix}-color-muted`)
  root.style.removeProperty(`--${prefix}-color-dark`)
  root.style.removeProperty(`--${prefix}-color-foreground`)
}

/**
 * Get CSS variable value
 */
export function getCSSVariable(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}
