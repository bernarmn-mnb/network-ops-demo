/**
 * Example Brand Theme Template
 * 
 * Copy this file to create a new brand theme:
 * 1. Duplicate as [yourBrand]Theme.ts
 * 2. Replace the values with your extracted/designed branding
 * 3. Import and register in index.ts
 * 
 * For AI-powered extraction, see:
 * hive-mind/patterns/branding/BRANDING_EXTRACTION_PATTERNS.md
 */

export const exampleBranding = {
  // Core brand colors
  colors: {
    primary: '#11B67A',      // Main brand color (header, buttons)
    accent: '#0BE248',       // Secondary highlights
    darkGreen: '#006A4D',    // Optional: additional brand color
    background: '#F1F1F1',   // Page background
    white: '#FFFFFF',        // Cards, content areas
    black: '#000000',        // Strong text, dark elements
    textPrimary: '#323233',  // Headings
    textBody: '#505050',     // Body text
    border: '#C9C9C9',       // Dividers, borders
  },
  
  // Typography
  fonts: {
    heading: '"Your Brand Font", sans-serif',
    body: '"Your Body Font", sans-serif',
    // System fallback for when custom fonts aren't loaded
    fallback: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  
  // Spacing
  spacing: {
    borderRadius: '12px',
    borderRadiusSmall: '6px',
  },
  
  // Logo - use SVG data URL for best quality
  // Convert SVG to data URL: `data:image/svg+xml,${encodeURIComponent(svgString)}`
  logo: {
    svgDataUrl: '',  // Paste your encoded SVG here
    alt: 'Example Brand',
  },
  
  // Optional: dark variant for light backgrounds
  logoDark: {
    svgDataUrl: '',
    alt: 'Example Brand',
  },
}

/**
 * EUI Theme Modifications (optional)
 * 
 * Apply these overrides to EuiProvider for brand consistency
 */
export const exampleEuiTheme = {
  colors: {
    LIGHT: {
      primary: exampleBranding.colors.primary,
      accent: exampleBranding.colors.accent,
      success: exampleBranding.colors.primary,
    },
    DARK: {
      primary: exampleBranding.colors.accent,
      accent: exampleBranding.colors.primary,
      success: exampleBranding.colors.accent,
    },
  },
}

