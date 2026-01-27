/**
 * Example Brand Theme Template
 * 
 * Copy this file to create a new brand theme:
 * 1. Duplicate as [yourBrand]Theme.ts
 * 2. Replace the values with your extracted/designed branding
 * 3. The brand will be auto-discovered and registered!
 * 
 * For AI-powered extraction, see:
 * hive-mind/patterns/branding/BRANDING_EXTRACTION_PATTERNS.md
 * 
 * For a complete example with all options, see:
 * govukTheme.ts - demonstrates every branding capability
 */

export const exampleBranding = {
  // ============================================================================
  // Required: Basic Branding
  // ============================================================================
  
  // Metadata
  name: 'Example Brand',
  sourceUrl: 'https://example.com',
  extractedAt: '2026-01-27',
  
  // Core brand colors (all required)
  colors: {
    primary: '#11B67A',      // Main brand color (buttons, links, accents)
    accent: '#0BE248',       // Secondary highlights
    background: '#F1F1F1',   // Page background
    white: '#FFFFFF',        // Cards, content areas
    black: '#000000',        // Strong text, dark elements
    textPrimary: '#323233',  // Headings
    textBody: '#505050',     // Body text
    border: '#C9C9C9',       // Dividers, borders
    // Optional: additional semantic colors
    success: '#11B67A',      // Success messages, positive actions
    danger: '#D4351C',       // Errors, destructive actions
    warning: '#FFDD00',      // Warnings
    // You can add any custom colors here - they'll become CSS variables
  },
  
  // Optional: Dark mode color overrides
  // If not provided, defaults will be calculated
  colorsDark: {
    primary: '#11B67A',
    background: '#1D1E24',
    white: '#25262E',
    black: '#FFFFFF',
    textPrimary: '#FFFFFF',
    textBody: '#B4B7C1',
    border: '#404040',
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
    borderRadius: '12px',     // Global border radius for cards, buttons
    borderRadiusSmall: '6px', // Smaller elements
  },
  
  // Logo - use SVG data URL for best quality
  // Convert SVG to data URL: `data:image/svg+xml,${encodeURIComponent(svgString)}`
  logo: {
    svgDataUrl: '',  // Paste your encoded SVG here
    alt: 'Example Brand',
  },
  
  // Optional: dark variant of logo for light backgrounds
  logoDark: {
    svgDataUrl: '',
    alt: 'Example Brand',
  },
  
  // ============================================================================
  // Optional: Extended Branding - Tier 1 (Links & Focus)
  // ============================================================================
  
  // Link styling - customize how links appear
  links: {
    color: '#11B67A',                    // Link text color
    hoverColor: '#0A8A5C',               // Link hover color
    underlineThickness: '1px',           // Underline thickness
    underlineOffset: '.1em',             // Distance from text
    focus: {
      backgroundColor: 'transparent',    // Background on focus
      boxShadow: '0 0 0 3px #11B67A40',  // Focus ring shadow
      removeUnderline: false,            // Remove underline on focus?
    },
  },
  
  // Focus ring for accessibility (keyboard navigation)
  focusRing: {
    color: '#11B67A',        // Focus ring color
    width: '3px',            // Ring width
    offset: '2px',           // Offset from element
    boxShadow: '0 0 0 3px #11B67A40',
  },
  
  // ============================================================================
  // Optional: Extended Branding - Tier 1 (Buttons)
  // ============================================================================
  
  buttons: {
    primary: {
      backgroundColor: '#11B67A',
      textColor: '#FFFFFF',
      borderRadius: '12px',              // Override global if needed
      boxShadow: 'none',                 // Button shadow
      border: 'none',
      padding: '12px 24px',
      fontWeight: '600',
      hover: {
        backgroundColor: '#0A8A5C',
      },
      focus: {
        boxShadow: '0 0 0 3px #11B67A40',
      },
    },
    secondary: {
      backgroundColor: '#F1F1F1',
      textColor: '#323233',
      borderRadius: '12px',
      border: '1px solid #C9C9C9',
      hover: {
        backgroundColor: '#E5E5E5',
      },
    },
    // Optional: warning/destructive button style
    warning: {
      backgroundColor: '#D4351C',
      textColor: '#FFFFFF',
      borderRadius: '12px',
      hover: {
        backgroundColor: '#AA2A1A',
      },
    },
  },
  
  // ============================================================================
  // Optional: Extended Branding - Tier 3 (Layout)
  // ============================================================================
  
  layout: {
    maxWidth: '1200px',           // Maximum content width
    containerPadding: '0 20px',   // Side padding
    sectionSpacing: '40px',       // Spacing between sections
    headerHeight: '48px',         // Header height (default 48px, gov.uk uses 60px)
  },
  
  // ============================================================================
  // Optional: Extended Branding - Tier 2 (Custom CSS)
  // ============================================================================
  
  // Use sparingly! Prefer structured properties above.
  // This CSS is injected globally when the brand is active.
  // Useful for brand-specific component styles.
  customCss: `
    /* Example: Brand-specific card styling */
    .brand-card {
      border-left: 4px solid var(--brand-primary);
    }
    
    /* Example: Custom badge */
    .brand-badge {
      background-color: var(--brand-primary);
      color: var(--brand-white);
      padding: 4px 8px;
      border-radius: var(--brand-border-radius-small);
      font-size: 12px;
      font-weight: 600;
    }
  `,
}

/**
 * EUI Theme Modifications (optional)
 * 
 * Apply these overrides to EuiProvider for deeper EUI integration.
 * Note: Most styling is handled via CSS variables from the branding above.
 * This is for advanced EUI-specific customization.
 */
export const exampleEuiTheme = {
  colors: {
    LIGHT: {
      primary: exampleBranding.colors.primary,
      accent: exampleBranding.colors.accent,
      success: exampleBranding.colors.success,
      danger: exampleBranding.colors.danger,
    },
    DARK: {
      primary: exampleBranding.colors.primary,
      accent: exampleBranding.colors.accent,
      success: exampleBranding.colors.success,
      danger: exampleBranding.colors.danger,
    },
  },
}

