// ---------------------------------------------------------------------------
// day-colors – Color utilities for visually distinguishing trip days.
//
// Each day in the itinerary gets a unique color drawn from a curated palette.
// Helpers are provided for contrast-safe text, lightened backgrounds, and
// CSS custom property generation.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// DAY_COLORS
// ---------------------------------------------------------------------------

/**
 * A predefined set of 10 distinctive, accessible colors for day theming.
 * Colors are chosen to be visually distinguishable from each other and to
 * meet WCAG contrast guidelines when paired with white text.
 */
export const DAY_COLORS: string[] = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // emerald
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#6366F1', // indigo
  '#14B8A6', // teal
];

// ---------------------------------------------------------------------------
// getDayColor
// ---------------------------------------------------------------------------

/**
 * Get a color for a day index, cycling through `DAY_COLORS` when the index
 * exceeds the palette size.
 *
 * @param index Zero-based day index.
 * @returns     Hex color string.
 *
 * @example getDayColor(0)  // => "#3B82F6"
 * @example getDayColor(12) // => "#10B981" (wraps around)
 */
export function getDayColor(index: number): string {
  const safeIndex = ((index % DAY_COLORS.length) + DAY_COLORS.length) % DAY_COLORS.length;
  return DAY_COLORS[safeIndex];
}

// ---------------------------------------------------------------------------
// getContrastText
// ---------------------------------------------------------------------------

/**
 * Get a contrast-safe text color (black or white) for a given background hex
 * color, using the WCAG relative luminance formula.
 *
 * @param hexColor Background color as a hex string (e.g. "#3B82F6").
 * @returns        `"#000000"` or `"#FFFFFF"`.
 *
 * @example getContrastText("#3B82F6") // => "#FFFFFF"
 * @example getContrastText("#F59E0B") // => "#000000"
 */
export function getContrastText(hexColor: string): string {
  const { r, g, b } = hexToRgb(hexColor);

  // WCAG relative luminance.
  const luminance = relativeLuminance(r, g, b);

  // Use a threshold of 0.179 (standard WCAG recommendation for deciding
  // whether to use light or dark text).
  return luminance > 0.179 ? '#000000' : '#FFFFFF';
}

// ---------------------------------------------------------------------------
// lightenColor
// ---------------------------------------------------------------------------

/**
 * Lighten a hex color by blending it toward white by the given percentage.
 *
 * @param hex     Hex color string (e.g. "#3B82F6").
 * @param percent Amount to lighten, 0-100. 0 returns the original color,
 *                100 returns pure white.
 * @returns       Lightened hex color string.
 *
 * @example lightenColor("#3B82F6", 80) // a very light blue
 */
export function lightenColor(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = Math.max(0, Math.min(100, percent)) / 100;

  const newR = Math.round(r + (255 - r) * factor);
  const newG = Math.round(g + (255 - g) * factor);
  const newB = Math.round(b + (255 - b) * factor);

  return rgbToHex(newR, newG, newB);
}

// ---------------------------------------------------------------------------
// dayColorVars
// ---------------------------------------------------------------------------

/**
 * Create a CSS custom properties object for a day color theme.
 *
 * Returns an object suitable for passing to React's `style` prop. The
 * properties generated are:
 *
 * - `--day-color`       The base color.
 * - `--day-color-light` A lightened variant for backgrounds (80% lighter).
 * - `--day-color-text`  A contrast-safe text color for use on the base color.
 *
 * @param hex Base day color as a hex string.
 * @returns   Record of CSS custom property names to values.
 *
 * @example
 * <div style={dayColorVars("#3B82F6")}>
 *   <span style={{ color: 'var(--day-color-text)', background: 'var(--day-color)' }}>
 *     Day 1
 *   </span>
 * </div>
 */
export function dayColorVars(hex: string): Record<string, string> {
  return {
    '--day-color': hex,
    '--day-color-light': lightenColor(hex, 80),
    '--day-color-text': getContrastText(hex),
  };
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Parse a hex color string into its RGB components.
 *
 * Accepts 3-char shorthand (#ABC) and 6-char (#AABBCC), with or without
 * the leading `#`.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleaned = hex.replace(/^#/, '');

  // Expand shorthand (#ABC -> #AABBCC).
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split('')
      .map((c) => c + c)
      .join('');
  }

  const num = parseInt(cleaned, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Convert RGB components to a 6-char hex string with leading `#`.
 */
function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

/**
 * Calculate WCAG relative luminance from linear RGB values.
 * Input values are in [0, 255].
 */
function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const srgb = c / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
